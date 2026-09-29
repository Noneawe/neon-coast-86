// Traffic AI. Vehicles come from a fixed pool, keep to lanes of their road
// (picking a branch at forks), hold a speed-dependent gap to anything ahead
// (other cars and the player), change lanes when blocked and the target lane
// is clear, and are never allowed to overlap. On linear routes cars are
// spawned out of sight ahead of the player and recycled behind.

import { CONFIG, SEGMENT_LENGTH } from '../config.js';
import { VEHICLE_TYPES } from '../data/vehicles.js';
import { VEHICLE_VARIANTS } from '../gfx/vehicle-sprites.js';
import { wrap } from '../engine/math.js';
import { sectionLength, findSegment, branchCenter } from './track.js';

/** A pooled traffic vehicle. x is absolute; laneX is relative to its road. */
export class Vehicle {
  constructor() {
    this.active = false;
    this.typeKey = '';
    this.type = null;
    this.variant = 0;
    this.z = 0;
    this.prevZ = 0;
    this.x = 0;
    this.prevX = 0;
    this.targetX = 0;
    this.laneX = 0;
    this.targetLaneX = 0;
    this.side = 0;       // fork branch: -1 left, +1 right, 0 main road
    this.speed = 0;
    this.cruise = 0;
    this.cooldown = 0;
    this.halfW = 0;
    this.halfLen = 0;
    this.segIndex = -1;
    this.ahead = 0;      // relative to the player: 1 ahead, -1 behind, 0 unknown (overtake counting)
  }

  /**
   * @param {string} typeKey key of VEHICLE_TYPES
   * @param {number} z
   * @param {number} laneX lane centre relative to the road
   * @param {number} variant colour variant index
   * @param {number} cruise cruising speed
   * @param {number} roadX road centre at z (normalized)
   * @param {number} side fork branch (-1, 0, +1)
   */
  spawn(typeKey, z, laneX, variant, cruise, roadX = 0, side = 0) {
    const t = VEHICLE_TYPES[typeKey];
    this.active = true;
    this.typeKey = typeKey;
    this.type = t;
    this.variant = variant;
    this.z = z;
    this.prevZ = z;
    this.laneX = laneX;
    this.targetLaneX = laneX;
    this.side = side;
    this.x = roadX + laneX;
    this.prevX = this.x;
    this.targetX = this.x;
    this.cruise = cruise;
    this.speed = cruise;
    this.cooldown = 0;
    this.halfW = t.worldWidth / (2 * CONFIG.road.roadWidth);
    this.halfLen = t.length / 2;
    this.segIndex = -1;
    this.ahead = 0;
  }
}

/**
 * Signed shortest distance from a to b along a looping track.
 * @param {number} d raw difference (b - a)
 * @param {number} length track length
 * @returns {number} in [-length/2, length/2)
 */
export function wrapDelta(d, length) {
  return wrap(d + length / 2, length) - length / 2;
}

/**
 * Lane centre in normalized x (relative to its road) for lane index 0..lanes-1.
 * @param {number} i
 * @returns {number}
 */
export function laneCenter(i) {
  const lanes = CONFIG.road.lanes;
  return -1 + (2 * i + 1) / lanes;
}

/** @returns {{vehicles:Vehicle[], obstacle:object, scratch:object, spawnZ:number}} */
export function createTraffic() {
  const vehicles = [];
  for (let i = 0; i < CONFIG.traffic.maxVehicles; i++) vehicles.push(new Vehicle());
  return {
    vehicles,
    // The player seen by the AI as one more obstacle (refreshed every step).
    obstacle: { active: true, z: 0, x: 0, targetX: 0, halfW: 0, halfLen: 0, speed: 0 },
    scratch: { gap: 0, speed: 0, other: null },
    spawnZ: 0,       // linear tracks: next spawn position
  };
}

function removeFromBucket(v, track) {
  if (v.segIndex < 0) return;
  const list = track.segments[v.segIndex].cars;
  const at = list.indexOf(v);
  if (at >= 0) {
    list[at] = list[list.length - 1];
    list.pop();
  }
  v.segIndex = -1;
}

function setBucket(v, track) {
  const idx = findSegment(track, v.z).index;
  if (idx === v.segIndex) return;
  removeFromBucket(v, track);
  track.segments[idx].cars.push(v);
  v.segIndex = idx;
}

