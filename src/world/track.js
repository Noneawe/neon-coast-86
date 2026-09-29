// Builds the segment array from section data. Each data part is expanded into
// ease-in / hold / ease-out segments so curvature and height never jump.
// Sections are appended one after another (the route grows at each fork).
// Every segment stores its road centre in p1/p2.world.x; a fork adds a
// second road (seg.alt) that splits off and, once unchosen, drifts away.

import { CONFIG, SEGMENT_LENGTH, ROAD_WIDTH } from '../config.js';
import { easeIn, easeOut, easeInOut, lerp, wrap } from '../engine/math.js';

function makePoint(z, y, x) {
  return {
    world: { x, y, z },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  };
}

function addSegment(track, curve, y1, y2, theme, sectionIndex, centerX) {
  const segments = track.segments;
  const index = segments.length;
  segments.push({
    index,
    p1: makePoint(index * SEGMENT_LENGTH, y1, centerX * ROAD_WIDTH),
    p2: makePoint((index + 1) * SEGMENT_LENGTH, y2, centerX * ROAD_WIDTH),
    curve,
    dark: Math.floor(index / CONFIG.road.rumbleLength) % 2 === 1,
    section: sectionIndex, // index into track.sections
    theme,             // theme key of the owning section
    themeFrom: theme,  // previous theme inside a transition zone
    blend: 1,          // 0 = themeFrom, 1 = theme
    colors: null,      // resolved road colours (filled by the renderer)
    alt: null,         // second road {x1, x2} (normalized centres) in forks
    altScreen1: 0,     // renderer scratch: second road screen x at p1 / p2
    altScreen2: 0,
    clip: 0,
    sprites: [],
    cars: [],          // traffic vehicles currently on this segment
  });
}

function lastY(segments) {
  return segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y;
}

/**
 * Splits a part length into ease-in, hold and ease-out counts.
 * @param {number} len
 * @returns {{enter:number, hold:number, leave:number}}
 */
export function splitPart(len) {
  const ease = Math.floor(len * CONFIG.track.easeFraction);
  return { enter: ease, hold: len - 2 * ease, leave: ease };
}

function addPart(track, part, theme, sectionIndex, centerX) {
  const { enter, hold, leave } = splitPart(part.len);
  const total = part.len;
  const startY = lastY(track.segments);
  const endY = startY + part.hill * CONFIG.track.hillScale;
  const yAt = (n) => easeInOut(startY, endY, n / total);
  let n = 0;
  for (let i = 0; i < enter; i++, n++) {
    addSegment(track, easeIn(0, part.curve, i / enter), yAt(n), yAt(n + 1), theme, sectionIndex, centerX);
  }
  for (let i = 0; i < hold; i++, n++) {
    addSegment(track, part.curve, yAt(n), yAt(n + 1), theme, sectionIndex, centerX);
  }
  for (let i = 0; i < leave; i++, n++) {
    addSegment(track, easeOut(part.curve, 0, i / leave), yAt(n), yAt(n + 1), theme, sectionIndex, centerX);
  }
}

/**
 * Section length in segments.
 * @param {{segments:{len:number}[]}} section
 * @returns {number}
 */
export function sectionLength(section) {
  let n = 0;
  for (const p of section.segments) n += p.len;
  return n;
}

/** @returns {number} segments at the end of a forked section used by the fork */
export function forkLength() {
  return CONFIG.fork.widenLength + CONFIG.fork.splitLength;
}

/**
 * Expands a section sprite rule into [localIndex, signedOffset] placements.
 * Rule forms: { every, from, to, sprite, side, offset } or { at, sprite, side, offset }.
 * @param {{every?:number, from?:number, to?:number, at?:number, side:string, offset:number}} rule
 * @param {number} len section length in segments
 * @returns {[number, number][]}
 */
export function expandSpriteRule(rule, len) {
  const out = [];
  const sides = rule.side === 'both' ? [-1, 1] : rule.side === 'left' ? [-1] : [1];
  const push = (i) => {
    if (i >= 0 && i < len) for (const s of sides) out.push([i, s * rule.offset]);
  };
  if (typeof rule.at === 'number') {
    push(rule.at);
  } else {
    const from = rule.from || 0;
    const to = Math.min(typeof rule.to === 'number' ? rule.to : len, len);
    for (let i = from; i < to; i += rule.every) push(i);
  }
  return out;
}

function addSprite(track, index, id, x, spriteDefs) {
  const def = spriteDefs ? spriteDefs[id] : null;
  track.segments[index].sprites.push({
    id,
    x,                 // absolute normalized x (road centre of the section + offset)
    worldWidth: def ? def.worldWidth : 0,
    collide: def ? def.collide : 0,
  });
}

