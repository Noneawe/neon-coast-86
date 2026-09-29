// In-race HUD: speed, gear, tachometer, countdown, stage and section name,
// race messages and the route mini-map. Draws only; values come from the
// player and race objects.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { RACE_RUNNING, RACE_TIME_UP } from '../game/race.js';
import { drawText, drawNumber, GLYPH_H, GLYPH_ADVANCE } from './font.js';
import { HEART_ROWS } from '../gfx/hud-icons.js';
import { taskProgress } from '../game/passenger.js';

// Outline offsets (dx, dy pairs): text stays readable over any road colour.
const OUTLINE = [-1, 0, 1, 0, 0, -1, 0, 1, 1, 1];

function shadowText(ctx, text, x, y, color, scale) {
  for (let i = 0; i < OUTLINE.length; i += 2) {
    drawText(ctx, text, x + OUTLINE[i], y + OUTLINE[i + 1], CONFIG.hud.colors.shadow, scale);
  }
  drawText(ctx, text, x, y, color, scale);
}

function shadowNumber(ctx, value, digits, x, y, color, scale) {
  for (let i = 0; i < OUTLINE.length; i += 2) {
    drawNumber(ctx, value, digits, x + OUTLINE[i], y + OUTLINE[i + 1], CONFIG.hud.colors.shadow, scale);
  }
  drawNumber(ctx, value, digits, x, y, color, scale);
}

function drawSpeed(ctx, kmh, x, y) {
  const { speedScale, colors } = CONFIG.hud;
  shadowNumber(ctx, kmh, 3, x, y, colors.text, speedScale);
  const unitX = x + 3 * GLYPH_ADVANCE * speedScale + 2;
  shadowText(ctx, TEXT.kmh, unitX, y + GLYPH_H * (speedScale - 1), colors.label, 1);
}

function drawGear(ctx, gear, x, y) {
  const c = CONFIG.hud.colors;
  shadowText(ctx, TEXT.low, x, y, gear === 'LOW' ? c.label : c.dim, 1);
  shadowText(ctx, TEXT.high, x + 4 * GLYPH_ADVANCE, y, gear === 'HIGH' ? c.label : c.dim, 1);
}

function drawTach(ctx, rpmPct, right, bottom) {
  const h = CONFIG.hud;
  const step = h.tachCellW + h.tachCellGap;
  const left = right - h.tachCells * step + h.tachCellGap;
  const lit = Math.round(rpmPct * h.tachCells);
  ctx.fillStyle = h.colors.shadow;
  ctx.fillRect(left - 1, bottom - h.tachCellH - 1, h.tachCells * step + 1, h.tachCellH + 2);
  for (let i = 0; i < h.tachCells; i++) {
    const f = (i + 1) / h.tachCells;
    let color = h.colors.tachOff;
    if (i < lit) color = f > h.tachRed ? h.colors.tachRed : f > h.tachYellow ? h.colors.tachYellow : h.colors.tachGreen;
    ctx.fillStyle = color;
    // Cells grow taller toward the red zone.
    const ch = Math.max(2, Math.round(h.tachCellH * (0.4 + 0.6 * f)));
    ctx.fillRect(left + i * step, bottom - ch, h.tachCellW, ch);
  }
  shadowText(ctx, TEXT.rpm, left, bottom - h.tachCellH - 2 - GLYPH_H, h.colors.label, 1);
}

/** HUD layout: with touch controls the dials move up, away from the thumbs. */
const layout = { touch: false };

/**
 * Switches the HUD between the default and the touch layout.
 * @param {boolean} on
 */
export function setTouchLayout(on) {
  layout.touch = !!on;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{speed:number, gear:string, rpm:number}} player
 */
