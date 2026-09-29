// Touch controls: fingers on the canvas are mapped to 320×240 buffer
// coordinates and then to actions (on-screen buttons) and an analog steer
// value (steering pad). Read by engine/input.js like one more gamepad.

import { CONFIG } from '../config.js';
import { ACTIONS } from './input.js';

const MAX_POINTS = 10;

/**
 * Converts a client (CSS pixel) position to buffer coordinates.
 * @param {number} clientX
 * @param {number} clientY
 * @param {{left:number, top:number, width:number, height:number}} rect canvas bounding rect
 * @param {{x:number, y:number}} out
 */
export function toBuffer(clientX, clientY, rect, out) {
  out.x = ((clientX - rect.left) / rect.width) * CONFIG.screen.width;
  out.y = ((clientY - rect.top) / rect.height) * CONFIG.screen.height;
}

/** @returns {object} touch state (points pool, resolved actions, steer) */
export function createTouchState() {
  const down = {};
  for (const a of ACTIONS) down[a] = false;
  const points = [];
  for (let i = 0; i < MAX_POINTS; i++) points.push({ id: -1, x: 0, y: 0 });
  return { enabled: false, active: false, points, down, steer: 0, pressedButtons: {} };
}

/**
 * Resolves the current finger positions into actions and steer (pure).
 * @param {object} t touch state
 */
export function resolveTouches(t) {
  const { buttons, steer: pad } = CONFIG.touch;
  for (const a of ACTIONS) t.down[a] = false;
  for (const b of buttons) t.pressedButtons[b.id] = false;
  t.steer = 0;
  t.active = false;
  for (const p of t.points) {
    if (p.id < 0) continue;
    t.active = true;
    let used = false;
    for (const b of buttons) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      if (dx * dx + dy * dy > b.r * b.r) continue;
      used = true;
      t.pressedButtons[b.id] = true;
      for (const a of b.actions) t.down[a] = true;
    }
    if (used) continue;
    const sx = (p.x - pad.x) / pad.radius;
    const sy = (p.y - pad.y) / pad.radius;
    if (Math.abs(sx) > 1.5 || Math.abs(sy) > 1.5) continue;
    const s = Math.max(-1, Math.min(1, sx));
    t.steer = Math.abs(s) < pad.deadzone ? 0 : s;
    if (sx <= -pad.vertical) t.down.left = t.down.menuLeft = true;
    if (sx >= pad.vertical) t.down.right = t.down.menuRight = true;
    if (sy <= -pad.vertical) t.down.up = true;
    if (sy >= pad.vertical) t.down.down = true;
  }
}

function findPoint(t, id) {
  for (const p of t.points) if (p.id === id) return p;
  return null;
}

/**
 * Registers touch listeners on the canvas. `onFirstTouch` runs on the first
 * touch (a user gesture: fullscreen, audio unlock).
 * @param {HTMLCanvasElement} canvas
 * @param {object} t touch state
 * @param {()=>void} [onFirstTouch]
 */
export function attachTouch(canvas, t, onFirstTouch) {
  const tmp = { x: 0, y: 0 };
  const update = (e) => {
    e.preventDefault();
    if (!t.enabled && onFirstTouch) onFirstTouch();
    t.enabled = true;
    const rect = canvas.getBoundingClientRect();
    for (const p of t.points) p.id = -1;
    for (let i = 0; i < e.touches.length && i < MAX_POINTS; i++) {
      const touch = e.touches[i];
      toBuffer(touch.clientX, touch.clientY, rect, tmp);
      const p = findPoint(t, -1);
      p.id = touch.identifier;
      p.x = tmp.x;
      p.y = tmp.y;
    }
    resolveTouches(t);
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    canvas.addEventListener(type, update, { passive: false });
  }
}

/**
 * True on devices that report a coarse pointer (phones, tablets).
 * @returns {boolean}
 */
export function isTouchDevice() {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  } catch (e) {
    return false;
  }
}