function placeSprites(track, info, spriteDefs) {
  const limit = info.forked ? info.len - forkLength() : info.len;
  for (const rule of info.section.sprites || []) {
    for (const [i, offset] of expandSpriteRule(rule, limit)) {
      addSprite(track, info.start + i, rule.sprite, info.baseX + offset, spriteDefs);
    }
  }
}

function markTransition(track, info, prevTheme) {
  if (!prevTheme || prevTheme === info.section.theme) return;
  const n = Math.min(CONFIG.theme.transitionSegments, info.len);
  for (let i = 0; i < n; i++) {
    const seg = track.segments[info.start + i];
    seg.themeFrom = prevTheme;
    seg.blend = (i + 1) / n;
  }
}

/** Branch centre offset from the section centre at fork position k (0..widen+split). */
export function forkOffset(k) {
  const { widenLength, splitLength, spread } = CONFIG.fork;
  if (k <= widenLength) return easeInOut(0, 1, k / widenLength);
  return easeInOut(1, spread, Math.min(1, (k - widenLength) / splitLength));
}

function shapeFork(track, info, spriteDefs) {
  const { widenLength, signLead, medianSignAt, signOffset } = CONFIG.fork;
  const total = forkLength();
  for (let k = 0; k < total; k++) {
    const seg = track.segments[info.forkStart + k];
    const a = forkOffset(k);
    const b = forkOffset(k + 1);
    // Before the decision the left branch is the main road, the right one is `alt`.
    seg.p1.world.x = (info.baseX - a) * ROAD_WIDTH;
    seg.p2.world.x = (info.baseX - b) * ROAD_WIDTH;
    seg.alt = { x1: info.baseX + a, x2: info.baseX + b };
    for (const rule of info.section.forkSprites || []) {
      if (k % rule.every !== 0) continue;
      addSprite(track, seg.index, rule.sprite, info.baseX - a - rule.offset, spriteDefs);
      addSprite(track, seg.index, rule.sprite, info.baseX + a + rule.offset, spriteDefs);
    }
  }
  const warn = info.forkStart - signLead;
  if (warn >= info.start) {
    addSprite(track, warn, 'signFork', info.baseX - signOffset, spriteDefs);
    addSprite(track, warn, 'signFork', info.baseX + signOffset, spriteDefs);
  }
  addSprite(track, info.forkStart + widenLength + medianSignAt, 'signFork', info.baseX, spriteDefs);
}

function shapeGhost(track, info, ghost) {
  const { ghostLength, ghostSpread } = CONFIG.fork;
  const n = Math.min(ghostLength, info.len);
  for (let k = 0; k < n; k++) {
    const seg = track.segments[info.start + k];
    seg.alt = {
      x1: ghost.fromX + ghost.side * ghostSpread * easeIn(0, 1, k / n),
      x2: ghost.fromX + ghost.side * ghostSpread * easeIn(0, 1, (k + 1) / n),
    };
  }
}

function addRunout(track, info) {
  const theme = info.section.theme;
  const y = lastY(track.segments);
  for (let i = 0; i < CONFIG.track.goalRunout; i++) {
    addSegment(track, 0, y, y, theme, info.index, info.baseX);
  }
}

/**
 * @param {{loop?:boolean}} [options]
 * @returns {{id:string, loop:boolean, segments:object[], length:number, sections:object[], sectionStarts:number[]}}
 */
export function createTrack(options = {}) {
  return { id: '', loop: !!options.loop, segments: [], length: 0, sections: [], sectionStarts: [] };
}

/**
 * Appends one section to the track.
 * @param {object} track from createTrack
 * @param {object} section section data (AGENTS.md §8.2)
 * @param {{spriteDefs?:object, baseX?:number, prevTheme?:string|null, gates?:boolean,
 *   ghost?:{side:number, fromX:number}|null}} [opts] baseX = road centre (normalized),
 *   ghost = unchosen branch of the previous fork drifting away to `side`
 * @returns {object} section info {index, id, section, start, len, baseX, forked, forkStart, decisionIndex, goalIndex}
 */
export function appendSection(track, section, opts = {}) {
  const baseX = opts.baseX || 0;
  const index = track.sections.length;
  const start = track.segments.length;
  for (const part of section.segments) addPart(track, part, section.theme, index, baseX);
  const len = track.segments.length - start;
  const forked = !!section.next;
  const info = {
    index, id: section.id, section, start, len, baseX, forked,
    forkStart: forked ? start + len - forkLength() : -1,
    decisionIndex: forked ? start + len - CONFIG.fork.splitLength : -1,
    goalIndex: section.goal ? start + len - 1 : -1,
    chosen: 0,
  };
  track.sections.push(info);
  track.sectionStarts.push(start);
  placeSprites(track, info, opts.spriteDefs);
  markTransition(track, info, opts.prevTheme || null);
  if (forked) shapeFork(track, info, opts.spriteDefs);
  if (opts.ghost) shapeGhost(track, info, opts.ghost);
  if (opts.gates && index > 0) addSprite(track, start, 'checkpointGate', baseX, opts.spriteDefs);
  if (section.goal && opts.gates) {
    addSprite(track, info.goalIndex, 'goalGate', baseX, opts.spriteDefs);
    addRunout(track, info);
  }
  track.length = track.segments.length * SEGMENT_LENGTH;
  track.id = track.id ? `${track.id}+${section.id}` : section.id;
  return info;
}

