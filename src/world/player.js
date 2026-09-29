// Player car physics: two-gear transmission (LOW/HIGH), braking, coasting,
// slope drag, steering, centrifugal push in curves, drifting, off-road drag,
// road bumps and the crash sequence (tumble → recover → grace). Reads
// controls, never devices.

import { CONFIG } from '../config.js';
import { clamp, wrap, easeInOut } from '../engine/math.js';
import { findSegment, nearestRoadCenter } from './track.js';

/** Crash phases. */
export const CRASH_NONE = 0;
export const CRASH_TUMBLE = 1;
export const CRASH_RECOVER = 2;

/** Drift end reasons reported in p.driftEnd for one step. */
export const DRIFT_END_NONE = 0;
export const DRIFT_END_CLEAN = 1;
export const DRIFT_END_FAIL = 2;

/**
 * @returns {{z:number, prevZ:number, x:number, prevX:number, speed:number, gear:string,
 *   steer:number, rpm:number, offRoad:boolean, bounce:number, bounceDist:number,
 *   crash:number, crashTime:number, hop:number, spin:number, recoverFromX:number,
 *   recoverToX:number, grace:number, drift:boolean, driftDir:number, driftAngle:number,
 *   driftTime:number, driftEnd:number}}
 */
export function createPlayer() {
  const p = {};
  resetPlayer(p, 0);
  return p;
}

/**
 * @param {object} p player
 * @param {number} z start position
 */
export function resetPlayer(p, z) {
  p.z = z;
  p.prevZ = z;
  p.x = 0;
  p.prevX = 0;
  p.speed = 0;
  p.gear = CONFIG.player.startGear;
  p.steer = 0;
  p.rpm = CONFIG.player.rpmIdle;
  p.offRoad = false;
  p.bounce = 0;
  p.bounceDist = 0;
  p.crash = CRASH_NONE;
  p.crashTime = 0;
  p.hop = 0;
  p.spin = 0;
  p.recoverFromX = 0;
  p.recoverToX = 0;
  p.grace = 0;
  p.drift = false;
  p.driftDir = 0;
  p.driftAngle = 0;
  p.driftTime = 0;
  p.driftEnd = DRIFT_END_NONE;
}

/**
 * Ends a running drift and records why (clean exit banks points, a failure loses them).
 * @param {object} p
 * @param {number} reason DRIFT_END_CLEAN or DRIFT_END_FAIL
 */
export function endDrift(p, reason) {
  if (!p.drift) return;
  p.drift = false;
  p.driftEnd = reason;
  p.driftAngle = 0;
}

function updateDrift(p, c, dt) {
  const d = CONFIG.drift;
  if (!p.drift) {
    if (c.drift && p.speed >= d.minSpeed && Math.abs(c.steer) >= d.minSteer && !p.offRoad) {
      p.drift = true;
      p.driftDir = c.steer > 0 ? 1 : -1;
      p.driftAngle = d.startAngle;
      p.driftTime = 0;
    }
    return;
  }
  const into = c.steer * p.driftDir;
  if (p.offRoad) endDrift(p, DRIFT_END_FAIL);
  else if (!c.drift || -into > d.exitCounterSteer || p.speed < d.keepSpeed) endDrift(p, DRIFT_END_CLEAN);
  if (!p.drift) return;
  // Steering into the drift opens the angle, counter-steering closes it.
  const target = into >= 0 ? d.baseAngle + (1 - d.baseAngle) * into : d.baseAngle * (1 + into);
  p.driftAngle += (target - p.driftAngle) * Math.min(1, d.angleRate * dt);
  p.driftTime += dt;
}

/**
 * True while the player can be hit (not crashing, not in post-crash grace).
 * @param {object} p
 * @returns {boolean}
 */
export function isVulnerable(p) {
  return p.crash === CRASH_NONE && p.grace <= 0;
}

/**
 * Starts the crash sequence: the car stops and tumbles in place.
 * @param {object} p
 */
export function startCrash(p) {
  endDrift(p, DRIFT_END_FAIL);
  p.crash = CRASH_TUMBLE;
  p.crashTime = 0;
  p.speed = 0;
  p.hop = 0;
  p.spin = 0;
  p.bounce = 0;
}

function updateCrash(p, track, dt) {
  const c = CONFIG.collision;
  p.crashTime += dt;
  p.speed = 0;
  p.steer = 0;
  p.rpm = CONFIG.player.rpmIdle;
  if (p.crash === CRASH_TUMBLE) {
    const t = Math.min(1, p.crashTime / c.tumbleTime);
    p.hop = Math.round(Math.sin(t * Math.PI) * c.tumbleHopPx);
    p.spin = t * c.tumbleSpins;
    if (t >= 1) {
      p.crash = CRASH_RECOVER;
      p.crashTime = 0;
      p.hop = 0;
      p.spin = 0;
      const center = nearestRoadCenter(track, p.z, p.x);
      p.recoverFromX = p.x;
      p.recoverToX = center + clamp(p.x - center, -c.recoverMaxX, c.recoverMaxX);
    }
    return;
  }
  const t = Math.min(1, p.crashTime / c.recoverTime);
  p.x = easeInOut(p.recoverFromX, p.recoverToX, t);
  if (t >= 1) {
    p.crash = CRASH_NONE;
    p.crashTime = 0;
    p.grace = c.graceTime;
    p.gear = CONFIG.player.startGear;
  }
}

/**
 * Engine acceleration available in `gear` at `speed` (0 at or above gear v-max).
 * @param {{maxSpeed:number, accel:number, lowSpeedAccel:number, lowSpeedLimit:number}} gear
 * @param {number} speed
 * @returns {number}
 */
