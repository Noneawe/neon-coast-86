// Game state machine. States expose enter(params), exit(), update(dt, input)
// and render(ctx, alpha); transitions happen only through setState().

const states = {};
const NO_PARAMS = Object.freeze({});
let current = null;
let currentName = '';

/**
 * @param {string} name
 * @param {{enter:Function, exit:Function, update:Function, render:Function, debugLines?:Function}} state
 */
export function registerState(name, state) {
  states[name] = state;
}

/**
 * @param {string} name
 * @param {object} [params]
 */
export function setState(name, params) {
  const next = states[name];
  if (!next) throw new Error(`Unknown state: ${name}`);
  if (current) current.exit();
  current = next;
  currentName = name;
  current.enter(params || NO_PARAMS);
}

/**
 * @param {number} dt
 * @param {object} input
 */
export function updateState(dt, input) {
  if (current) current.update(dt, input);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} alpha
 */
export function renderState(ctx, alpha) {
  if (current) current.render(ctx, alpha);
}

/** @returns {string} */
export function getStateName() {
  return currentName;
}

/** @returns {object|null} */
export function getState() {
  return current;
}