/**
 * Resolves a fork: `side` < 0 keeps the left branch, > 0 the right one. The
 * chosen branch becomes the main road; nothing moves on screen.
 * @param {object} track
 * @param {object} info section info of the forked section
 * @param {number} side -1 left, +1 right
 * @returns {{nextId:string, baseX:number, ghost:{side:number, fromX:number}}} data to append the next section
 */
export function applyForkDecision(track, info, side) {
  info.chosen = side;
  if (side > 0) {
    for (let i = info.forkStart; i < info.start + info.len; i++) {
      const seg = track.segments[i];
      const x1 = seg.p1.world.x / ROAD_WIDTH;
      const x2 = seg.p2.world.x / ROAD_WIDTH;
      seg.p1.world.x = seg.alt.x1 * ROAD_WIDTH;
      seg.p2.world.x = seg.alt.x2 * ROAD_WIDTH;
      seg.alt.x1 = x1;
      seg.alt.x2 = x2;
    }
  }
  const spread = CONFIG.fork.spread;
  return {
    nextId: side < 0 ? info.section.next.left : info.section.next.right,
    baseX: info.baseX + side * spread,
    ghost: { side: -side, fromX: info.baseX - side * spread },
  };
}

/**
 * Builds a track from one section or a list of sections without forks
 * (used for the looping test track and in tests).
 * @param {object|object[]} sectionOrList
 * @param {{loop?:boolean, spriteDefs?:object}} [options]
 */
export function buildTrack(sectionOrList, options = {}) {
  const sections = Array.isArray(sectionOrList) ? sectionOrList : [sectionOrList];
  const track = createTrack(options);
  let prev = null;
  for (const section of sections) {
    appendSection(track, section, { spriteDefs: options.spriteDefs, prevTheme: prev });
    prev = section.theme;
  }
  if (track.loop && sections.length > 1) markTransition(track, track.sections[0], prev);
  return track;
}

/**
 * Segment containing world position z (wraps on loops, clamps otherwise).
 * @param {{segments:object[], length:number, loop?:boolean}} track
 * @param {number} z
 */
export function findSegment(track, z) {
  const count = track.segments.length;
  if (track.loop !== false) return track.segments[Math.floor(wrap(z, track.length) / SEGMENT_LENGTH)];
  const i = Math.floor(z / SEGMENT_LENGTH);
  return track.segments[i < 0 ? 0 : i >= count ? count - 1 : i];
}

function segmentT(z) {
  return wrap(z, SEGMENT_LENGTH) / SEGMENT_LENGTH;
}

/**
 * Interpolated ground height at world position z.
 * @param {object} track
 * @param {number} z
 * @returns {number}
 */
export function groundHeight(track, z) {
  const seg = findSegment(track, z);
  return lerp(seg.p1.world.y, seg.p2.world.y, segmentT(z));
}

/**
 * Main road centre (normalized x) at z.
 * @param {object} track
 * @param {number} z
 * @returns {number}
 */
export function roadCenter(track, z) {
  const seg = findSegment(track, z);
  return lerp(seg.p1.world.x, seg.p2.world.x, segmentT(z)) / ROAD_WIDTH;
}

/**
 * Centre of the road nearest to x at z (main road or fork branch).
 * @param {object} track
 * @param {number} z
 * @param {number} x normalized
 * @returns {number}
 */
export function nearestRoadCenter(track, z, x) {
  const seg = findSegment(track, z);
  const t = segmentT(z);
  const main = lerp(seg.p1.world.x, seg.p2.world.x, t) / ROAD_WIDTH;
  if (!seg.alt) return main;
  const alt = lerp(seg.alt.x1, seg.alt.x2, t);
  return Math.abs(x - alt) < Math.abs(x - main) ? alt : main;
}

/**
 * Centre of the branch on `side` (-1 left, +1 right) at z; the main road when there is no fork.
 * @param {object} track
 * @param {number} z
 * @param {number} side
 * @returns {number}
 */
export function branchCenter(track, z, side) {
  const seg = findSegment(track, z);
  const t = segmentT(z);
  const main = lerp(seg.p1.world.x, seg.p2.world.x, t) / ROAD_WIDTH;
  if (!seg.alt || side === 0) return main;
  const alt = lerp(seg.alt.x1, seg.alt.x2, t);
  return side < 0 ? Math.min(main, alt) : Math.max(main, alt);
}
