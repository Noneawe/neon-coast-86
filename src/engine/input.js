// Maps keyboard and gamepad (standard mapping) to game actions. Game logic
// reads only actions (isDown / wasPressed / value / steer), never raw devices.

import { CONFIG } from '../config.js';

export const ACTIONS = [
  'accelerate', 'brake', 'left', 'right', 'up', 'down', 'menuLeft', 'menuRight', 'drift', 'gearToggle',
  'radioNext', 'pause', 'confirm', 'back', 'debugToggle', 'fullscreen',
];

/** Menu and debug keys are fixed, so menus stay usable whatever the player rebinds. */
export const FIXED_KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  menuLeft: ['ArrowLeft'],
  menuRight: ['ArrowRight'],
  confirm: ['Enter', 'NumpadEnter', 'Space'],
  back: ['Escape', 'Backspace'],
  debugToggle: ['F1'],
};

/** Driving actions the player can rebind, in the order shown on the CONTROLS screen. */
export const REBINDABLE = ['accelerate', 'brake', 'left', 'right', 'drift', 'gearToggle', 'radioNext', 'pause', 'fullscreen'];

/** Keys per rebindable action. */
export const KEY_SLOTS = 2;

/** Default keys (KeyboardEvent.code) per rebindable action; null = empty slot. */
export const DEFAULT_KEYS = {
  accelerate: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  drift: ['Space', null],
  gearToggle: ['ShiftLeft', 'KeyQ'],
  radioNext: ['KeyR', null],
  pause: ['KeyP', 'Escape'],
  fullscreen: ['KeyF', null],
};

const CODE_RE = /^[A-Za-z0-9]{1,24}$/;

/**
 * Validated copy of saved key bindings; unknown or broken entries fall back to the defaults.
 * @param {any} raw
 * @returns {Object<string, (string|null)[]>}
 */
export function normalizeBindings(raw) {
  const out = {};
  for (const a of REBINDABLE) {
    const r = raw && Array.isArray(raw[a]) ? raw[a] : DEFAULT_KEYS[a];
    out[a] = [];
    for (let i = 0; i < KEY_SLOTS; i++) out[a].push(typeof r[i] === 'string' && CODE_RE.test(r[i]) ? r[i] : null);
  }
  return out;
}

/**
 * Puts `code` into one slot of an action; the same key is removed from every
 * other rebindable action so one key never drives two things. null clears the slot.
 * @param {Object<string, (string|null)[]>} keys
 * @param {string} action
 * @param {number} slot
 * @param {string|null} code
 */
export function assignKey(keys, action, slot, code) {
  if (code) {
    for (const a of REBINDABLE) {
      for (let i = 0; i < KEY_SLOTS; i++) if (keys[a][i] === code) keys[a][i] = null;
    }
  }
  keys[action][slot] = code;
}

/**
 * KeyboardEvent.code → actions, from the fixed keys plus the player's bindings.
 * @param {Object<string, (string|null)[]>} keys
 * @returns {Object<string, string[]>}
 */
export function buildKeyMap(keys) {
  const map = {};
  const add = (code, action) => {
    if (!code) return;
    (map[code] = map[code] || []).push(action);
  };
  for (const [action, codes] of Object.entries(FIXED_KEYS)) for (const c of codes) add(c, action);
  for (const a of REBINDABLE) for (const c of keys[a]) add(c, a);
  return map;
}

const KEY_NAMES = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Space: 'SPACE',
  ShiftLeft: 'LSHIFT', ShiftRight: 'RSHIFT', ControlLeft: 'LCTRL', ControlRight: 'RCTRL',
  AltLeft: 'LALT', AltRight: 'RALT', Escape: 'ESC', Enter: 'ENTER', Backspace: 'BKSP', Tab: 'TAB',
  NumpadEnter: 'NENTER', CapsLock: 'CAPS',
};

/**
 * Short uppercase name of a key for the CONTROLS screen ('KeyW' → 'W', 'ArrowUp' → 'UP').
 * @param {string|null} code
 * @returns {string}
 */