function despawn(v, track) {
  removeFromBucket(v, track);
  v.active = false;
}

function laneClearForSpawn(traffic, z, x, len) {
  const gap = CONFIG.traffic.spawnMinGap;
  for (const o of traffic.vehicles) {
    if (!o.active || Math.abs(o.x - x) > 0.01) continue;
    if (Math.abs(wrapDelta(o.z - z, len)) < gap + o.halfLen) return false;
  }
  return true;
}

function freeVehicle(traffic) {
  const list = traffic.vehicles;
  for (let i = 0; i < list.length; i++) if (!list[i].active) return list[i];
  return null;
}

/**
 * Tries to place one car of the section's traffic at z. Returns true on success.
 * @param {object} traffic
 * @param {object} track
 * @param {{traffic?:{density:number, types:string[]}}} section
 * @param {number} z
 * @param {{next:()=>number, int:(a:number,b:number)=>number}} rng
 */
function spawnAt(traffic, track, section, z, rng) {
  const t = section.traffic;
  const v = freeVehicle(traffic);
  if (!v || !t || !t.types || t.types.length === 0) return false;
  const seg = findSegment(track, z);
  const side = seg.alt ? (rng.next() < 0.5 ? -1 : 1) : 0;
  const laneX = laneCenter(rng.int(0, CONFIG.road.lanes - 1));
  const roadX = branchCenter(track, z, side);
  if (!laneClearForSpawn(traffic, z, roadX + laneX, track.length)) return false;
  const typeKey = t.types[rng.int(0, t.types.length - 1)];
  const type = VEHICLE_TYPES[typeKey];
  v.spawn(typeKey, z, laneX, rng.int(0, VEHICLE_VARIANTS.length - 1),
    type.speedMin + rng.next() * (type.speedMax - type.speedMin), roadX, side);
  setBucket(v, track);
  return true;
}

/**
 * Deactivates all vehicles and spawns traffic along every section of the
 * track using its `traffic` {density, types}. Deterministic for a given rng state.
 * @param {object} traffic
 * @param {{segments:object[], length:number, sections:object[]}} track
 * @param {{next:()=>number, int:(a:number,b:number)=>number}} rng
 * @param {number} playerZ player start position (kept clear)
 * @param {number} [maxZ] spawn only up to this z (default: whole track)
 */
export function spawnTraffic(traffic, track, rng, playerZ, maxZ = Infinity) {
  const cfg = CONFIG.traffic;
  for (const seg of track.segments) seg.cars.length = 0;
  for (const v of traffic.vehicles) {
    v.active = false;
    v.segIndex = -1;
  }
  for (const info of track.sections) {
    const t = info.section.traffic;
    if (!t || !t.types || t.types.length === 0) continue;
    const len = sectionLength(info.section);
    const n = Math.round((t.density * len) / cfg.segmentsPerCar);
    for (let k = 0; k < n; k++) {
      const z = (info.start + ((k + 0.25 + rng.next() * 0.5) * len) / n) * SEGMENT_LENGTH;
      if (z > maxZ) break;
      if (Math.abs(wrapDelta(z - playerZ, track.length)) < cfg.spawnClearZone) continue;
      spawnAt(traffic, track, info.section, z, rng);
    }
  }
  traffic.spawnZ = Math.min(maxZ, track.length);
}

/** Section info whose segment range contains z (or null past the end). */
function sectionAt(track, z) {
  const i = Math.floor(z / SEGMENT_LENGTH);
  for (let s = track.sections.length - 1; s >= 0; s--) {
    const info = track.sections[s];
    if (i >= info.start) return i < info.start + info.len ? info : null;
  }
  return null;
}

/**
 * Linear tracks: spawns cars beyond the draw distance ahead of the player and
 * recycles cars left far behind or running off the end of the built track.
 * @param {object} traffic
 * @param {object} track
 * @param {{z:number}} player
 * @param {{next:()=>number, int:(a:number,b:number)=>number}} rng
 */
