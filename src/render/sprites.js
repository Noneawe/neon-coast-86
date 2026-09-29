// Sprite cache and drawing. The player car has 7 turn frames plus crash
// frames; roadside sprites and traffic are cached per theme (recoloured from
// the theme palette) at full, 1/2 and 1/4 size, then drawn far→near, scaled
// and clipped behind hill crests.

import { CONFIG } from '../config.js';
import { THEMES } from '../data/themes.js';
import { PLAYER_CAR_ROWS, PLAYER_CAR_PALETTE, PLAYER_CAR_BODY_ROWS } from '../gfx/player-car.js';
import { buildCarFrames, buildVehicleFrames, buildTurnFrame, steerFrameIndex, TURN_LEVELS } from '../gfx/car-frames.js';
import { renderAsciiSprite } from '../gfx/sprite-cache.js';
import { WORLD_SPRITES, SPRITE_CHAR_ROLES } from '../gfx/world-sprites.js';
import { VEHICLE_SPRITES, VEHICLE_CHAR_ROLES, VEHICLE_VARIANTS } from '../gfx/vehicle-sprites.js';
import { wrapDelta } from '../world/traffic.js';
import { CRASH_NONE, CRASH_TUMBLE } from '../world/player.js';
import { CAMERA_DEPTH } from './road.js';

const carFrames = [];
/** Drift frames: [left strong, left, right, right strong]. */
const driftFrames = [];
let carFlipped = null;
/** themeKey → spriteId → canvases [full, 1/2, 1/4] */
const worldCache = {};
/** themeKey → vehicle sprite key → variant → frame → canvases [full, 1/2, 1/4] */
const vehicleCache = {};
const stats = { drawn: 0, cars: 0 };

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function downscale(src, factor) {
  const c = newCanvas(Math.max(1, Math.ceil(src.width / factor)), Math.max(1, Math.ceil(src.height / factor)));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function withLods(canvas) {
  const levels = [canvas];
  for (let l = 1; l < CONFIG.sprites.lodLevels; l++) levels.push(downscale(canvas, 1 << l));
  return levels;
}

function rolePalette(theme, charRoles) {
  const pal = {};
  for (const ch of Object.keys(charRoles)) pal[ch] = theme.palette[charRoles[ch]];
  return pal;
}

function buildWorldSprites(key) {
  const pal = rolePalette(THEMES[key], SPRITE_CHAR_ROLES);
  const set = {};
  for (const id of Object.keys(WORLD_SPRITES)) set[id] = withLods(renderAsciiSprite(WORLD_SPRITES[id].rows, pal));
  worldCache[key] = set;
}

function buildVehicleSprites(key) {
  const theme = THEMES[key];
  const { vehicleSideLevels, vehicleSidePx } = CONFIG.sprites;
  const set = {};
  for (const id of Object.keys(VEHICLE_SPRITES)) {
    const def = VEHICLE_SPRITES[id];
    const frames = buildVehicleFrames(def.rows, def.bodyRows, vehicleSideLevels, vehicleSidePx);
    set[id] = VEHICLE_VARIANTS.map(([main, shade]) => {
      const pal = rolePalette(theme, VEHICLE_CHAR_ROLES);
      pal.B = theme.palette[main];
      pal.b = theme.palette[shade];
      return frames.map((rows) => withLods(renderAsciiSprite(rows, pal)));
    });
  }
  vehicleCache[key] = set;
}

function buildDriftFrames() {
  const { frameShear, frameSidePx } = CONFIG.drift;
  const pad = Math.max(...frameShear) + Math.max(...frameSidePx);
  driftFrames.length = 0;
  for (const [level, i] of [[-1, 1], [-1, 0], [1, 0], [1, 1]]) {
    const rows = buildTurnFrame(PLAYER_CAR_ROWS, level, PLAYER_CAR_BODY_ROWS, pad, frameShear[i], frameSidePx[i]);
    driftFrames.push(renderAsciiSprite(rows, PLAYER_CAR_PALETTE));
  }
}

/**
 * Drift frame index 0..3 for a drift direction and angle.
 * @param {number} dir -1 left, +1 right
 * @param {number} angle 0..1
 * @returns {number}
 */
export function driftFrameIndex(dir, angle) {
  const strong = angle >= CONFIG.drift.frameAngle;
  if (dir < 0) return strong ? 0 : 1;
  return strong ? 3 : 2;
}

function flipVertical(src) {
  const c = newCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, -1, 0, src.height);
  g.drawImage(src, 0, 0);
  return c;
}

