// Passenger mode: every section the passenger asks for a task that fits the
// section (picked from data/tasks.js by the section's curves, straights,
// traffic and theme). Tasks won or lost change her mood (0-5 hearts), which
// decides the ending. Only active when the race runs in passenger mode.

import { CONFIG } from '../config.js';
import { TASKS, PASSENGER_LINES } from '../data/tasks.js';

/**
 * Section facts used to match tasks (pure).
 * @param {{segments:{len:number, curve:number}[], traffic?:{density:number}}} section
 * @returns {{curviness:number, longestStraight:number, density:number}}
 */
export function sectionStats(section) {
  let total = 0;
  let bend = 0;
  let run = 0;
  let longest = 0;
  for (const p of section.segments) {
    total += p.len;
    bend += Math.abs(p.curve) * p.len;
    run = p.curve === 0 ? run + p.len : 0;
    if (run > longest) longest = run;
  }
  return { curviness: bend / total, longestStraight: longest, density: section.traffic ? section.traffic.density : 0 };
}

/**
 * @param {{fits:object}} task
 * @param {{curviness:number, longestStraight:number, density:number}} stats
 * @param {string} theme
 * @returns {boolean}
 */
export function taskFits(task, stats, theme) {
  const f = task.fits;
  if (f.minCurviness !== undefined && stats.curviness < f.minCurviness) return false;
  if (f.minStraight !== undefined && stats.longestStraight < f.minStraight) return false;
  if (f.minDensity !== undefined && stats.density < f.minDensity) return false;
  if (f.themes && !f.themes.includes(theme)) return false;
  return true;
}

/**
 * Task keys that fit a section.
 * @param {object} section
 * @returns {string[]}
 */
export function candidateTasks(section) {
  const stats = sectionStats(section);
  return Object.keys(TASKS).filter((k) => taskFits(TASKS[k], stats, section.theme));
}

/**
 * Picks a fitting task, avoiding an immediate repeat when possible.
 * @param {object} section
 * @param {{int:(a:number,b:number)=>number}} rng
 * @param {string|null} lastKey
 * @returns {string}
 */
export function pickTask(section, rng, lastKey) {
  let keys = candidateTasks(section);
  if (keys.length > 1) keys = keys.filter((k) => k !== lastKey);
  if (keys.length === 0) keys = ['clean'];
  return keys[rng.int(0, keys.length - 1)];
}

/** @returns {object} inactive passenger state */
export function createPassenger() {
  return {
    active: false, hearts: 0, key: null, text: '', stage: 1, value: 0, target: 0, kmh: 0, limit: 0,
    running: false, delay: 0, message: '', messageTimer: 0, wins: 0, losses: 0, event: '',
  };
}

function say(ps, line) {
  ps.message = line;
  ps.messageTimer = CONFIG.passenger.messageTime;
}

function setHearts(ps, delta) {
  ps.hearts = Math.max(0, Math.min(CONFIG.passenger.maxHearts, ps.hearts + delta));
}

/**
 * Turns passenger mode on for a new race and says hello.
 * @param {object} ps
 */
export function startPassenger(ps) {
  ps.active = true;
  ps.hearts = CONFIG.passenger.startHearts;
  ps.key = null;
  ps.running = false;
  ps.wins = 0;
  ps.losses = 0;
  ps.delay = CONFIG.passenger.taskDelay;
  ps.event = '';
  say(ps, PASSENGER_LINES.hello);
}

/**
 * Gives the task for a section (stage 1..5 picks the difficulty values).
 * @param {object} ps
 * @param {object} section
 * @param {number} stage
 * @param {{int:(a:number,b:number)=>number}} rng
 */
