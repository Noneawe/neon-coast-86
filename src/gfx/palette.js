// Palette utilities: hex parsing, quantized blending between two theme
// palettes and cached road colour sets. All blended strings are created once
// and reused, so per-frame code never builds colour strings.

import { CONFIG } from '../config.js';
import { THEMES, THEME_ROLES, ROAD_ROLES } from '../data/themes.js';

/**
 * @param {string} hex '#rrggbb'
 * @returns {[number, number, number]}
 */
export function parseHex(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export function toHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * @param {string} a
 * @param {string} b
 * @param {number} t 0..1
 * @returns {string}
 */
export function mixHex(a, b, t) {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex(
    Math.round(ca[0] + (cb[0] - ca[0]) * t),
    Math.round(ca[1] + (cb[1] - ca[1]) * t),
    Math.round(ca[2] + (cb[2] - ca[2]) * t),
  );
}

/**
 * Snaps a 0..1 blend factor to CONFIG.theme.blendSteps levels.
 * @param {number} t
 * @returns {number}
 */
export function quantizeBlend(t) {
  const steps = CONFIG.theme.blendSteps;
  return Math.round(Math.min(1, Math.max(0, t)) * steps) / steps;
}

const paletteCache = new Map();
const roadCache = new Map();

/**
 * Palette between two themes (cached per quantized step).
 * @param {string} fromKey
 * @param {string} toKey
 * @param {number} t 0..1 (0 = from, 1 = to)
 * @returns {Object<string, string>}
 */
export function blendPalette(fromKey, toKey, t) {
  const q = quantizeBlend(t);
  if (q >= 1 || fromKey === toKey) return THEMES[toKey].palette;
  if (q <= 0) return THEMES[fromKey].palette;
  const key = `${fromKey}|${toKey}|${q}`;
  let pal = paletteCache.get(key);
  if (!pal) {
    pal = {};
    const a = THEMES[fromKey].palette;
    const b = THEMES[toKey].palette;
    for (const role of THEME_ROLES) pal[role] = mixHex(a[role], b[role], q);
    paletteCache.set(key, pal);
  }
  return pal;
}

/**
 * Road colours {light, dark} for a (possibly blended) palette, cached.
 * @param {string} fromKey
 * @param {string} toKey
 * @param {number} t
 * @returns {{light:{road:string, grass:string, rumble:string, lane:string|null}, dark:object}}
 */
export function roadColors(fromKey, toKey, t) {
  const key = `${fromKey}|${toKey}|${quantizeBlend(t)}`;
  let set = roadCache.get(key);
  if (!set) {
    const pal = blendPalette(fromKey, toKey, t);
    set = {};
    for (const variant of ['light', 'dark']) {
      const roles = ROAD_ROLES[variant];
      set[variant] = {
        road: pal[roles.road],
        grass: pal[roles.grass],
        rumble: pal[roles.rumble],
        lane: roles.lane ? pal[roles.lane] : null,
      };
    }
    roadCache.set(key, set);
  }
  return set;
}