export function drawHud(ctx, player) {
  const { width, height } = CONFIG.screen;
  const { margin, kmhPerUnit, speedScale } = CONFIG.hud;
  const p = CONFIG.player;
  const gearY = layout.touch ? CONFIG.touch.hudSpeedY : height - margin - GLYPH_H * speedScale - GLYPH_H - 4;
  const speedY = gearY + GLYPH_H + 4;
  drawSpeed(ctx, player.speed * kmhPerUnit, margin, speedY);
  drawGear(ctx, player.gear, margin, gearY);
  const rpmPct = (player.rpm - p.rpmIdle) / (p.rpmMax - p.rpmIdle);
  drawTach(ctx, rpmPct, width - margin, layout.touch ? CONFIG.touch.hudTachY : height - margin);
}

// ---------------------------------------------------------------- race HUD

/** Pixel width of `n` characters at `scale`. */
function textWidth(n, scale) {
  return (n * GLYPH_ADVANCE - 1) * scale;
}

function blinkOn(time) {
  return Math.floor(time / CONFIG.hud.blinkInterval) % 2 === 0;
}

function drawTimer(ctx, race) {
  const { width } = CONFIG.screen;
  const { timeScale, colors } = CONFIG.hud;
  shadowText(ctx, TEXT.time, (width - textWidth(TEXT.time.length, 1)) / 2, 4, colors.label, 1);
  const secs = Math.ceil(race.time);
  const low = secs <= CONFIG.race.lowTimeWarning && race.status === RACE_RUNNING;
  if (low && !blinkOn(race.elapsed)) return;
  shadowNumber(ctx, secs, 3, (width - textWidth(3, timeScale)) / 2, 13, low ? colors.warn : colors.text, timeScale);
}

function drawStage(ctx, race, sectionName) {
  const { margin, colors } = CONFIG.hud;
  shadowText(ctx, TEXT.stage, margin, 4, colors.label, 1);
  shadowNumber(ctx, race.stage, 1, margin + (TEXT.stage.length + 1) * GLYPH_ADVANCE, 4, colors.text, 1);
  shadowText(ctx, sectionName, margin, 13, colors.text, 1);
}

function drawScore(ctx, score) {
  const { margin, colors } = CONFIG.hud;
  shadowText(ctx, TEXT.score, margin, 24, colors.label, 1);
  const x = margin + (TEXT.score.length + 1) * GLYPH_ADVANCE;
  shadowNumber(ctx, score.total, 8, x, 24, colors.text, 1);
  if (score.multiplier > 1) {
    const mx = x + 9 * GLYPH_ADVANCE;
    shadowText(ctx, TEXT.times, mx, 24, colors.mapCurrent, 1);
    shadowNumber(ctx, score.multiplier, 1, mx + GLYPH_ADVANCE, 24, colors.mapCurrent, 1);
  }
}

/** Running drift (points and multiplier) or the last banked / lost drift. */
function drawDrift(ctx, score, player) {
  const c = CONFIG.hud.colors;
  const y = CONFIG.screen.height - 64;
  if (player.drift && player.driftTime > 0.1) {
    const n = 5 + 1 + 5 + 1 + 2;
    const x = (CONFIG.screen.width - textWidth(n, 1)) / 2;
    shadowText(ctx, TEXT.drift, x, y, c.label, 1);
    shadowNumber(ctx, score.driftPoints, 5, x + 6 * GLYPH_ADVANCE, y, c.text, 1);
    shadowText(ctx, TEXT.times, x + 12 * GLYPH_ADVANCE, y, c.mapCurrent, 1);
    shadowNumber(ctx, score.multiplier, 1, x + 13 * GLYPH_ADVANCE, y, c.mapCurrent, 1);
    return;
  }
  if (score.bankTimer <= 0) return;
  if (score.lastFailed) {
    centerText(ctx, TEXT.driftLost, y, c.warn, 1);
    return;
  }
  const x = (CONFIG.screen.width - textWidth(8, 2)) / 2;
  shadowText(ctx, '+', x, y - 4, c.label, 2);
  shadowNumber(ctx, score.lastBank, 7, x + GLYPH_ADVANCE * 2, y - 4, c.label, 2);
}

