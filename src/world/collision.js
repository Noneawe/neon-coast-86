// Player collisions with traffic and solid roadside objects. Boxes are
// axis-aligned in (z, normalized x). Every hit is resolved so that nothing
// overlaps afterwards; hard hits start the crash sequence.

import { CONFIG, SEGMENT_LENGTH } from '../config.js';
import { wrap } from '../engine/math.js';
import { wrapDelta } from './traffic.js';
import { startCrash, isVulnerable } from './player.js';
import { nearestRoadCenter } from './track.js';

/** Collision result kinds. */
export const HIT_NONE = 0;
export const HIT_BUMP = 1;
export const HIT_SIDE = 2;
export const HIT_CRASH = 3;

/** @returns {number} player half width in normalized x */
export function playerHalfWidth() {
  return CONFIG.collision.playerWidth / (2 * CONFIG.road.roadWidth);
}

/**
 * Axis-aligned overlap in (dz, dx) with half extents.
 * @param {number} dz
 * @param {number} dx
 * @param {number} halfLen
 * @param {number} halfW
 * @returns {boolean}
 */
export function boxesOverlap(dz, dx, halfLen, halfW) {
  return Math.abs(dz) < halfLen && Math.abs(dx) < halfW;
}

/**
 * Classifies contact with one roadside sprite: HIT_NONE, HIT_SIDE (the car
 * was already alongside it) or HIT_BUMP (the car front swept into it).
 */
function spriteContact(p, spr, spriteZ, length) {
  if (spr.collide <= 0) return HIT_NONE;
  const halfW = playerHalfWidth() + (spr.worldWidth * spr.collide) / (2 * CONFIG.road.roadWidth);
  if (Math.abs(p.x - spr.x) >= halfW) return HIT_NONE;
  const half = CONFIG.collision.playerLength / 2;
  const travelled = wrapDelta(p.z - p.prevZ, length);
  const d = wrapDelta(spriteZ - p.prevZ, length);
  if (d > -half && d < half) return HIT_SIDE;
  return d >= half && d <= travelled + half ? HIT_BUMP : HIT_NONE;
}

function resolveSprite(p, spr, spriteZ, kind, track) {
  const length = track.length;
  const c = CONFIG.collision;
  const halfW = playerHalfWidth() + (spr.worldWidth * spr.collide) / (2 * CONFIG.road.roadWidth);
  if (kind === HIT_SIDE) {
    const toRoad = nearestRoadCenter(track, p.z, p.x) - spr.x;
    p.x = spr.x + Math.sign(p.x - spr.x || toRoad) * (halfW + c.sideGap);
    p.speed *= c.sideSpeedFactor;
    return HIT_SIDE;
  }
  const speed = p.speed;
  p.z = wrap(spriteZ - c.playerLength / 2 - 1, length);
  if (speed > c.spriteCrashSpeed) {
    startCrash(p);
    return HIT_CRASH;
  }
  // Light knock: stop and nudge toward the road so the car cannot get stuck.
  p.speed = 0;
  const center = nearestRoadCenter(track, p.z, p.x);
  const local = p.x - center;
  p.x = center + local - Math.sign(local) * Math.min(Math.abs(local), c.spriteNudge);
  return HIT_BUMP;
}

/**
 * Checks solid roadside sprites on the segments the car swept this step.
 * @param {object} p player
 * @param {{segments:object[], length:number}} track
 * @returns {number} HIT_NONE, HIT_SIDE, HIT_BUMP or HIT_CRASH
 */
export function collidePlayerSprites(p, track) {
  if (!isVulnerable(p)) return HIT_NONE;
  const c = CONFIG.collision;
  const count = track.segments.length;
  const back = p.prevZ - c.playerLength / 2;
  const from = Math.floor((track.loop ? wrap(back, track.length) : Math.max(0, back)) / SEGMENT_LENGTH);
  const span = Math.ceil((wrapDelta(p.z - p.prevZ, track.length) + c.playerLength) / SEGMENT_LENGTH) + 1;
  for (let i = 0; i <= span; i++) {
    if (!track.loop && from + i >= count) break;
    const seg = track.segments[(from + i) % count];
    for (let s = 0; s < seg.sprites.length; s++) {
      const spr = seg.sprites[s];
      const kind = spriteContact(p, spr, seg.p1.world.z, track.length);
      if (kind !== HIT_NONE) return resolveSprite(p, spr, seg.p1.world.z, kind, track);
    }
  }
  return HIT_NONE;
}

function resolveVehicle(p, v, length, halfLen, halfW, dz, dx) {
  const c = CONFIG.collision;
  const prevDz = wrapDelta(v.prevZ - p.prevZ, length);
  if (Math.abs(prevDz) < halfLen) {
    // Already alongside last step: a side swipe, push the player sideways.
    p.x = v.x - Math.sign(dx || 1) * (halfW + c.sideGap);
    p.speed *= c.sideSpeedFactor;
    return HIT_SIDE;
  }
  if (dz > 0) {
    const closing = p.speed - v.speed;
    p.z = wrap(v.z - halfLen - 1, length);
    if (closing > c.crashRelSpeed) {
      startCrash(p);
      return HIT_CRASH;
    }
    p.speed = Math.min(p.speed, v.speed * c.bumpSpeedFactor);
    return HIT_BUMP;
  }
  // The vehicle ran into the player from behind: move it back instead.
  v.z = wrap(p.z - halfLen - 1, length);
  v.speed = Math.min(v.speed, p.speed);
  return HIT_BUMP;
}

/**
 * Checks and resolves player vs traffic overlaps.
 * @param {object} p player
 * @param {{vehicles:object[]}} traffic
 * @param {number} length track length
 * @returns {number} strongest hit kind this step
 */
export function collidePlayerVehicles(p, traffic, length) {
  if (!isVulnerable(p)) return HIT_NONE;
  const pHalfW = playerHalfWidth();
  const pHalfLen = CONFIG.collision.playerLength / 2;
  let result = HIT_NONE;
  const list = traffic.vehicles;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.active) continue;
    const halfLen = pHalfLen + v.halfLen;
    const halfW = pHalfW + v.halfW;
    const dz = wrapDelta(v.z - p.z, length);
    const dx = v.x - p.x;
    if (!boxesOverlap(dz, dx, halfLen, halfW)) continue;
    const hit = resolveVehicle(p, v, length, halfLen, halfW, dz, dx);
    if (hit > result) result = hit;
    if (hit === HIT_CRASH) break;
  }
  return result;
}
