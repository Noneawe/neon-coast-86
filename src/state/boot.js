// Boot state: remembers the launch parameters and opens the title screen,
// or starts a race at once when ?section= is given, or the looping test
// track with ?test=1 (debug). Also builds the race parameters used by the
// menu, pause (restart) and title demo.

import { SECTIONS, SECTION_BY_ID } from '../data/sections.js';
import { WORLD_SPRITES } from '../gfx/world-sprites.js';
import { TEST_SECTIONS } from '../data/test-track.js';
import { buildTrack } from '../world/track.js';
import { createRng } from '../engine/rng.js';
import { debugLog } from '../engine/debug.js';
import { sectionStages } from '../game/race.js';
import { setState } from './machine.js';

const STAGES = sectionStages(SECTIONS);
const ENV = { byId: SECTION_BY_ID, stages: STAGES, spriteDefs: WORLD_SPRITES };
const launch = { seed: null, god: false, section: null, passenger: false, test: false };

/**
 * Start section: the requested id when it exists, otherwise the first stage-1 section.
 * @param {string|null} requested
 * @returns {string}
 */
export function pickStartSection(requested) {
  if (requested && SECTION_BY_ID[requested]) return requested;
  return SECTIONS.find((s) => STAGES[s.id] === 1).id;
}

function newSeed() {
  return launch.seed !== null ? launch.seed : Math.floor(Math.random() * 4294967296);
}

/**
 * Parameters for a new race (menu start, pause restart).
 * @param {boolean} passenger passenger mode
 * @returns {object} params for the race state
 */
export function buildRaceParams(passenger) {
  const seed = newSeed();
  const startId = pickStartSection(launch.section);
  debugLog('race start', startId, 'seed', seed, passenger ? 'passenger' : 'normal');
  return { env: ENV, startId, rng: createRng(seed), god: launch.god, passenger };
}

/** @returns {object} params for an attract-mode demo race */
export function buildDemoParams() {
  return { env: ENV, startId: pickStartSection(null), rng: createRng(Math.floor(Math.random() * 4294967296)), demo: true };
}

export const bootState = {
  /** @param {{seed?:number|null, god?:boolean, section?:string|null, passenger?:boolean, test?:boolean, first?:boolean}} params */
  enter(params) {
    if (params.first) {
      launch.seed = params.seed ?? null;
      launch.god = !!params.god;
      launch.section = params.section || null;
      launch.passenger = !!params.passenger;
      launch.test = !!params.test;
    }
    if (launch.test) {
      const track = buildTrack(TEST_SECTIONS, { loop: true, spriteDefs: WORLD_SPRITES });
      setState('race', { track, rng: createRng(newSeed()), god: launch.god });
    } else if (launch.section) setState('race', buildRaceParams(launch.passenger));
    else setState('title', {});
  },
  exit() {},
  update() {},
  render() {},
};
