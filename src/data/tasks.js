// Passenger tasks as data. `measure` names a generic check in
// game/passenger.js; per-stage values (index = stage 1..5) scale difficulty.
// `fits` picks sections by their data (curves, straights, traffic, theme).

/*
 * Task format:
 *   text      UI text; {target} / {kmh} / {limit} are replaced with the stage values
 *   measure   'timeAbove' | 'timeBelow' | 'driftTime' | 'multiplier' | 'overtakes' | 'noHits' | 'offRoadTime'
 *   target    per-stage goal (seconds, count or multiplier); omitted for noHits / offRoadTime
 *   kmh       per-stage speed threshold (timeAbove / timeBelow)
 *   limit     per-stage allowance (offRoadTime, seconds)
 *   fits      { minCurviness?, minStraight?, minDensity?, themes? } section requirements
 */
export const TASKS = {
  speed: {
    text: 'FLOOR IT! {target} S OVER {kmh} KM/H',
    measure: 'timeAbove',
    target: [6, 7, 8, 9, 10],
    kmh: [200, 210, 220, 230, 240],
    fits: { minStraight: 150 },
  },
  scenic: {
    text: 'LOOK AT THAT VIEW! {target} S UNDER {kmh} KM/H',
    measure: 'timeBelow',
    target: [4, 4, 5, 5, 6],
    kmh: [130, 130, 120, 120, 110],
    fits: { themes: ['coastDay', 'pineDusk'] },
  },
  drift: {
    text: 'SHOW ME A DRIFT! {target} S SIDEWAYS',
    measure: 'driftTime',
    target: [2, 3, 4, 5, 6],
    fits: { minCurviness: 1.2 },
  },
  combo: {
    text: 'DRIFT COMBO X{target}, PLEASE!',
    measure: 'multiplier',
    target: [2, 2, 3, 3, 4],
    fits: { minCurviness: 1.5 },
  },
  overtake: {
    text: 'PASS {target} CARS!',
    measure: 'overtakes',
    target: [4, 5, 6, 7, 8],
    fits: { minDensity: 0.4 },
  },
  clean: {
    text: 'NO BUMPS THIS TIME!',
    measure: 'noHits',
    fits: {},
  },
  onRoad: {
    text: 'KEEP IT ON THE ROAD!',
    measure: 'offRoadTime',
    limit: [2, 1.6, 1.3, 1, 0.8],
    fits: {},
  },
};

/** What the passenger says after a task, a crash and at the start. */
export const PASSENGER_LINES = {
  hello: 'READY FOR A ROAD TRIP?',
  success: 'YES! THAT WAS GREAT!',
  fail: 'OH... NEVER MIND.',
  crash: 'ARE YOU TRYING TO SCARE ME?',
};
