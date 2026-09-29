// Pseudo-3D road renderer. Projects segments front to back with curve
// accumulation and rasterizes them as whole-pixel scanlines. Each row is
// painted at most once: nearer segments clip farther ones (hill occlusion).

import { CONFIG } from '../config.js';
import { cameraDepth, project, wrap } from '../engine/math.js';
import { findSegment, groundHeight } from '../world/track.js';
import { roadColors } from '../gfx/palette.js';

const DEPTH = cameraDepth(CONFIG.camera.fieldOfView);
const LOOKAHEAD_Z = CONFIG.camera.height * DEPTH;

/** Camera depth used by the renderer (exported for sprite projection later). */
export const CAMERA_DEPTH = DEPTH;

/** Distance from the camera to the player car; the camera sits this far behind it. */
export const PLAYER_Z_OFFSET = LOOKAHEAD_Z;

/** Render quality (lowered automatically on slow devices, see main.js). */
export const roadQuality = { level: 0, drawDistance: CONFIG.performance.drawDistances[0] };

/**
 * Sets the quality level (index into CONFIG.performance.drawDistances).
 * @param {number} level
 */
export function setRoadQuality(level) {
  const list = CONFIG.performance.drawDistances;
  roadQuality.level = Math.max(0, Math.min(list.length - 1, level));
  roadQuality.drawDistance = list[roadQuality.level];
}

/** Result of the last renderRoad call (read by the sprite pass and debug overlay). */
export const roadStats = { drawn: 0, processed: 0, baseIndex: 0 };

/**
 * Resolves each segment's road colours from its theme (blended inside
 * transition zones). Call after building or extending a track.
 * @param {{segments:object[]}} track
 * @param {number} [from] first segment index to resolve
 */
export function prepareTrackColors(track, from = 0) {
  for (let i = from; i < track.segments.length; i++) {
    const seg = track.segments[i];
    const set = roadColors(seg.themeFrom, seg.theme, seg.blend);
    seg.colors = seg.dark ? set.dark : set.light;
  }
}

function rowSpan(p1, p2, r) {
  // Returns t in 0..1 from far (p2) to near (p1) for pixel row r.
  return (r + 0.5 - p2.screen.y) / (p1.screen.y - p2.screen.y);
}

/** Fills one road (or its rumble when widthRatio > 1) centred at x2 (far) → x1 (near). */
function fillRows(ctx, seg, top, bottom, x1, x2, widthRatio) {
  const a = seg.p2.screen;
  const b = seg.p1.screen;
  for (let r = top; r < bottom; r++) {
    const t = rowSpan(seg.p1, seg.p2, r);
    const cx = x2 + (x1 - x2) * t;
    const w = (a.w + (b.w - a.w) * t) * widthRatio;
    const left = Math.round(cx - w);
    const right = Math.round(cx + w);
    if (right > left) ctx.fillRect(left, r, right - left, 1);
  }
}

/**
 * Lane markers of the road centred at x1/x2. Markers that fall on the other
 * road (while the fork branches still overlap) are skipped.
 */
function fillLaneMarkers(ctx, seg, top, bottom, x1, x2, o1, o2, hasOther) {
  const a = seg.p2.screen;
  const b = seg.p1.screen;
  const { laneMarkerRatio, laneMarkerMinPx, lanes } = CONFIG.road;
  for (let r = top; r < bottom; r++) {
    const t = rowSpan(seg.p1, seg.p2, r);
    const cx = x2 + (x1 - x2) * t;
    const ox = o2 + (o1 - o2) * t;
    const w = a.w + (b.w - a.w) * t;
    const mw = w * laneMarkerRatio;
    if (mw * 2 < laneMarkerMinPx) continue;
    const laneW = (2 * w) / lanes;
    for (let i = 1; i < lanes; i++) {
      const mx = cx - w + laneW * i;
      if (hasOther && Math.abs(mx - ox) < w) continue;
      const left = Math.round(mx - mw);
      const right = Math.round(mx + mw);
      if (right > left) ctx.fillRect(left, r, right - left, 1);
    }
  }
}