function centerText(ctx, text, y, color, scale) {
  shadowText(ctx, text, (CONFIG.screen.width - textWidth(text.length, scale)) / 2, y, color, scale);
}

function drawMessages(ctx, race) {
  const c = CONFIG.hud.colors;
  if (race.status === RACE_TIME_UP) {
    centerText(ctx, TEXT.timeUp, 80, c.warn, 3);
    return;
  }
  if (race.status !== RACE_RUNNING) {
    centerText(ctx, TEXT.goal, 80, c.label, 3);
    return;
  }
  if (race.messageTimer <= 0 || !blinkOn(race.messageTimer)) return;
  centerText(ctx, TEXT.checkpoint, 70, c.label, 2);
  const w = textWidth(TEXT.extended.length + 4, 1);
  const x = (CONFIG.screen.width - w) / 2;
  shadowText(ctx, TEXT.extended, x, 90, c.text, 1);
  const px = x + (TEXT.extended.length + 1) * GLYPH_ADVANCE;
  shadowText(ctx, '+', px, 90, c.text, 1);
  shadowNumber(ctx, race.lastBonus, 2, px + GLYPH_ADVANCE, 90, c.text, 1);
}

// ---------------------------------------------------------------- mini-map

const map = { canvas: null, nodes: {}, left: 0, top: 0 };
const hearts = { full: null, empty: null };

function iconCanvas(rows, color) {
  const c = document.createElement('canvas');
  c.width = rows[0].length + 2;
  c.height = rows.length + 2;
  const g = c.getContext('2d');
  for (let pass = 0; pass < 2; pass++) {
    g.fillStyle = pass === 0 ? CONFIG.hud.colors.shadow : color;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== '#') continue;
        if (pass === 0) g.fillRect(x, y, 3, 3);
        else g.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }
  return c;
}

function plotLine(ctx, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1);
  }
}

/**
 * Mini-map node positions for a pyramid of sections (pure, testable).
 * @param {object[]} sections
 * @param {Object<string, number>} stages section id → 1-based stage
 * @returns {Object<string, {x:number, y:number}>} offsets inside the map box
 */
export function mapLayout(sections, stages) {
  const { mapNodeGap, mapRowGap } = CONFIG.hud;
  const rows = {};
  let maxStage = 1;
  for (const s of sections) {
    const st = stages[s.id] || 1;
    (rows[st] = rows[st] || []).push(s.id);
    maxStage = Math.max(maxStage, st);
  }
  const widest = Math.max(...Object.values(rows).map((r) => r.length));
  const nodes = {};
  for (const [st, ids] of Object.entries(rows)) {
    const offset = ((widest - ids.length) * mapNodeGap) / 2;
    ids.forEach((id, i) => {
      nodes[id] = { x: Math.round(offset + i * mapNodeGap) + 1, y: (Number(st) - 1) * mapRowGap + 1 };
    });
  }
  return nodes;
}

/**
 * Pre-renders the static mini-map (all roads and nodes). Call once at startup.
 * @param {object[]} sections
 * @param {Object<string, number>} stages
 */