export function manageTraffic(traffic, track, player, rng) {
  const cfg = CONFIG.traffic;
  const behind = player.z - cfg.despawnBehind * SEGMENT_LENGTH;
  const end = track.length - cfg.endMargin * SEGMENT_LENGTH;
  const list = traffic.vehicles;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (v.active && (v.z < behind || v.z + v.halfLen > end)) despawn(v, track);
  }
  const minZ = player.z + CONFIG.road.drawDistance * SEGMENT_LENGTH;
  if (traffic.spawnZ < minZ) traffic.spawnZ = minZ;
  const maxZ = Math.min(player.z + cfg.spawnAhead * SEGMENT_LENGTH, end);
  while (traffic.spawnZ < maxZ) {
    const info = sectionAt(track, traffic.spawnZ);
    if (!info || (info.goalIndex >= 0 && traffic.spawnZ >= info.goalIndex * SEGMENT_LENGTH)) return;
    const t = info.section.traffic;
    const density = t ? t.density : 0;
    if (density <= 0) {
      traffic.spawnZ = (info.start + info.len) * SEGMENT_LENGTH;
      continue;
    }
    if (!spawnAt(traffic, track, info.section, traffic.spawnZ, rng) && !freeVehicle(traffic)) return;
    traffic.spawnZ += (cfg.segmentsPerCar / density) * SEGMENT_LENGTH * (1 + cfg.spawnJitter * (rng.next() * 2 - 1));
  }
}

function bandsOverlap(a0, a1, b0, b1) {
  return a0 < b1 && b0 < a1;
}

function lateralHit(o, x0, x1, halfW) {
  const m = CONFIG.traffic.sideMargin;
  const lo = Math.min(x0, x1) - halfW - m;
  const hi = Math.max(x0, x1) + halfW + m;
  return bandsOverlap(lo, hi, Math.min(o.x, o.targetX) - o.halfW, Math.max(o.x, o.targetX) + o.halfW);
}

/**
 * Nearest obstacle ahead of v in the lateral band spanning x0..x1.
 * Writes {gap, speed, other} into traffic.scratch (gap = Infinity if none).
 */
function nearestAhead(traffic, v, x0, x1, length) {
  const out = traffic.scratch;
  out.gap = Infinity;
  out.speed = 0;
  out.other = null;
  const list = traffic.vehicles;
  for (let i = 0; i <= list.length; i++) {
    const o = i < list.length ? list[i] : traffic.obstacle;
    if (o === v || !o.active || !lateralHit(o, x0, x1, v.halfW)) continue;
    const dz = wrapDelta(o.z - v.z, length);
    if (dz <= 0 || dz > CONFIG.traffic.lookahead) continue;
    const gap = dz - v.halfLen - o.halfLen;
    if (gap < out.gap) {
      out.gap = gap;
      out.speed = o.speed;
      out.other = o;
    }
  }
  return out;
}

function laneFree(traffic, v, tx, length) {
  const cfg = CONFIG.traffic;
  const front = cfg.minGap + v.speed * cfg.headway;
  const list = traffic.vehicles;
  for (let i = 0; i <= list.length; i++) {
    const o = i < list.length ? list[i] : traffic.obstacle;
    if (o === v || !o.active || !lateralHit(o, tx, tx, v.halfW)) continue;
    const dz = wrapDelta(o.z - v.z, length);
    const reach = v.halfLen + o.halfLen;
    if (dz > -(reach + cfg.laneCheckBack) && dz < reach + front) return false;
  }
  return true;
}

function tryLaneChange(traffic, v, roadX, length, rng) {
  const lanes = CONFIG.road.lanes;
  const cur = Math.round(((v.laneX + 1) * lanes - 1) / 2);
  const first = rng.next() < 0.5 ? -1 : 1;
  for (let k = 0; k < 2; k++) {
    const lane = cur + (k === 0 ? first : -first);
    if (lane < 0 || lane >= lanes) continue;
    const lx = laneCenter(lane);
    if (laneFree(traffic, v, roadX + lx, length)) {
      v.targetLaneX = lx;
      v.cooldown = CONFIG.traffic.laneChangeCooldown;
      return;
    }
  }
}

function steerToLane(v, dt) {
  const step = CONFIG.traffic.laneChangeSpeed * dt;
  const d = v.targetLaneX - v.laneX;
  v.laneX = Math.abs(d) <= step ? v.targetLaneX : v.laneX + Math.sign(d) * step;
}

/**
 * Keeps the vehicle's fork branch consistent with the road under it.
 * Returns false when the car was left on a branch that has ended.
 */