/** Builds all cached sprite canvases. Call once at startup. */
export function initSprites() {
  carFrames.length = 0;
  for (const rows of buildCarFrames(PLAYER_CAR_ROWS, PLAYER_CAR_BODY_ROWS)) {
    carFrames.push(renderAsciiSprite(rows, PLAYER_CAR_PALETTE));
  }
  carFlipped = flipVertical(carFrames[TURN_LEVELS]);
  buildDriftFrames();
  for (const key of Object.keys(THEMES)) {
    buildWorldSprites(key);
    buildVehicleSprites(key);
  }
}

function crashFrame(spin) {
  // Roll: upright → right flank → upside down → left flank.
  const phase = Math.floor(spin * 4) % 4;
  if (phase === 1) return carFrames[2 * TURN_LEVELS];
  if (phase === 2) return carFlipped;
  if (phase === 3) return carFrames[0];
  return carFrames[TURN_LEVELS];
}

/**
 * Draws the player car centred at the bottom of the screen (with crash roll,
 * hop and blinking while recovering).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{steer:number, bounce:number, crash:number, crashTime:number, hop:number, spin:number,
 *   grace:number, drift:boolean, driftDir:number, driftAngle:number}} p
 */
export function drawPlayerCar(ctx, p) {
  const blink = CONFIG.collision.blinkInterval;
  const blinkTime = p.crash !== CRASH_NONE ? p.crashTime : p.grace;
  if ((p.crash !== CRASH_NONE && p.crash !== CRASH_TUMBLE) || p.grace > 0) {
    if (Math.floor(blinkTime / blink) % 2 === 1) return;
  }
  let img;
  if (p.crash === CRASH_TUMBLE) img = crashFrame(p.spin);
  else if (p.drift) img = driftFrames[driftFrameIndex(p.driftDir, p.driftAngle)];
  else img = carFrames[steerFrameIndex(p.steer)];
  const { width, height } = CONFIG.screen;
  const x = Math.round((width - img.width) / 2);
  const y = height - CONFIG.player.spriteBottom - img.height + p.bounce - p.hop;
  ctx.drawImage(img, x, y);
}

function pickLevel(levels, targetW) {
  let img = levels[0];
  for (let i = 1; i < levels.length; i++) if (levels[i].width >= targetW) img = levels[i];
  return img;
}

/**
 * Screen rectangle for a bottom-anchored billboard at (sx, sy), clipped at clip row.
 * @returns {boolean} false if nothing is visible
 */
function projectBillboard(sx, sy, scale, worldWidth, imgW, imgH, clip, out) {
  const wpx = worldWidth * scale * (CONFIG.screen.width / 2);
  const hpx = (wpx * imgH) / imgW;
  if (hpx < CONFIG.sprites.minHeightPx) return false;
  out.left = Math.round(sx - wpx / 2);
  out.w = Math.round(wpx);
  const bottom = Math.round(sy);
  out.top = bottom - Math.round(hpx);
  out.h = bottom - out.top;
  if (out.w <= 0 || out.h <= 0) return false;
  if (out.left >= CONFIG.screen.width || out.left + out.w <= 0 || out.top >= clip) return false;
  out.visible = Math.min(bottom, clip) - out.top;
  return out.visible > 0;
}

/**
 * Screen rectangle of a roadside sprite on a projected segment, clipped at
 * the segment's clip row. Pure: writes into `out`, returns false if hidden.
 * @param {{p1:{screen:{x:number,y:number,scale:number}, world:{x:number}}, clip:number}} seg
 * @param {{x:number, worldWidth:number}} spr x = absolute normalized position
 * @param {number} imgW source image width (px)
 * @param {number} imgH source image height (px)
 * @param {{left:number, top:number, w:number, h:number, visible:number}} out
 * @returns {boolean}
 */
export function projectSprite(seg, spr, imgW, imgH, out) {
  const s = seg.p1.screen;
  const rel = spr.x * CONFIG.road.roadWidth - seg.p1.world.x;
  const cx = s.x + s.scale * rel * (CONFIG.screen.width / 2);
  return projectBillboard(cx, s.y, s.scale, spr.worldWidth, imgW, imgH, seg.clip, out);
}