export function initHud(sections, stages) {
  const c = CONFIG.hud.colors;
  map.nodes = mapLayout(sections, stages);
  let w = 0;
  let h = 0;
  for (const n of Object.values(map.nodes)) {
    w = Math.max(w, n.x + 2);
    h = Math.max(h, n.y + 2);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.fillStyle = c.mapLine;
  for (const s of sections) {
    if (!s.next) continue;
    const a = map.nodes[s.id];
    for (const id of [s.next.left, s.next.right]) plotLine(g, a.x, a.y, map.nodes[id].x, map.nodes[id].y);
  }
  for (const s of sections) {
    g.fillStyle = s.goal ? c.mapGoal : c.mapNode;
    g.fillRect(map.nodes[s.id].x - 1, map.nodes[s.id].y - 1, 3, 3);
  }
  map.canvas = canvas;
  map.left = CONFIG.screen.width - CONFIG.hud.margin - w;
  map.top = 4;
  hearts.full = iconCanvas(HEART_ROWS, c.heartFull);
  hearts.empty = iconCanvas(HEART_ROWS, c.heartEmpty);
}

function drawMiniMap(ctx, race, progress) {
  if (!map.canvas) return;
  const c = CONFIG.hud.colors;
  const ox = map.left;
  const oy = map.top;
  ctx.drawImage(map.canvas, ox, oy);
  ctx.fillStyle = c.mapRoute;
  const route = race.route;
  const last = race.sectionIndex;
  for (let i = 0; i < route.length && i <= last; i++) {
    const a = map.nodes[route[i]];
    ctx.fillRect(ox + a.x - 1, oy + a.y - 1, 3, 3);
    if (i < last) {
      const b = map.nodes[route[i + 1]];
      plotLine(ctx, ox + a.x, oy + a.y, ox + b.x, oy + b.y);
    }
  }
  const cur = map.nodes[route[last]];
  if (blinkOn(race.elapsed)) {
    ctx.fillStyle = c.mapCurrent;
    ctx.fillRect(ox + cur.x - 1, oy + cur.y - 1, 3, 3);
  }
  // Progress through the current section as a dot heading down the map.
  ctx.fillStyle = c.mapCurrent;
  ctx.fillRect(ox + cur.x, oy + cur.y + Math.round(progress * (CONFIG.hud.mapRowGap - 1)), 1, 1);
}

/**
 * Race HUD layer: timer, stage, section name, score, drift, messages and mini-map.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} race race progress (see game/race.js)
 * @param {object} score score state (see game/score.js)
 * @param {object} player
 * @param {string} sectionName
 * @param {number} progress 0..1 through the current section
 */
export function drawRaceHud(ctx, race, score, player, sectionName, progress) {
  drawTimer(ctx, race);
  drawStage(ctx, race, sectionName);
  drawScore(ctx, score);
  drawMiniMap(ctx, race, progress);
  drawMessages(ctx, race);
  if (race.status === RACE_RUNNING) drawDrift(ctx, score, player);
}

/**
 * Name of the song the radio just switched to.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} name
 */
export function drawRadioName(ctx, name) {
  const c = CONFIG.hud.colors;
  const y = 40;
  const w = textWidth(TEXT.radio.length + 1 + name.length, 1);
  const x = (CONFIG.screen.width - w) / 2;
  shadowText(ctx, TEXT.radio, x, y, c.label, 1);
  shadowText(ctx, name, x + (TEXT.radio.length + 1) * GLYPH_ADVANCE, y, c.text, 1);
}

/**
 * Passenger layer: mood hearts under the mini-map, her current line or task
 * and a progress bar for the task.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ps passenger state (see game/passenger.js)
 */
export function drawPassengerHud(ctx, ps) {
  if (!ps.active || !hearts.full) return;
  const c = CONFIG.hud.colors;
  const max = CONFIG.passenger.maxHearts;
  const step = hearts.full.width;
  const left = CONFIG.screen.width - CONFIG.hud.margin - max * step;
  for (let i = 0; i < max; i++) ctx.drawImage(i < ps.hearts ? hearts.full : hearts.empty, left + i * step, map.top + (map.canvas ? map.canvas.height : 0) + 3);
  // Below the mini-map and hearts so long lines never overlap them.
  const y = 62;
  if (ps.messageTimer > 0) {
    centerText(ctx, ps.message, y, c.bubble, 1);
    return;
  }
  if (!ps.running) return;
  centerText(ctx, ps.text, y, c.bubble, 1);
  const w = 64;
  const x = Math.round((CONFIG.screen.width - w) / 2);
  ctx.fillStyle = c.shadow;
  ctx.fillRect(x - 1, y + 10, w + 2, 4);
  ctx.fillStyle = c.heartFull;
  ctx.fillRect(x, y + 11, Math.round(w * taskProgress(ps)), 2);
}
