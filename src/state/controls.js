// CONTROLS screen: every rebindable action with its two keys and its fixed
// gamepad button. ENTER on a key slot waits for a new key (ESC cancels, DEL
// clears); a key moves off any other action that used it. Saved at once.

import { CONFIG } from '../config.js';
import { TEXT, ACTION_NAMES, PAD_NAMES } from '../data/text.js';
import { STORE, saveStore } from '../storage.js';
import { REBINDABLE, KEY_SLOTS, DEFAULT_KEYS, normalizeBindings, assignKey, keyLabel } from '../engine/input.js';
import { setState } from './machine.js';
import { centered, outlined, panel } from '../render/ui.js';
import { drawText, GLYPH_ADVANCE } from '../render/font.js';

const ROWS = REBINDABLE.length + 1; // + reset
const COLS = { name: 16, key: [124, 180], pad: 244 };
const view = { row: 0, col: 0, capturing: false, labels: [], keys: null, blink: 0 };

/** Rebuilds the key label strings (only when bindings change). */
function refreshLabels() {
  view.labels = REBINDABLE.map((a) => view.keys[a].map(keyLabel));
}

/**
 * Handles a captured key for the selected slot (pure on `keys`).
 * @param {Object<string, (string|null)[]>} keys
 * @param {string} action
 * @param {number} slot
 * @param {string} code KeyboardEvent.code
 * @returns {boolean} true when the bindings changed
 */
export function applyCapturedKey(keys, action, slot, code) {
  if (code === 'Escape') return false;
  assignKey(keys, action, slot, code === 'Delete' ? null : code);
  return true;
}

function commit(input) {
  STORE.data.settings.keys = normalizeBindings(view.keys);
  saveStore(STORE);
  input.setBindings(STORE.data.settings.keys);
  refreshLabels();
}

function startCapture(input) {
  const action = REBINDABLE[view.row];
  const slot = view.col;
  view.capturing = true;
  input.captureKey((code) => {
    view.capturing = false;
    if (applyCapturedKey(view.keys, action, slot, code)) commit(input);
  });
}

export const controlsState = {
  enter() {
    view.keys = normalizeBindings(STORE.data.settings.keys);
    view.row = 0;
    view.col = 0;
    view.capturing = false;
    refreshLabels();
  },
  exit() {},
  update(dt, input) {
    view.blink += dt;
    if (view.capturing) {
      // Gamepad B cancels a capture that only a keyboard can finish.
      if (input.wasPressed('back')) {
        input.captureKey(null);
        view.capturing = false;
      }
      return;
    }
    if (input.wasPressed('back')) {
      setState('menu', {});
      return;
    }
    if (input.wasPressed('up')) view.row = (view.row + ROWS - 1) % ROWS;
    if (input.wasPressed('down')) view.row = (view.row + 1) % ROWS;
    if (input.wasPressed('menuLeft') || input.wasPressed('menuRight')) view.col = (view.col + 1) % KEY_SLOTS;
    if (!input.wasPressed('confirm')) return;
    if (view.row === REBINDABLE.length) {
      view.keys = normalizeBindings(DEFAULT_KEYS);
      commit(input);
    } else {
      startCapture(input);
    }
  },
  render(ctx) {
    const c = CONFIG.hud.colors;
    const { width, height } = CONFIG.screen;
    ctx.fillStyle = c.panel;
    ctx.fillRect(0, 0, width, height);
    panel(ctx, 6, 26, width - 12, 150);
    centered(ctx, TEXT.controlsTitle, 6, c.logoA, 2);
    drawText(ctx, TEXT.colAction, COLS.name, 30, c.logoB);
    drawText(ctx, TEXT.colKey1, COLS.key[0], 30, c.logoB);
    drawText(ctx, TEXT.colKey2, COLS.key[1], 30, c.logoB);
    drawText(ctx, TEXT.colPad, COLS.pad, 30, c.logoB);
    const lh = 12;
    for (let r = 0; r < REBINDABLE.length; r++) {
      const y = 44 + r * lh;
      const a = REBINDABLE[r];
      const sel = r === view.row;
      drawText(ctx, ACTION_NAMES[a], COLS.name, y, sel ? c.select : c.text);
      for (let k = 0; k < KEY_SLOTS; k++) {
        const active = sel && k === view.col;
        if (active) {
          ctx.fillStyle = view.capturing ? c.logoA : c.dim;
          ctx.fillRect(COLS.key[k] - 2, y - 2, 7 * GLYPH_ADVANCE + 3, 11);
        }
        drawText(ctx, view.labels[r][k], COLS.key[k], y, active ? c.select : c.text);
      }
      drawText(ctx, PAD_NAMES[a], COLS.pad, y, c.dim);
    }
    const resetY = 44 + REBINDABLE.length * lh + 2;
    outlined(ctx, TEXT.resetKeys, COLS.name, resetY, view.row === REBINDABLE.length ? c.select : c.text);
    centered(ctx, TEXT.menuKeysNote, 184, c.dim, 1);
    centered(ctx, TEXT.touchNote, 196, c.dim, 1);
    const hint = view.capturing ? TEXT.pressKey : TEXT.controlsHint;
    if (!view.capturing || Math.floor(view.blink / CONFIG.title.blinkInterval) % 2 === 0) centered(ctx, hint, 214, c.select, 1);
  },
};
