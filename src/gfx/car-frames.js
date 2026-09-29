// Generates player car turn frames from the straight ASCII sprite: upper rows
// shift toward the turn and a side panel appears on the outer edge. Pure data
// in, data out, so it can be tested without a canvas.

import { CONFIG } from '../config.js';

/** Number of turn frames on each side. */
export const TURN_LEVELS = 3;

function edges(row) {
  let l = -1;
  let r = -1;
  for (let i = 0; i < row.length; i++) {
    if (row[i] !== '.') {
      if (l < 0) l = i;
      r = i;
    }
  }
  return [l, r];
}

/**
 * Builds one frame. level < 0 turns left (shows the right flank), level > 0 turns right.
 * @param {string[]} rows base sprite
 * @param {number} level -TURN_LEVELS..TURN_LEVELS
 * @param {[number, number]} bodyRows inclusive row range receiving the side panel
 * @param {number} pad horizontal padding added on both sides
 * @param {number} [turnShear] top-row shift per level (px), default player setting
 * @param {number} [turnSidePx] side panel width per level (px), default player setting
 * @param {string} [sideChar] sprite character used for the side panel
 * @returns {string[]}
 */
export function buildTurnFrame(rows, level, bodyRows, pad,
  turnShear = CONFIG.player.turnShear, turnSidePx = CONFIG.player.turnSidePx, sideChar = 'r') {
  const h = rows.length;
  const dir = Math.sign(level);
  const k = Math.abs(level);
  const out = [];
  for (let y = 0; y < h; y++) {
    const cells = new Array(rows[y].length + 2 * pad).fill('.');
    const shift = dir * Math.round(k * turnShear * (h - 1 - y) / (h - 1));
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== '.') cells[x + pad + shift] = rows[y][x];
    }
    if (k > 0 && y >= bodyRows[0] && y <= bodyRows[1]) {
      const [l, r] = edges(cells);
      const side = k * turnSidePx;
      for (let i = 1; i <= side; i++) {
        // Turning left shows the right flank and vice versa.
        const x = dir < 0 ? r + i : l - i;
        if (x >= 0 && x < cells.length) cells[x] = sideChar;
      }
    }
    out.push(cells.join(''));
  }
  return out;
}

/**
 * All frames ordered from full left to full right (index TURN_LEVELS = straight).
 * @param {string[]} rows
 * @param {[number, number]} bodyRows
 * @returns {string[][]}
 */
export function buildCarFrames(rows, bodyRows) {
  const { turnShear, turnSidePx } = CONFIG.player;
  const pad = Math.ceil(TURN_LEVELS * turnShear) + TURN_LEVELS * turnSidePx;
  const frames = [];
  for (let level = -TURN_LEVELS; level <= TURN_LEVELS; level++) {
    frames.push(buildTurnFrame(rows, level, bodyRows, pad));
  }
  return frames;
}

/**
 * Side-view frames for a traffic vehicle: levels -n..n (no shear, side panel only).
 * @param {string[]} rows
 * @param {[number, number]} bodyRows
 * @param {number} levels frames per side
 * @param {number} sidePx side panel width per level
 * @returns {string[][]} ordered from most-left-of-screen to most-right-of-screen
 */
export function buildVehicleFrames(rows, bodyRows, levels, sidePx) {
  const pad = levels * sidePx;
  const frames = [];
  for (let level = -levels; level <= levels; level++) {
    frames.push(buildTurnFrame(rows, level, bodyRows, pad, 0, sidePx, 'b'));
  }
  return frames;
}

/**
 * Maps visual steer -1..1 to a frame index 0..2*TURN_LEVELS.
 * @param {number} steer
 * @returns {number}
 */
export function steerFrameIndex(steer) {
  const t = CONFIG.player.steerFrameThresholds;
  const a = Math.abs(steer);
  let level = 0;
  for (let i = 0; i < t.length; i++) if (a >= t[i]) level = i + 1;
  return TURN_LEVELS + (steer < 0 ? -level : level);
}
