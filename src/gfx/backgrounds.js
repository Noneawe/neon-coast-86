// Procedural parallax layer shapes. Produces tileable height profiles and
// cloud lists from a seed; pure functions, so shapes are testable and stable.

import { createRng } from '../engine/rng.js';

/**
 * Sum of integer-frequency waves: tiles seamlessly over `width`.
 * @param {{next:()=>number}} rng
 * @param {number} width
 * @param {number} waves
 * @param {boolean} ridged use |sin| for sharp peaks
 * @returns {Float32Array} values roughly 0..1
 */
function waveProfile(rng, width, waves, ridged) {
  const out = new Float32Array(width);
  const params = [];
  let total = 0;
  for (let i = 0; i < waves; i++) {
    const k = 1 + Math.floor(rng.next() * (2 + i * 3));
    const amp = 1 / (1 + i * 0.8);
    params.push([k, amp, rng.next() * Math.PI * 2]);
    total += amp;
  }
  for (let x = 0; x < width; x++) {
    let v = 0;
    for (const [k, amp, ph] of params) {
      const s = ridged ? Math.abs(Math.sin((Math.PI * k * x) / width + ph)) : 0.5 + 0.5 * Math.sin((2 * Math.PI * k * x) / width + ph);
      v += s * amp;
    }
    out[x] = v / total;
  }
  return out;
}

function forestProfile(rng, width, height) {
  const base = waveProfile(rng, width, 2, false);
  const out = new Float32Array(width);
  for (let x = 0; x < width; x++) out[x] = (base[x] * 0.4) * height;
  for (let tx = 0; tx < width; tx += 3 + Math.floor(rng.next() * 4)) {
    const th = height * (0.5 + rng.next() * 0.5);
    for (let dx = -4; dx <= 4; dx++) {
      const x = (tx + dx + width) % width;
      const h = out[tx] + th - Math.abs(dx) * 2.5 - out[tx] * 0.5;
      if (h > out[x]) out[x] = h;
    }
  }
  return out;
}

/**
 * Column heights in pixels for a silhouette layer.
 * @param {{type:string, height:number, seed:number}} def
 * @param {number} width layer width (tile period)
 * @returns {Int16Array}
 */
export function layerHeights(def, width) {
  const rng = createRng(def.seed);
  const h = def.height;
  const out = new Int16Array(width);
  let prof;
  if (def.type === 'forest') {
    prof = forestProfile(rng, width, h);
    for (let x = 0; x < width; x++) out[x] = Math.min(h, Math.round(prof[x]));
    return out;
  }
  if (def.type === 'mountains') prof = waveProfile(rng, width, 5, true);
  else prof = waveProfile(rng, width, 3, false);
  for (let x = 0; x < width; x++) {
    let v = prof[x];
    if (def.type === 'mesas') v = v > 0.55 ? 0.95 : v > 0.35 ? 0.35 + (v - 0.35) * 0.5 : v * 0.6;
    if (def.type === 'hills') v = 0.3 + v * 0.7;
    out[x] = Math.max(1, Math.min(h, Math.round(v * h)));
  }
  return out;
}

/**
 * Cloud ellipses {x, y, rx, ry} inside a layer of width × height.
 * @param {{seed:number, height:number, count?:number}} def
 * @param {number} width
 * @returns {{x:number, y:number, rx:number, ry:number}[]}
 */
export function cloudList(def, width) {
  const rng = createRng(def.seed);
  const clouds = [];
  const n = def.count || 5;
  for (let i = 0; i < n; i++) {
    const cx = rng.next() * width;
    const cy = def.height * (0.3 + rng.next() * 0.5);
    const size = 10 + rng.next() * 18;
    const puffs = 3 + Math.floor(rng.next() * 3);
    for (let p = 0; p < puffs; p++) {
      clouds.push({
        x: cx + (p - puffs / 2) * size * 0.6,
        y: cy - rng.next() * size * 0.3,
        rx: size * (0.5 + rng.next() * 0.4),
        ry: size * (0.25 + rng.next() * 0.2),
      });
    }
  }
  return clouds;
}