export function keyLabel(code) {
  if (!code) return '-';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  const m = /^(?:Key|Digit)(.)$/.exec(code);
  if (m) return m[1];
  if (/^Numpad\d$/.test(code)) return 'NUM' + code.slice(6);
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

/** Action → standard-mapping gamepad button indices. */
export const PAD_BUTTONS = {
  accelerate: [0, 7], // A, RT
  brake: [1, 6],      // B, LT
  left: [14],         // D-pad left
  right: [15],        // D-pad right
  up: [12],           // D-pad up (menus)
  down: [13],         // D-pad down (menus)
  menuLeft: [14],     // D-pad left (menus)
  menuRight: [15],    // D-pad right (menus)
  drift: [2],         // X
  gearToggle: [3, 4], // Y, LB
  radioNext: [5],     // RB
  pause: [9],         // Start
  confirm: [0],       // A
  back: [1],          // B
  debugToggle: [],
  fullscreen: [8],    // Back / Select
};

/** Left stick axes in the standard mapping. */
const PAD_STEER_AXIS = 0;
const PAD_VERTICAL_AXIS = 1;

const NO_PADS = [];

function defaultGetPads() {
  try {
    return navigator.getGamepads ? navigator.getGamepads() : NO_PADS;
  } catch (e) {
    return NO_PADS;
  }
}

/**
 * Applies a dead zone and rescales the remaining range to 0..1.
 * @param {number} v raw axis value -1..1
 * @param {number} dz dead zone 0..1
 * @returns {number}
 */
export function applyDeadzone(v, dz) {
  const a = Math.abs(v);
  if (a <= dz) return 0;
  const r = Math.min(1, (a - dz) / (1 - dz));
  return v < 0 ? -r : r;
}

function makeActionTable(value) {
  const t = {};
  for (const a of ACTIONS) t[a] = value;
  return t;
}

function createState(getPads, touch) {
  return {
    getPads,
    touch,
    keyMap: buildKeyMap(DEFAULT_KEYS),
    capture: null,     // callback waiting for the next key (rebinding)
    held: makeActionTable(0),
    pressed: makeActionTable(false),
    padNow: makeActionTable(false),
    padPrev: makeActionTable(false),
    padValue: makeActionTable(0),
    keys: {},
    pad: { connected: false, id: '', stick: 0, dpad: 0 },
  };
}

function keyDown(s, e) {
  if (s.capture) {
    if (e.preventDefault) e.preventDefault();
    const cb = s.capture;
    s.capture = null;
    cb(e.code);
    return;
  }
  const actions = s.keyMap[e.code];
  if (!actions) return;
  if (e.preventDefault) e.preventDefault();
  if (s.keys[e.code]) return;
  s.keys[e.code] = true;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    s.held[a]++;
    if (s.held[a] === 1 && !s.padNow[a]) s.pressed[a] = true;
  }
}

function keyUp(s, e) {
  const actions = s.keyMap[e.code];
  if (!actions) return;
  if (e.preventDefault) e.preventDefault();
  if (!s.keys[e.code]) return;
  s.keys[e.code] = false;
  for (let i = 0; i < actions.length; i++) {
    if (s.held[actions[i]] > 0) s.held[actions[i]]--;
  }
}

function resetState(s) {
  for (const code in s.keys) s.keys[code] = false;
  for (const a of ACTIONS) {
    s.held[a] = 0;
    s.pressed[a] = false;
  }
}

function readButtons(s, gp) {
  const { triggerThreshold } = CONFIG.input;
  for (let i = 0; i < ACTIONS.length; i++) {
    const a = ACTIONS[i];
    const idx = PAD_BUTTONS[a];
    for (let j = 0; j < idx.length; j++) {
      const b = gp.buttons[idx[j]];
      if (!b) continue;
      const v = typeof b.value === 'number' && b.value > 0 ? b.value : b.pressed ? 1 : 0;
      if (b.pressed || v >= triggerThreshold) s.padNow[a] = true;
      if (v > s.padValue[a]) s.padValue[a] = v;
    }
  }
  const bl = gp.buttons[PAD_BUTTONS.left[0]];
  const br = gp.buttons[PAD_BUTTONS.right[0]];
  if (bl && bl.pressed) s.pad.dpad -= 1;
  if (br && br.pressed) s.pad.dpad += 1;
}