/**
 * Screen rectangle of a vehicle inside a projected segment (position
 * interpolated between p1 and p2 so cars glide smoothly).
 * @param {object} seg projected segment
 * @param {number} t position within the segment 0..1 (clamped)
 * @param {number} x vehicle absolute normalized x
 * @param {number} worldWidth vehicle width in world units
 * @param {number} imgW frame width (px)
 * @param {number} imgH frame height (px)
 * @param {number} baseW width of the unpadded sprite (px)
 * @param {object} out
 * @returns {boolean}
 */
export function projectVehicle(seg, t, x, worldWidth, imgW, imgH, baseW, out) {
  const a = seg.p1.screen;
  const b = seg.p2.screen;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const scale = a.scale + (b.scale - a.scale) * t;
  const main = seg.p1.world.x + (seg.p2.world.x - seg.p1.world.x) * t;
  const sx = a.x + (b.x - a.x) * t + scale * (x * CONFIG.road.roadWidth - main) * (CONFIG.screen.width / 2);
  const sy = a.y + (b.y - a.y) * t;
  return projectBillboard(sx, sy, scale, (worldWidth * imgW) / baseW, imgW, imgH, seg.clip, out);
}

/**
 * Side-view frame index for a vehicle at screen x (0 = far left of screen).
 * @param {number} screenX
 * @returns {number}
 */
export function vehicleFrameIndex(screenX) {
  const half = CONFIG.screen.width / 2;
  const rel = (screenX - half) / half;
  const th = CONFIG.sprites.vehicleSideThresholds;
  let level = 0;
  for (let i = 0; i < th.length; i++) if (Math.abs(rel) >= th[i]) level = i + 1;
  return CONFIG.sprites.vehicleSideLevels + (rel < 0 ? -level : level);
}

const rect = { left: 0, top: 0, w: 0, h: 0, visible: 0 };

function blit(ctx, levels) {
  const img = pickLevel(levels, rect.w);
  const srcH = (img.height * rect.visible) / rect.h;
  ctx.drawImage(img, 0, 0, img.width, srcH, rect.left, rect.top, rect.w, rect.visible);
}

function drawSegmentSprites(ctx, seg) {
  const set = worldCache[seg.theme];
  for (let s = 0; s < seg.sprites.length; s++) {
    const spr = seg.sprites[s];
    const levels = set[spr.id];
    if (!projectSprite(seg, spr, levels[0].width, levels[0].height, rect)) continue;
    blit(ctx, levels);
    stats.drawn++;
  }
}

function drawSegmentCars(ctx, seg, alpha, length) {
  const set = vehicleCache[seg.theme];
  for (let c = 0; c < seg.cars.length; c++) {
    const v = seg.cars[c];
    const z = v.prevZ + wrapDelta(v.z - v.prevZ, length) * alpha;
    const t = wrapDelta(z - seg.p1.world.z, length) / CONFIG.road.segmentLength;
    const x = v.prevX + (v.x - v.prevX) * alpha;
    const def = VEHICLE_SPRITES[v.type.sprite];
    const frames = set[v.type.sprite][v.variant];
    const baseW = def.rows[0].length;
    // First pass with the straight frame to find the screen position.
    const straight = frames[CONFIG.sprites.vehicleSideLevels][0];
    if (!projectVehicle(seg, t, x, v.type.worldWidth, straight.width, straight.height, baseW, rect)) continue;
    const levels = frames[vehicleFrameIndex(rect.left + rect.w / 2)];
    if (!projectVehicle(seg, t, x, v.type.worldWidth, levels[0].width, levels[0].height, baseW, rect)) continue;
    blit(ctx, levels);
    stats.cars++;
  }
}

/**
 * Draws roadside sprites and traffic far→near for the segments the road pass
 * processed. Everything is clipped at its segment's clip row, so crests hide it.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{segments:object[], length:number}} track
 * @param {number} baseIndex first processed segment index
 * @param {number} processed number of segments processed by renderRoad
 * @param {number} alpha interpolation factor for vehicle positions
 * @returns {{drawn:number, cars:number}} counts drawn this frame
 */
export function drawRoadsideSprites(ctx, track, baseIndex, processed, alpha) {
  const segs = track.segments;
  const count = segs.length;
  stats.drawn = 0;
  stats.cars = 0;
  for (let i = processed - 1; i >= 0; i--) {
    const seg = segs[(baseIndex + i) % count];
    if (seg.p1.camera.z <= CAMERA_DEPTH) continue;
    if (seg.sprites.length > 0) drawSegmentSprites(ctx, seg);
    if (seg.cars.length > 0) drawSegmentCars(ctx, seg, alpha, track.length);
  }
  return stats;
}
