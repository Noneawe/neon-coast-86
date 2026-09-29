// Sky and parallax background. Per theme, a dithered sky (Bayer 4×4 bands +
// sun) and each parallax layer are rendered once to offscreen canvases; the
// frame only blits them. Theme transitions cross-fade two cached backgrounds.

import { CONFIG } from '../config.js';
import { THEMES } from '../data/themes.js';
import { wrap } from '../engine/math.js';
import { parseHex } from '../gfx/palette.js';
import { layerHeights, cloudList } from '../gfx/backgrounds.js';

/** Bayer 4×4 threshold matrix (0..15). */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const cache = {};

/** @returns {number} screen row where background layers meet the ground */
function horizonRow() {
  return CONFIG.screen.height / 2 + CONFIG.sky.horizonOffset;
}

/**
 * Band index for sky pixel (x, y): dithers between neighbouring bands.
 * @param {number} x
 * @param {number} y
 * @param {number} bandCount
 * @param {number} horizon row where the last band is reached
 * @returns {number}
 */
export function skyBandAt(x, y, bandCount, horizon) {
  const f = Math.min(1, y / horizon) * (bandCount - 1);
  const i = Math.floor(f);
  if (i >= bandCount - 1) return bandCount - 1;
  const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  return f - i > threshold ? i + 1 : i;
}

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawSun(g, theme, width) {
  const { sun } = theme.sky;
  const pal = theme.palette;
  const cx = Math.round(sun.x * width);
  for (let dy = -sun.r; dy <= sun.r; dy++) {
    // Retro stripes: gaps widen toward the bottom half of the sun.
    if (sun.stripes && dy > 0 && dy % 4 < Math.min(3, 1 + Math.floor((dy * 3) / sun.r))) continue;
    const half = Math.round(Math.sqrt(sun.r * sun.r - dy * dy));
    g.fillStyle = sun.stripes && dy > sun.r / 3 ? pal.sunStripe : pal.sun;
    g.fillRect(cx - half, sun.y + dy, half * 2 + 1, 1);
  }
}

function buildSky(theme) {
  const { width, height } = CONFIG.screen;
  const c = newCanvas(width, height);
  const g = c.getContext('2d');
  const img = g.createImageData(width, height);
  const bands = theme.sky.bands.map((role) => parseHex(theme.palette[role]));
  const hz = horizonRow();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = bands[skyBandAt(x, y, bands.length, hz)];
      const o = (y * width + x) * 4;
      img.data[o] = rgb[0];
      img.data[o + 1] = rgb[1];
      img.data[o + 2] = rgb[2];
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  drawSun(g, theme, width);
  return c;
}

function buildClouds(g, def, pal, width) {
  const bottomShade = def.height * 0.12;
  for (const cl of cloudList(def, width)) {
    for (let dy = -Math.ceil(cl.ry); dy <= Math.ceil(cl.ry); dy++) {
      const half = Math.round(cl.rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (cl.ry * cl.ry))));
      if (half <= 0) continue;
      const y = Math.round(cl.y + dy);
      g.fillStyle = dy > cl.ry - bottomShade - 2 ? pal[def.shade] : pal[def.main];
      // Draw wrapped copies so the tile stays seamless.
      for (const ox of [-width, 0, width]) g.fillRect(Math.round(cl.x - half) + ox, y, half * 2, 1);
    }
  }
}

function buildSilhouette(g, def, pal, width) {
  const h = layerHeights(def, width);
  for (let x = 0; x < width; x++) {
    const top = def.height - h[x];
    const prev = h[(x - 1 + width) % width];
    const falling = h[x] < prev || (def.type === 'forest' && x % 2 === 1);
    g.fillStyle = pal[def.main];
    g.fillRect(x, top, 1, h[x]);
    if (def.type === 'hills') {
      // Dithered shade in the lower part of rolling hills.
      g.fillStyle = pal[def.shade];
      for (let y = top + Math.ceil(h[x] / 2); y < def.height; y++) {
        if (BAYER4[(y & 3) * 4 + (x & 3)] < 8 * ((y - top) / h[x])) g.fillRect(x, y, 1, 1);
      }
    } else if (falling) {
      g.fillStyle = pal[def.shade];
      g.fillRect(x, top + 1, 1, h[x] - 1);
    }
  }
}

function buildLayer(def, pal) {
  const width = CONFIG.sky.layerWidth;
  const c = newCanvas(width, def.height);
  const g = c.getContext('2d');
  if (def.type === 'clouds') buildClouds(g, def, pal, width);
  else buildSilhouette(g, def, pal, width);
  return { canvas: c, slot: def.slot, bottom: def.bottom };
}

/** Builds cached sky and layer canvases for every theme. Call once at startup. */
export function initSky() {
  for (const key of Object.keys(THEMES)) {
    const theme = THEMES[key];
    cache[key] = {
      sky: buildSky(theme),
      layers: theme.layers.map((def) => buildLayer(def, theme.palette)),
      ground: theme.palette.ground,
    };
  }
}

function drawBackground(ctx, key, offsets) {
  const { width, height } = CONFIG.screen;
  const layerW = CONFIG.sky.layerWidth;
  const bg = cache[key];
  const hz = horizonRow();
  ctx.drawImage(bg.sky, 0, 0);
  for (let i = 0; i < bg.layers.length; i++) {
    const layer = bg.layers[i];
    const x0 = -Math.round(wrap(offsets[layer.slot], layerW));
    const y = hz - layer.bottom - layer.canvas.height;
    for (let x = x0; x < width; x += layerW) ctx.drawImage(layer.canvas, x, y);
  }
  ctx.fillStyle = bg.ground;
  ctx.fillRect(0, hz, width, height - hz);
}

/**
 * Draws sky, sun, parallax layers and distant ground.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} fromKey theme being left
 * @param {string} toKey theme being entered
 * @param {number} blend 0..1 quantized cross-fade factor
 * @param {number[]} offsets parallax offset per slot (px)
 */
export function renderSky(ctx, fromKey, toKey, blend, offsets) {
  if (blend >= 1 || fromKey === toKey) {
    drawBackground(ctx, toKey, offsets);
    return;
  }
  drawBackground(ctx, fromKey, offsets);
  if (blend <= 0) return;
  ctx.globalAlpha = blend;
  drawBackground(ctx, toKey, offsets);
  ctx.globalAlpha = 1;
}