function readSticks(s, gp) {
  const { stickDeadzone, stickDigital } = CONFIG.input;
  const axes = gp.axes || [];
  const raw = axes.length > PAD_STEER_AXIS ? axes[PAD_STEER_AXIS] : 0;
  const st = applyDeadzone(raw, stickDeadzone);
  if (Math.abs(st) > Math.abs(s.pad.stick)) s.pad.stick = st;
  if (raw <= -stickDigital) s.padNow.left = s.padNow.menuLeft = true;
  if (raw >= stickDigital) s.padNow.right = s.padNow.menuRight = true;
  const vert = axes.length > PAD_VERTICAL_AXIS ? axes[PAD_VERTICAL_AXIS] : 0;
  if (vert <= -stickDigital) s.padNow.up = true;
  if (vert >= stickDigital) s.padNow.down = true;
}

function pollPads(s) {
  for (let i = 0; i < ACTIONS.length; i++) {
    s.padNow[ACTIONS[i]] = false;
    s.padValue[ACTIONS[i]] = 0;
  }
  s.pad.stick = 0;
  s.pad.dpad = 0;
  s.pad.connected = false;
  const pads = s.getPads();
  for (let i = 0; i < pads.length; i++) {
    const gp = pads[i];
    if (!gp || !gp.connected) continue;
    if (!s.pad.connected) s.pad.id = gp.id;
    s.pad.connected = true;
    readButtons(s, gp);
    readSticks(s, gp);
  }
  if (s.touch && s.touch.active) readTouch(s, s.touch);
  for (let i = 0; i < ACTIONS.length; i++) {
    const a = ACTIONS[i];
    if (s.padNow[a] && !s.padPrev[a] && s.held[a] === 0) s.pressed[a] = true;
    s.padPrev[a] = s.padNow[a];
  }
}

/** Touch controls act like one more gamepad (see engine/touch.js). */
function readTouch(s, t) {
  for (let i = 0; i < ACTIONS.length; i++) {
    const a = ACTIONS[i];
    if (!t.down[a]) continue;
    s.padNow[a] = true;
    s.padValue[a] = 1;
  }
  if (Math.abs(t.steer) > Math.abs(s.pad.stick)) s.pad.stick = t.steer;
}

function steerValue(s) {
  const digital = (s.held.right > 0 ? 1 : 0) - (s.held.left > 0 ? 1 : 0) + s.pad.dpad;
  if (digital !== 0) return digital > 0 ? 1 : -1;
  return s.pad.stick;
}

/**
 * Attaches keyboard listeners to `target` and polls gamepads on poll().
 * Edge flags (wasPressed) stay set until endStep() runs after a fixed update.
 * @param {{addEventListener: Function}} target usually window
 * @param {() => ArrayLike<Gamepad|null>} [getPads] gamepad source (injectable for tests)
 * @param {object|null} [touch] touch state from engine/touch.js
 */
export function createInput(target, getPads = defaultGetPads, touch = null) {
  const s = createState(getPads, touch);
  const onKeyDown = (e) => keyDown(s, e);
  const onKeyUp = (e) => keyUp(s, e);
  const reset = () => resetState(s);
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', reset);
  return {
    isDown: (a) => s.held[a] > 0 || s.padNow[a],
    wasPressed: (a) => s.pressed[a],
    /** Analog amount 0..1 (keys give 1, triggers give their pressure). */
    value: (a) => (s.held[a] > 0 ? 1 : s.padValue[a]),
    /** Steer -1..1: keys / D-pad give full lock, otherwise the analog stick value. */
    steer: () => steerValue(s),
    pad: s.pad,
    /** Polls all connected gamepads; call once per fixed step before reading actions. */
    poll: () => pollPads(s),
    endStep: () => {
      for (let i = 0; i < ACTIONS.length; i++) s.pressed[ACTIONS[i]] = false;
    },
    reset,
    onKeyDown,
    onKeyUp,
    /**
     * Replaces the player's key bindings (validated; held keys are released).
     * @param {Object<string, (string|null)[]>} keys
     */
    setBindings: (keys) => {
      s.keyMap = buildKeyMap(normalizeBindings(keys));
      resetState(s);
    },
    /**
     * Sends the next key press to `cb(code)` instead of the game (rebinding).
     * @param {((code:string)=>void)|null} cb null cancels
     */
    captureKey: (cb) => {
      s.capture = cb;
    },
  };
}