export function beginTask(ps, section, stage, rng) {
  const key = pickTask(section, rng, ps.key);
  const t = TASKS[key];
  const i = Math.max(0, Math.min(4, stage - 1));
  ps.key = key;
  ps.stage = stage;
  ps.target = t.target ? t.target[i] : 0;
  ps.kmh = t.kmh ? t.kmh[i] : 0;
  ps.limit = t.limit ? t.limit[i] : 0;
  ps.value = 0;
  ps.running = true;
  ps.text = t.text.replace('{target}', String(ps.target)).replace('{kmh}', String(ps.kmh)).replace('{limit}', String(ps.limit));
  ps.event = 'task';
}

function resolve(ps, won) {
  if (!ps.running) return;
  ps.running = false;
  setHearts(ps, won ? 1 : -1);
  if (won) ps.wins++;
  else ps.losses++;
  say(ps, won ? PASSENGER_LINES.success : PASSENGER_LINES.fail);
  ps.event = won ? 'win' : 'lose';
}

/** Progress tasks win as soon as the target is reached; guard tasks can only fail early. */
function measure(ps, env, dt) {
  const p = env.player;
  const kmh = p.speed * CONFIG.hud.kmhPerUnit;
  switch (TASKS[ps.key].measure) {
    case 'timeAbove': if (kmh > ps.kmh) ps.value += dt; break;
    case 'timeBelow': if (kmh < ps.kmh && kmh > ps.kmh / 3) ps.value += dt; break;
    case 'driftTime': if (p.drift) ps.value += dt; break;
    case 'multiplier': ps.value = Math.max(ps.value, env.score.multiplier); break;
    case 'overtakes': ps.value += env.overtakes; break;
    case 'noHits': if (env.hit) resolve(ps, false); return;
    case 'offRoadTime':
      if (p.offRoad) ps.value += dt;
      if (ps.value > ps.limit) resolve(ps, false);
      return;
    default: return;
  }
  if (ps.value >= ps.target) resolve(ps, true);
}

/**
 * Ends the current task at a checkpoint, the goal or TIME UP: guard tasks
 * that survived are won, unfinished progress tasks are lost.
 * @param {object} ps
 */
export function finishTask(ps) {
  if (!ps.running) return;
  const m = TASKS[ps.key].measure;
  resolve(ps, m === 'noHits' || m === 'offRoadTime');
}

/**
 * One fixed step while the race runs.
 * @param {object} ps
 * @param {{player:object, score:object, hit:boolean, crashed:boolean, overtakes:number,
 *   section:object, stage:number, rng:object}} env
 * @param {number} dt
 */
export function updatePassenger(ps, env, dt) {
  if (!ps.active) return;
  ps.event = '';
  if (ps.messageTimer > 0) ps.messageTimer -= dt;
  if (env.crashed) {
    setHearts(ps, -CONFIG.passenger.crashPenalty);
    say(ps, PASSENGER_LINES.crash);
    ps.event = 'crash';
  }
  if (ps.running) {
    measure(ps, env, dt);
  } else if (ps.delay > 0) {
    ps.delay -= dt;
    if (ps.delay <= 0) beginTask(ps, env.section, env.stage, env.rng);
  }
}

/**
 * Called when the player enters a new section: settles the old task and
 * schedules the next one.
 * @param {object} ps
 */
export function sectionChanged(ps) {
  if (!ps.active) return;
  finishTask(ps);
  ps.delay = CONFIG.passenger.taskDelay;
}

/**
 * Ending tier for a heart count: 0 low, 1 medium, 2 high.
 * @param {number} hearts
 * @returns {number}
 */
export function endingTier(hearts) {
  const [mid, high] = CONFIG.passenger.tiers;
  return hearts >= high ? 2 : hearts >= mid ? 1 : 0;
}

/**
 * Fraction 0..1 shown by the task bar (progress, or allowance left for guard tasks).
 * @param {object} ps
 * @returns {number}
 */
export function taskProgress(ps) {
  if (!ps.running) return 0;
  const m = TASKS[ps.key].measure;
  if (m === 'noHits') return 1;
  if (m === 'offRoadTime') return Math.max(0, 1 - ps.value / ps.limit);
  return Math.min(1, ps.value / ps.target);
}
