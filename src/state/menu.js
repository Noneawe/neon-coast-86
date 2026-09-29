// Main menu: start, mode (normal / passenger), radio song with preview,
// three volume sliders, key bindings and how-to-play pages. Works with
// keyboard and gamepad through actions; settings are saved when they change.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { STORE, saveStore } from '../storage.js';
import { setState } from './machine.js';
import { buildRaceParams } from './boot.js';
import { drawLogo, drawList, panel, centered } from '../render/ui.js';
import { renderSky } from '../render/sky.js';
import { radioSelect, radioOn, songNames } from '../audio/sfx.js';
import { setChannelVolume } from '../audio/mixer.js';

export const MENU_ITEMS = ['start', 'mode', 'radio', 'music', 'sfx', 'engine', 'controls', 'help', 'back'];
const LABELS = [TEXT.menuStart, TEXT.menuMode, TEXT.menuRadio, TEXT.menuMusic, TEXT.menuSfx, TEXT.menuEngine,
  TEXT.menuControls, TEXT.menuHelp, TEXT.menuBack];
const VOLUMES = ['music', 'sfx', 'engine'];
const BG_OFFSETS = [0, 0, 0];

/**
 * @param {{passenger:boolean, radio:number, music:number, sfx:number, engine:number}} settings
 * @returns {{cursor:number, passenger:boolean, radio:number, music:number, sfx:number, engine:number, values:(string|null)[]}}
 */
export function createMenu(settings) {
  const m = { cursor: 0, passenger: settings.passenger, radio: settings.radio % songNames().length,
    music: settings.music, sfx: settings.sfx, engine: settings.engine, values: [] };
  refreshValues(m);
  return m;
}

/** Rebuilds the value strings (only when something changes, never per frame). */
function refreshValues(m) {
  const steps = CONFIG.menu.volumeSteps;
  m.values = [null, m.passenger ? TEXT.modePassenger : TEXT.modeNormal, songNames()[m.radio],
    String(Math.round((m.music / steps) * 100)), String(Math.round((m.sfx / steps) * 100)),
    String(Math.round((m.engine / steps) * 100)), null, null, null];
}

function change(m, id, dir) {
  const steps = CONFIG.menu.volumeSteps;
  if (id === 'mode') m.passenger = !m.passenger;
  else if (id === 'radio') m.radio = (m.radio + dir + songNames().length) % songNames().length;
  else if (VOLUMES.includes(id)) m[id] = Math.max(0, Math.min(steps, m[id] + dir));
  else return false;
  refreshValues(m);
  return true;
}

/** Items that open another screen when confirmed. */
const LINKS = ['start', 'back', 'controls', 'help'];

/**
 * Applies one step of menu input. Returns 'start', 'back', 'controls', 'help', the id of a changed item, or ''.
 * @param {object} m menu model
 * @param {{wasPressed:(a:string)=>boolean}} input
 * @returns {string}
 */
export function menuStep(m, input) {
  const n = MENU_ITEMS.length;
  if (input.wasPressed('up')) m.cursor = (m.cursor + n - 1) % n;
  if (input.wasPressed('down')) m.cursor = (m.cursor + 1) % n;
  const id = MENU_ITEMS[m.cursor];
  if (input.wasPressed('back')) return 'back';
  if ((input.wasPressed('left') || input.wasPressed('menuLeft')) && change(m, id, -1)) return id;
  if ((input.wasPressed('right') || input.wasPressed('menuRight')) && change(m, id, 1)) return id;
  if (input.wasPressed('confirm')) {
    if (LINKS.includes(id)) return id;
    if (change(m, id, 1)) return id;
  }
  return '';
}

/**
 * Copies menu values into the stored settings.
 * @param {object} m
 * @param {object} settings
 */
export function applySettings(m, settings) {
  settings.passenger = m.passenger;
  settings.radio = m.radio;
  for (const v of VOLUMES) settings[v] = m[v];
}

let menu = null;

export const menuState = {
  enter() {
    const keepCursor = menu ? menu.cursor : 0;
    menu = createMenu(STORE.data.settings);
    menu.cursor = keepCursor;
    radioSelect(menu.radio);
    radioOn();
  },
  exit() {},
  update(dt, input) {
    const act = menuStep(menu, input);
    if (!act) return;
    if (act === 'back') {
      setState('title', {});
      return;
    }
    if (act === 'controls' || act === 'help') {
      setState(act, {});
      return;
    }
    applySettings(menu, STORE.data.settings);
    saveStore(STORE);
    if (act === 'start') setState('race', buildRaceParams(menu.passenger));
    else if (act === 'radio') radioSelect(menu.radio);
    else if (VOLUMES.includes(act)) setChannelVolume(act, menu[act] / CONFIG.menu.volumeSteps);
  },
  render(ctx) {
    renderSky(ctx, 'pineDusk', 'pineDusk', 1, BG_OFFSETS);
    drawLogo(ctx, 16);
    panel(ctx, 50, 74, 220, 128);
    drawList(ctx, LABELS, menu.values, menu.cursor, 80, 150);
    centered(ctx, TEXT.menuHint, 212, CONFIG.hud.colors.dim, 1);
  },
};
