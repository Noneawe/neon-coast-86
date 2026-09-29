// Scoring: points for distance, drift points that are banked only after a
// clean exit (times a combo multiplier), lost on a failed drift, and a bonus
// for time left at the goal.

import { CONFIG } from '../config.js';
import { DRIFT_END_CLEAN, DRIFT_END_FAIL } from '../world/player.js';

/** @returns {object} empty score state */
export function createScore() {
  const s = {};
  resetScore(s);
  return s;
}

/**
 * @param {object} s score state
 */
export function resetScore(s) {
  s.total = 0;
  s.distance = 0;       // fractional distance points not yet added
  s.driftPoints = 0;    // points of the running drift (not banked yet)
  s.multiplier = 1;
  s.comboTimer = 0;
  s.lastBank = 0;       // last banked amount (for the HUD)
  s.bankTimer = 0;
  s.lastFailed = false;
  s.drifts = 0;         // banked drifts
  s.goalBonus = 0;
  s.goalAwarded = false;
  s.passengerBonus = 0;
}

function bank(s, p) {
  const sc = CONFIG.score;
  if (p.driftTime < sc.driftMinTime) {
    s.driftPoints = 0;
    return;
  }
  const amount = Math.round(s.driftPoints) * s.multiplier;
  s.total += amount;
  s.lastBank = amount;
  s.bankTimer = sc.bankMessageTime;
  s.lastFailed = false;
  s.drifts++;
  s.multiplier = Math.min(sc.maxMultiplier, s.multiplier + 1);
  s.comboTimer = sc.comboWindow;
  s.driftPoints = 0;
}

function fail(s) {
  s.driftPoints = 0;
  s.multiplier = 1;
  s.comboTimer = 0;
  s.lastBank = 0;
  s.lastFailed = true;
  s.bankTimer = CONFIG.score.bankMessageTime;
}

/**
 * One fixed step. Call after physics and collisions.
 * @param {object} s score state
 * @param {{speed:number, drift:boolean, driftAngle:number, driftTime:number, driftEnd:number}} p player
 * @param {number} dt
 */
export function updateScore(s, p, dt) {
  const sc = CONFIG.score;
  s.distance += p.speed * dt * sc.distancePoints;
  if (s.distance >= 1) {
    const whole = Math.floor(s.distance);
    s.total += whole;
    s.distance -= whole;
  }
  if (p.drift) s.driftPoints += sc.driftRate * p.driftAngle * (p.speed / CONFIG.player.maxSpeed) * dt;
  if (p.driftEnd === DRIFT_END_CLEAN) bank(s, p);
  else if (p.driftEnd === DRIFT_END_FAIL) fail(s);
  if (s.bankTimer > 0) s.bankTimer -= dt;
  if (!p.drift && s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.multiplier = 1;
  }
}

/**
 * Adds the time-left bonus once when the goal is reached.
 * @param {object} s
 * @param {number} timeLeft seconds
 */
export function awardGoal(s, timeLeft) {
  if (s.goalAwarded) return;
  s.goalAwarded = true;
  s.goalBonus = Math.round(timeLeft * CONFIG.score.goalTimeBonus);
  s.total += s.goalBonus;
}

/**
 * Adds the passenger mood bonus (passenger mode, at the goal).
 * @param {object} s
 * @param {number} hearts
 */
export function awardPassenger(s, hearts) {
  if (s.passengerBonus > 0) return;
  s.passengerBonus = hearts * CONFIG.passenger.heartBonus;
  s.total += s.passengerBonus;
}