export function gearAccel(gear, speed) {
  if (speed >= gear.maxSpeed) return 0;
  const base = speed < gear.lowSpeedLimit ? gear.lowSpeedAccel : gear.accel;
  const ratio = speed / gear.maxSpeed;
  return base * (1 - CONFIG.player.accelFalloff * ratio * ratio);
}

function updateSpeed(p, c, seg, track, dt) {
  const cfg = CONFIG.player;
  const gear = cfg.gears[p.gear];
  const before = p.speed;
  const slope = (seg.p2.world.y - seg.p1.world.y) / CONFIG.road.segmentLength;
  let a = c.throttle * gearAccel(gear, p.speed) * (p.drift ? CONFIG.drift.accelFactor : 1);
  if (p.drift) a -= CONFIG.drift.drag * p.driftAngle;
  a -= c.brake * cfg.brake;
  if (c.brake === 0) a -= (1 - c.throttle) * cfg.coastDecel;
  if (p.speed > 0 || a > 0) a -= slope * cfg.slopeGravity;
  p.speed += a * dt;
  if (p.speed > gear.maxSpeed) {
    // Engine limit: accelerating stops at v-max, a downshift bleeds speed off.
    p.speed = before <= gear.maxSpeed ? gear.maxSpeed : Math.max(gear.maxSpeed, p.speed - cfg.overRevDecel * dt);
  }
  p.offRoad = Math.abs(p.x - nearestRoadCenter(track, p.z, p.x)) > 1;
  if (p.offRoad && p.speed > cfg.offRoadMaxSpeed) {
    p.speed = Math.max(cfg.offRoadMaxSpeed, p.speed - cfg.offRoadDecel * dt);
  }
  p.speed = clamp(p.speed, 0, cfg.maxSpeed);
}

function updateLateral(p, c, seg, track, dt) {
  const cfg = CONFIG.player;
  const d = CONFIG.drift;
  const pct = p.speed / cfg.maxSpeed;
  if (p.drift) {
    // Less centrifugal push, but the tail swings the car toward the drift side.
    p.x += c.steer * cfg.steerSpeed * d.steerFactor * pct * dt;
    p.x += p.driftDir * d.slide * p.driftAngle * pct * dt;
    p.x -= seg.curve * cfg.centrifugal * d.centrifugalFactor * pct * pct * dt;
  } else {
    p.x += c.steer * cfg.steerSpeed * pct * dt;
    p.x -= seg.curve * cfg.centrifugal * pct * pct * dt;
  }
  // Lateral limit is relative to the nearest road (roads can sit anywhere in x).
  const center = nearestRoadCenter(track, p.z, p.x);
  p.x = center + clamp(p.x - center, -cfg.maxX, cfg.maxX);
  p.steer += (c.steer - p.steer) * Math.min(1, cfg.steerResponse * dt);
}

function updateBounce(p, dt, rng) {
  const b = CONFIG.player.bounce;
  if (p.speed <= 0) {
    p.bounce = 0;
    return;
  }
  p.bounceDist += p.speed * dt;
  const interval = p.offRoad ? b.offRoadDistance : b.roadDistance;
  if (p.bounceDist < interval) return;
  p.bounceDist = 0;
  const amp = p.offRoad ? b.offRoadAmp : b.roadAmp;
  p.bounce = Math.round((rng.next() * 2 - 1) * amp * (p.speed / CONFIG.player.maxSpeed));
}

/**
 * One fixed physics step.
 * @param {object} p player (see createPlayer)
 * @param {{throttle:number, brake:number, steer:number, gearToggle:boolean, drift?:boolean}} c controls:
 *   throttle/brake 0..1, steer -1..1, gearToggle true on the step it was pressed, drift held
 * @param {{segments:object[], length:number}} track
 * @param {number} dt
 * @param {{next:() => number}} rng
 */
export function updatePlayer(p, c, track, dt, rng) {
  const cfg = CONFIG.player;
  p.prevZ = p.z;
  p.prevX = p.x;
  p.driftEnd = DRIFT_END_NONE;
  if (p.grace > 0) p.grace -= dt;
  if (p.crash !== CRASH_NONE) {
    updateCrash(p, track, dt);
    p.offRoad = Math.abs(p.x - nearestRoadCenter(track, p.z, p.x)) > 1;
    return;
  }
  if (c.gearToggle) p.gear = p.gear === 'LOW' ? 'HIGH' : 'LOW';
  const seg = findSegment(track, p.z);
  updateDrift(p, c, dt);
  updateSpeed(p, c, seg, track, dt);
  updateLateral(p, c, seg, track, dt);
  p.z = wrap(p.z + p.speed * dt, track.length);
  const gearMax = cfg.gears[p.gear].maxSpeed;
  p.rpm = cfg.rpmIdle + (cfg.rpmMax - cfg.rpmIdle) * clamp(p.speed / gearMax, 0, 1);
  updateBounce(p, dt, rng);
}

/**
 * Render-time position interpolated between the last two steps.
 * @param {object} p player
 * @param {number} alpha 0..1
 * @param {number} trackLength
 * @param {{z:number, x:number}} out
 */
export function interpolatePlayer(p, alpha, trackLength, out) {
  let dz = p.z - p.prevZ;
  if (dz < 0) dz += trackLength;
  out.z = wrap(p.prevZ + dz * alpha, trackLength);
  out.x = p.prevX + (p.x - p.prevX) * alpha;
}
