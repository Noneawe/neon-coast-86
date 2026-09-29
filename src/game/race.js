// Race rules: countdown timer, checkpoints (time bonus when a new section
// starts), fork decisions that append the chosen section, the goal line and
// TIME UP. Works only on section data and track info, never on specific ids.

import { CONFIG, SEGMENT_LENGTH } from '../config.js';
import { appendSection, applyForkDecision } from '../world/track.js';

export const RACE_RUNNING = 0;
export const RACE_TIME_UP = 1;
export const RACE_FINISHED = 2;

/**
 * Pyramid stage (1-based depth) of every section, found by walking `next`
 * links from the sections nothing points to.
 * @param {object[]} sections
 * @returns {Object<string, number>}
 */
export function sectionStages(sections) {
  const referenced = new Set();
  for (const s of sections) if (s.next) referenced.add(s.next.left).add(s.next.right);
  const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
  const stage = {};
  let frontier = sections.filter((s) => !referenced.has(s.id)).map((s) => s.id);
  for (let depth = 1; frontier.length > 0; depth++) {
    const next = [];
    for (const id of frontier) {
      if (stage[id]) continue;
      stage[id] = depth;
      const n = byId[id] && byId[id].next;
      if (n) next.push(n.left, n.right);
    }
    frontier = next;
  }
  return stage;
}

/** @returns {object} empty race progress */
export function createRace() {
  return {
    status: RACE_RUNNING,
    time: 0,
    elapsed: 0,
    stage: 1,
    sectionIndex: 0,     // index into track.sections of the player's section
    route: [],           // section ids in driving order
    message: '',         // transient message key ('checkpoint' / '')
    messageTimer: 0,
    lastBonus: 0,
    endTimer: 0,
    goalId: null,
    appendedFrom: -1,    // first new segment index after a fork decision (-1 = none)
    god: false,
  };
}

/**
 * Starts a race on an empty linear track from section `startId`.
 * @param {object} race from createRace
 * @param {object} track from createTrack
 * @param {{byId:Object<string,object>, stages:Object<string,number>, spriteDefs:object}} env
 * @param {string} startId
 * @param {boolean} god infinite time
 */
export function startRace(race, track, env, startId, god) {
  const section = env.byId[startId];
  appendSection(track, section, { spriteDefs: env.spriteDefs, gates: true });
  race.status = RACE_RUNNING;
  race.time = section.timeBonus;
  race.elapsed = 0;
  race.stage = env.stages[startId] || 1;
  race.sectionIndex = 0;
  race.route = [startId];
  race.message = '';
  race.messageTimer = 0;
  race.endTimer = 0;
  race.goalId = null;
  race.appendedFrom = -1;
  race.god = !!god;
}

function decideFork(race, track, env, info, player) {
  const side = player.x < info.baseX ? -1 : 1;
  const r = applyForkDecision(track, info, side);
  const from = track.segments.length;
  appendSection(track, env.byId[r.nextId], {
    spriteDefs: env.spriteDefs,
    baseX: r.baseX,
    prevTheme: info.section.theme,
    gates: true,
    ghost: r.ghost,
  });
  race.route.push(r.nextId);
  race.appendedFrom = from;
}

function enterSection(race, env, info) {
  race.sectionIndex = info.index;
  race.stage = env.stages[info.id] || race.stage + 1;
  race.lastBonus = info.section.timeBonus;
  race.time += info.section.timeBonus;
  race.message = 'checkpoint';
  race.messageTimer = CONFIG.race.checkpointMessageTime;
}

/**
 * One fixed step of the race rules.
 * @param {object} race
 * @param {object} track
 * @param {{byId:Object<string,object>, stages:Object<string,number>, spriteDefs:object}} env
 * @param {{z:number, x:number}} player
 * @param {number} dt
 */
export function updateRace(race, track, env, player, dt) {
  race.appendedFrom = -1;
  if (race.messageTimer > 0) race.messageTimer -= dt;
  if (race.status !== RACE_RUNNING) {
    race.endTimer += dt;
    return;
  }
  race.elapsed += dt;
  const index = Math.floor(player.z / SEGMENT_LENGTH);
  const next = track.sections[race.sectionIndex + 1];
  if (next && index >= next.start) enterSection(race, env, next);
  const info = track.sections[race.sectionIndex];
  if (info.forked && info.chosen === 0 && index >= info.decisionIndex) decideFork(race, track, env, info, player);
  if (info.goalIndex >= 0 && index >= info.goalIndex) {
    race.status = RACE_FINISHED;
    race.goalId = info.section.goal;
    race.endTimer = 0;
    return;
  }
  if (race.god) return;
  race.time -= dt;
  if (race.time <= 0) {
    race.time = 0;
    race.status = RACE_TIME_UP;
    race.endTimer = 0;
  }
}

/**
 * True once the post-race delay is over and the result screen should show.
 * @param {object} race
 * @returns {boolean}
 */
export function raceOver(race) {
  if (race.status === RACE_FINISHED) return race.endTimer >= CONFIG.race.finishDelay;
  if (race.status === RACE_TIME_UP) return race.endTimer >= CONFIG.race.timeUpDelay;
  return false;
}

/**
 * Progress 0..1 through the player's current section (for the mini-map).
 * @param {object} race
 * @param {object} track
 * @param {{z:number}} player
 * @returns {number}
 */
export function sectionProgress(race, track, player) {
  const info = track.sections[race.sectionIndex];
  const t = (player.z / SEGMENT_LENGTH - info.start) / info.len;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
