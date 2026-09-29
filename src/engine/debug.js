// Debug switch and logger. debugLog() prints only when the game was started
// with ?debug=1, so production runs stay silent.

let enabled = false;

/**
 * @param {boolean} on
 */
export function setDebugEnabled(on) {
  enabled = !!on;
}

/**
 * @param {...any} args
 */
export function debugLog(...args) {
  if (enabled) console.log('[debug]', ...args);
}
