// Arcade-style name entry for a new highscore: UP/DOWN pick a letter,
// LEFT/RIGHT move, ENTER goes to the next letter and saves on the last one.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { STORE, addHighscore, saveStore } from '../storage.js';
import { setState } from './machine.js';
import { centered, outlined, textWidth } from '../render/ui.js';
import { drawNumber } from '../render/font.js';
import { renderSky } from '../render/sky.js';

const BG_OFFSETS = [0, 0, 0];
const entry = { chars: [], cursor: 0, score: 0, goal: '', passenger: false, time: 0 };

/**
 * One step of name editing; returns true when the name is confirmed.
 * @param {{chars:number[], cursor:number}} e letter indices into CONFIG.highscores.charset
 * @param {{wasPressed:(a:string)=>boolean}} input
 * @returns {boolean}
 */
export function nameStep(e, input) {
  const n = CONFIG.highscores.charset.length;
  const last = e.chars.length - 1;
  if (input.wasPressed('up')) e.chars[e.cursor] = (e.chars[e.cursor] + 1) % n;
  if (input.wasPressed('down')) e.chars[e.cursor] = (e.chars[e.cursor] + n - 1) % n;
  if (input.wasPressed('left') || input.wasPressed('menuLeft') || input.wasPressed('back')) e.cursor = Math.max(0, e.cursor - 1);
  if (input.wasPressed('right') || input.wasPressed('menuRight')) e.cursor = Math.min(last, e.cursor + 1);
  if (input.wasPressed('confirm')) {
    if (e.cursor === last) return true;
    e.cursor++;
  }
  return false;
}

/**
 * @param {number[]} chars
 * @returns {string}
 */
export function nameOf(chars) {
  return chars.map((i) => CONFIG.highscores.charset[i]).join('');
}

/**
 * @param {string} name
 * @returns {number[]}
 */
export function charsOf(name) {
  const set = CONFIG.highscores.charset;
  return name.split('').map((ch) => Math.max(0, set.indexOf(ch)));
}

let label = '';

export const nameEntryState = {
  /** @param {{score:number, goal:string, passenger:boolean}} params */
  enter(params) {
    entry.chars = charsOf(STORE.data.settings.lastName);
    entry.cursor = 0;
    entry.score = params.score;
    entry.goal = params.goal || '';
    entry.passenger = !!params.passenger;
    entry.time = 0;
    label = nameOf(entry.chars);
  },
  exit() {},
  update(dt, input) {
    entry.time += dt;
    const done = nameStep(entry, input);
    label = nameOf(entry.chars);
    if (!done) return;
    STORE.data.settings.lastName = label;
    const rank = addHighscore(STORE, { name: label, score: entry.score, goal: entry.goal, passenger: entry.passenger });
    saveStore(STORE);
    setState('title', { highlight: rank });
  },
  render(ctx) {
    const c = CONFIG.hud.colors;
    renderSky(ctx, 'pineDusk', 'pineDusk', 1, BG_OFFSETS);
    centered(ctx, TEXT.nameEntry, 40, c.select, 2);
    const sw = textWidth('00000000', 2);
    drawNumber(ctx, entry.score, 8, Math.round((CONFIG.screen.width - sw) / 2), 70, c.text, 2);
    const w = textWidth(label, 4);
    const x = Math.round((CONFIG.screen.width - w) / 2);
    outlined(ctx, label, x, 110, c.logoA, 4, c.logoB);
    if (Math.floor(entry.time / CONFIG.title.blinkInterval) % 2 === 0) {
      ctx.fillStyle = c.select;
      ctx.fillRect(x + entry.cursor * 24, 142, 20, 3);
    }
    centered(ctx, TEXT.nameHint, 170, c.dim, 1);
    if (!STORE.available) centered(ctx, TEXT.noSave, 190, c.warn, 1);
  },
};
