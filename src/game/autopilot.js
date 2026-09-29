// Demo driver for the attract mode: aims at the road ahead (taking a random
// branch at forks), brakes for sharp curves at high speed and shifts to HIGH.
// Produces the same controls object the player's input would.

import { CONFIG } from '../config.js';
import { findSegment, branchCenter } from '../world/track.js';

/** @returns {{side:number, sectionIndex:number}} autopilot memory */
export function createAutopilot() {
  return { side: -1, sectionIndex: -1 };
}

/**
 * Fills `controls` for one step.
 * @param {{side:number, sectionIndex:number}} ap
 * @param {{z:number, x:number, speed:number, gear:string}} player
 * @param {object} track
 * @param {number} sectionIndex section the player is in (a new one re-rolls the fork side)
 * @param {{next:()=>number}} rng
 * @param {{throttle:number, brake:number, steer:number, gearToggle:boolean, drift:boolean}} controls
 */
export function autopilotControls(ap, player, track, sectionIndex, rng, controls) {
  const a = CONFIG.autopilot;
  if (sectionIndex !== ap.sectionIndex) {
    ap.sectionIndex = sectionIndex;
    ap.side = rng.next() < 0.5 ? -1 : 1;
  }
  const z = player.z + a.lookahead;
  const target = branchCenter(track, z, ap.side);
  const err = target - player.x;
  controls.steer = err > 1 / a.steerGain ? 1 : err < -1 / a.steerGain ? -1 : err * a.steerGain;
  const sharp = Math.abs(findSegment(track, z).curve) >= a.brakeCurve;
  const braking = sharp && player.speed > a.brakeSpeed;
  controls.throttle = braking ? 0 : 1;
  controls.brake = braking ? a.brakeAmount : 0;
  controls.gearToggle = player.gear === 'LOW' && player.speed > a.shiftSpeed;
  controls.drift = false;
}