function drawSegment(ctx, seg, top, bottom, colors, width) {
  const m1 = seg.p1.screen.x;
  const m2 = seg.p2.screen.x;
  const alt = seg.alt !== null;
  const a1 = seg.altScreen1;
  const a2 = seg.altScreen2;
  ctx.fillStyle = colors.grass;
  ctx.fillRect(0, top, width, bottom - top);
  ctx.fillStyle = colors.rumble;
  fillRows(ctx, seg, top, bottom, m1, m2, 1 + CONFIG.road.rumbleRatio);
  if (alt) fillRows(ctx, seg, top, bottom, a1, a2, 1 + CONFIG.road.rumbleRatio);
  ctx.fillStyle = colors.road;
  fillRows(ctx, seg, top, bottom, m1, m2, 1);
  if (alt) fillRows(ctx, seg, top, bottom, a1, a2, 1);
  if (colors.lane) {
    ctx.fillStyle = colors.lane;
    fillLaneMarkers(ctx, seg, top, bottom, m1, m2, a1, a2, alt);
    if (alt) fillLaneMarkers(ctx, seg, top, bottom, a1, a2, m1, m2, true);
  }
}

/** Screen x of the second (fork) road, offset from the projected main road. */
function projectAlt(seg, width) {
  if (seg.alt === null) return;
  const s1 = seg.p1.screen;
  const s2 = seg.p2.screen;
  seg.altScreen1 = s1.x + s1.scale * (seg.alt.x1 * CONFIG.road.roadWidth - seg.p1.world.x) * (width / 2);
  seg.altScreen2 = s2.x + s2.scale * (seg.alt.x2 * CONFIG.road.roadWidth - seg.p2.world.x) * (width / 2);
}

/**
 * Renders the road for a camera at world position view.z, lateral view.x.
 * Stores each segment's clip row in seg.clip for the sprite pass and fills roadStats.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{segments:object[], length:number}} track prepared with prepareTrackColors
 * @param {{z:number, x:number}} view
 * @returns {number} number of segments drawn
 */
export function renderRoad(ctx, track, view) {
  const { width, height } = CONFIG.screen;
  const { segmentLength, roadWidth } = CONFIG.road;
  const drawDistance = roadQuality.drawDistance;
  const segs = track.segments;
  const count = segs.length;
  const base = findSegment(track, view.z);
  const basePercent = wrap(view.z, segmentLength) / segmentLength;
  const camY = CONFIG.camera.height + groundHeight(track, view.z + LOOKAHEAD_Z);
  const camX = view.x * roadWidth;
  const n = drawDistance < count ? drawDistance : count;
  let x = 0;
  let dx = -(base.curve * basePercent);
  let maxRow = height;
  let drawn = 0;
  let i = 0;

  for (; i < n; i++) {
    const seg = segs[(base.index + i) % count];
    if (!track.loop && base.index + i >= count) break;
    const camZ = seg.index < base.index ? view.z - track.length : view.z;
    project(seg.p1, camX - x, camY, camZ, DEPTH, width, height, roadWidth);
    project(seg.p2, camX - x - dx, camY, camZ, DEPTH, width, height, roadWidth);
    projectAlt(seg, width);
    x += dx;
    dx += seg.curve;
    seg.clip = maxRow;
    if (seg.p1.camera.z <= DEPTH || seg.p2.screen.y >= seg.p1.screen.y) continue;
    let top = Math.ceil(seg.p2.screen.y - 0.5);
    let bottom = Math.ceil(seg.p1.screen.y - 0.5);
    if (bottom > maxRow) bottom = maxRow;
    if (top < 0) top = 0;
    if (top >= bottom) continue;
    drawSegment(ctx, seg, top, bottom, seg.colors, width);
    maxRow = top;
    drawn++;
    if (maxRow <= 0) {
      i++;
      break;
    }
  }
  roadStats.drawn = drawn;
  roadStats.processed = i;
  roadStats.baseIndex = base.index;
  return drawn;
}
