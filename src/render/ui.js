// Shared drawing for menus and screens: neon title logo, dark panels,
// centred text, selectable lists and the highscore table. Draws only.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { drawText, drawNumber, GLYPH_ADVANCE, GLYPH_H } from './font.js';

// Outline offsets (dx, dy pairs) for readable text on any background.
const OUTLINE = [-1, 0, 1, 0, 0, -1, 0, 1, 1, 1];

/**
 * Pixel width of a string at `scale`.
 * @param {string} text
 * @param {number} scale
 * @returns {number}
 */
export function textWidth(text, scale) {
  return (text.length * GLYPH_ADVANCE - 1) * scale;
}

/**
 * Outlined text.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} [scale]
 * @param {string} [outline]
 */
export function outlined(ctx, text, x, y, color, scale = 1, outline = CONFIG.hud.colors.shadow) {
  for (let i = 0; i < OUTLINE.length; i += 2) drawText(ctx, text, x + OUTLINE[i] * scale, y + OUTLINE[i + 1] * scale, outline, scale);
  drawText(ctx, text, x, y, color, scale);
}

/**
 * Outlined text centred horizontally.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} y
 * @param {string} color
 * @param {number} [scale]
 */
export function centered(ctx, text, y, color, scale = 1) {
  outlined(ctx, text, Math.round((CONFIG.screen.width - textWidth(text, scale)) / 2), y, color, scale);
}

/**
 * Dark rectangle behind menus.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function panel(ctx, x, y, w, h) {
  const c = CONFIG.hud.colors;
  ctx.fillStyle = c.shadow;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = c.panel;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c.logoA;
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = c.logoB;
  ctx.fillRect(x, y + h - 1, w, 1);
}

/**
 * Two-colour neon logo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} y top row
 */
export function drawLogo(ctx, y) {
  const c = CONFIG.hud.colors;
  const w1 = textWidth(TEXT.title1, 4);
  const x = Math.round((CONFIG.screen.width - w1) / 2);
  outlined(ctx, TEXT.title1, x, y, c.logoA, 4, c.logoB);
  outlined(ctx, TEXT.title2, x + w1 - textWidth(TEXT.title2, 2), y + GLYPH_H * 4 + 4, c.select, 2);
}

/**
 * Selectable list: `labels[i]` with optional `values[i]` on the right; the selected line is highlighted.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} labels
 * @param {(string|null)[]} values
 * @param {number} selected
 * @param {number} y top of the first line
 * @param {number} width list width (centred)
 */
export function drawList(ctx, labels, values, selected, y, width) {
  const c = CONFIG.hud.colors;
  const left = Math.round((CONFIG.screen.width - width) / 2);
  const lh = CONFIG.menu.lineHeight;
  for (let i = 0; i < labels.length; i++) {
    const color = i === selected ? c.select : c.text;
    const ly = y + i * lh;
    if (i === selected) outlined(ctx, '>', left - 2 * GLYPH_ADVANCE, ly, c.select);
    outlined(ctx, labels[i], left, ly, color);
    if (values[i]) {
      const vx = left + width - textWidth(values[i], 1);
      outlined(ctx, values[i], vx, ly, color);
      if (i === selected) {
        outlined(ctx, '<', vx - 2 * GLYPH_ADVANCE, ly, color);
        outlined(ctx, '>', left + width + GLYPH_ADVANCE, ly, color);
      }
    }
  }
}

/**
 * Highscore table (rank, name, score, P for passenger runs); `highlight` marks a fresh entry.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{name:string, score:number, passenger:boolean}[]} list
 * @param {number} y
 * @param {number} highlight index or -1
 */
export function drawHighscores(ctx, list, y, highlight) {
  const c = CONFIG.hud.colors;
  centered(ctx, TEXT.highscores, y, c.logoB, 1);
  if (list.length === 0) {
    centered(ctx, TEXT.noScores, y + 16, c.dim, 1);
    return;
  }
  const left = Math.round(CONFIG.screen.width / 2 - 60);
  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    const ly = y + 14 + i * 10;
    const color = i === highlight ? c.select : c.text;
    drawNumber(ctx, i + 1, 2, left, ly, color, 1);
    outlined(ctx, h.name, left + 3 * GLYPH_ADVANCE, ly, color);
    drawNumber(ctx, h.score, 8, left + 8 * GLYPH_ADVANCE, ly, color, 1);
    if (h.passenger) outlined(ctx, 'P', left + 17 * GLYPH_ADVANCE, ly, c.heartFull);
  }
}

let dimCanvas = null;

/**
 * Full-screen dim layer (pause): a pixel checker pre-rendered once, then blitted.
 * @param {CanvasRenderingContext2D} ctx
 */
export function dimScreen(ctx) {
  const { width, height } = CONFIG.screen;
  if (!dimCanvas) {
    dimCanvas = document.createElement('canvas');
    dimCanvas.width = width;
    dimCanvas.height = height;
    const g = dimCanvas.getContext('2d');
    g.fillStyle = CONFIG.hud.colors.panel;
    for (let y = 0; y < height; y++) {
      for (let x = y & 1; x < width; x += 2) g.fillRect(x, y, 1, 1);
    }
  }
  ctx.drawImage(dimCanvas, 0, 0);
}
