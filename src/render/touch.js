// Draws the on-screen touch controls in the 320×240 buffer: pixel-art rings
// (cached per size and state) with their letters, and the steering pad with
// a knob that follows the steer value.

import { CONFIG } from '../config.js';
import { drawText, GLYPH_W, GLYPH_H } from './font.js';

const rings = new Map();

function ring(r, filled) {
  const key = r * 2 + (filled ? 1 : 0);
  let c = rings.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = r * 2 + 1;
  c.height = r * 2 + 1;
  const g = c.getContext('2d');
  const col = CONFIG.hud.colors;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 0.5) continue;
      if (d > r - 1.5) g.fillStyle = col.text;
      else if (filled) g.fillStyle = col.logoA;
      else if ((x + y) & 1) continue; // dithered see-through inside
      else g.fillStyle = col.panel;
      g.fillRect(x + r, y + r, 1, 1);
    }
  }
  rings.set(key, c);
  return c;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{enabled:boolean, pressedButtons:Object<string,boolean>, steer:number}} t touch state
 */
export function drawTouchControls(ctx, t) {
  if (!t.enabled) return;
  const { buttons, steer } = CONFIG.touch;
  for (const b of buttons) {
    ctx.drawImage(ring(b.r, t.pressedButtons[b.id]), b.x - b.r, b.y - b.r);
    drawText(ctx, b.label, b.x - (GLYPH_W >> 1), b.y - (GLYPH_H >> 1), CONFIG.hud.colors.text);
  }
  ctx.drawImage(ring(steer.radius, false), steer.x - steer.radius, steer.y - steer.radius);
  const knob = Math.round(steer.radius / 3);
  const kx = Math.round(steer.x + t.steer * (steer.radius - knob));
  ctx.drawImage(ring(knob, true), kx - knob, steer.y - knob);
}