function followRoad(v, track, rng) {
  const seg = findSegment(track, v.z);
  if (seg.alt && v.side === 0) {
    // Entering a fork: stay on the side of the current lane.
    v.side = v.laneX < -0.01 ? -1 : v.laneX > 0.01 ? 1 : (rng.next() < 0.5 ? -1 : 1);
  } else if (!seg.alt && v.side !== 0) {
    // Fork (or ghost branch) ended: survive only if we are on the main road.
    if (Math.abs(v.x - branchCenter(track, v.z, 0)) > CONFIG.traffic.lostBranchDistance) return false;
    v.side = 0;
  }
  return true;
}

function updateVehicle(traffic, v, track, dt, rng) {
  const cfg = CONFIG.traffic;
  const length = track.length;
  v.prevZ = v.z;
  v.prevX = v.x;
  v.cooldown -= dt;
  const roadX = branchCenter(track, v.z, v.side);
  const ahead = nearestAhead(traffic, v, v.x, v.targetX, length);
  const safe = cfg.minGap + v.speed * cfg.headway;
  let target = v.cruise;
  if (ahead.gap < safe) {
    if (v.cooldown <= 0 && v.laneX === v.targetLaneX) tryLaneChange(traffic, v, roadX, length, rng);
    target = Math.min(target, ahead.gap <= cfg.minGap ? 0 : ahead.speed * (ahead.gap / safe));
  }
  if (v.speed < target) v.speed = Math.min(target, v.speed + cfg.accel * dt);
  else v.speed = Math.max(target, v.speed - cfg.brake * dt);
  steerToLane(v, dt);
  v.z = wrap(v.z + v.speed * dt, length);
  if (!followRoad(v, track, rng)) return false;
  const newRoadX = branchCenter(track, v.z, v.side);
  v.x = newRoadX + v.laneX;
  v.targetX = newRoadX + v.targetLaneX;
  // Hard constraint: never end a step overlapping something ahead.
  const after = nearestAhead(traffic, v, v.x, v.x, length);
  if (after.gap < 0) {
    v.z = wrap(after.other.z - after.other.halfLen - v.halfLen - 1, length);
    v.speed = Math.min(v.speed, after.speed);
  }
  return true;
}

/**
 * Refreshes the player obstacle the AI avoids.
 * @param {{obstacle:object}} traffic
 * @param {{z:number, x:number, speed:number}} player
 */
function setPlayerObstacle(traffic, player) {
  const o = traffic.obstacle;
  o.z = player.z;
  o.x = player.x;
  o.targetX = o.x;
  o.speed = player.speed;
  o.halfW = CONFIG.collision.playerWidth / (2 * CONFIG.road.roadWidth);
  o.halfLen = CONFIG.collision.playerLength / 2;
}

/**
 * One fixed step for all active vehicles.
 * @param {{vehicles:Vehicle[], obstacle:object, scratch:object}} traffic
 * @param {{segments:object[], length:number}} track
 * @param {{z:number, x:number, speed:number}} player
 * @param {number} dt
 * @param {{next:()=>number}} rng
 */
export function updateTraffic(traffic, track, player, dt, rng) {
  setPlayerObstacle(traffic, player);
  const list = traffic.vehicles;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.active) continue;
    if (updateVehicle(traffic, v, track, dt, rng)) setBucket(v, track);
    else despawn(v, track);
  }
}

/**
 * @param {{vehicles:Vehicle[]}} traffic
 * @returns {number} active vehicle count
 */
export function activeCount(traffic) {
  let n = 0;
  const list = traffic.vehicles;
  for (let i = 0; i < list.length; i++) if (list[i].active) n++;
  return n;
}

/**
 * Counts vehicles the player overtook since the last call (a car that was
 * clearly ahead is now clearly behind). Cars passing the player do not count.
 * @param {{vehicles:Vehicle[]}} traffic
 * @param {{z:number}} player
 * @param {number} length track length
 * @returns {number}
 */
export function countOvertakes(traffic, player, length) {
  const margin = CONFIG.collision.playerLength / 2;
  let n = 0;
  const list = traffic.vehicles;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.active) continue;
    const dz = wrapDelta(v.z - player.z, length);
    if (dz > v.halfLen + margin) v.ahead = 1;
    else if (dz < -(v.halfLen + margin)) {
      if (v.ahead === 1) n++;
      v.ahead = -1;
    }
  }
  return n;
}
