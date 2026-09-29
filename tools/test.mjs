// Logic tests without a framework (node:assert only). Covers pure modules:
// math/projection, RNG, loop timing, params, keyboard/gamepad input, track
// building, themes/palettes, backgrounds, player physics, sprite data and
// projection, traffic AI, collisions and crashes, route data (AGENTS.md §8.3),
// forks, race rules, drift, scoring, particles, audio data and scheduling,
// passenger tasks, storage, menus and the state flow, touch controls, quality
// levels, dead-code and CONFIG guards, font data and road rasterization.

import assert from 'node:assert/strict';
import { CONFIG, SEGMENT_LENGTH, ROAD_WIDTH } from '../src/config.js';
import { clamp, lerp, easeIn, easeOut, easeInOut, wrap, cameraDepth, project } from '../src/engine/math.js';
import { createRng } from '../src/engine/rng.js';
import { createTimeState, advanceTime } from '../src/engine/loop.js';
import { parseParams } from '../src/engine/params.js';
import { ACTIONS, PAD_BUTTONS, createInput, applyDeadzone, FIXED_KEYS, REBINDABLE, DEFAULT_KEYS, KEY_SLOTS,
  normalizeBindings, assignKey, buildKeyMap, keyLabel } from '../src/engine/input.js';
import { buildTrack, findSegment, groundHeight, splitPart, expandSpriteRule, sectionLength } from '../src/world/track.js';
import { createPlayer, resetPlayer, updatePlayer, interpolatePlayer, gearAccel } from '../src/world/player.js';
import { PLAYER_CAR_ROWS, PLAYER_CAR_PALETTE, PLAYER_CAR_BODY_ROWS } from '../src/gfx/player-car.js';
import { buildCarFrames, steerFrameIndex, TURN_LEVELS } from '../src/gfx/car-frames.js';
import { TEST_SECTIONS } from '../src/data/test-track.js';
import { THEMES, THEME_ROLES, ROAD_ROLES } from '../src/data/themes.js';
import { WORLD_SPRITES, SPRITE_CHAR_ROLES } from '../src/gfx/world-sprites.js';
import { mixHex, parseHex, toHex, quantizeBlend, blendPalette, roadColors } from '../src/gfx/palette.js';
import { layerHeights, cloudList } from '../src/gfx/backgrounds.js';
import { BAYER4, skyBandAt } from '../src/render/sky.js';
import { projectSprite, projectVehicle, vehicleFrameIndex } from '../src/render/sprites.js';
import { VEHICLE_TYPES } from '../src/data/vehicles.js';
import { VEHICLE_SPRITES, VEHICLE_CHAR_ROLES, VEHICLE_VARIANTS } from '../src/gfx/vehicle-sprites.js';
import { buildVehicleFrames } from '../src/gfx/car-frames.js';
import { createTraffic, spawnTraffic, updateTraffic, wrapDelta, laneCenter } from '../src/world/traffic.js';
import { collidePlayerSprites, collidePlayerVehicles, boxesOverlap, playerHalfWidth,
  HIT_NONE, HIT_BUMP, HIT_SIDE, HIT_CRASH } from '../src/world/collision.js';
import { startCrash, isVulnerable, CRASH_NONE, CRASH_TUMBLE, CRASH_RECOVER } from '../src/world/player.js';
import { raceState } from '../src/state/race.js';
import { SECTIONS, SECTION_BY_ID } from '../src/data/sections.js';
import { GOALS } from '../src/data/goals.js';
import { TEXT } from '../src/data/text.js';
import { createTrack, appendSection, applyForkDecision, forkLength, forkOffset, roadCenter,
  nearestRoadCenter, branchCenter } from '../src/world/track.js';
import { createRace, startRace, updateRace, raceOver, sectionStages,
  RACE_RUNNING, RACE_TIME_UP, RACE_FINISHED } from '../src/game/race.js';
import { mapLayout } from '../src/render/hud.js';
import { pickStartSection } from '../src/state/boot.js';
import { manageTraffic, activeCount } from '../src/world/traffic.js';
import { endDrift, DRIFT_END_NONE, DRIFT_END_CLEAN, DRIFT_END_FAIL } from '../src/world/player.js';
import { createScore, updateScore, awardGoal } from '../src/game/score.js';
import { createParticles, updateParticles, emit, PARTICLE_SMOKE } from '../src/world/particles.js';
import { driftFrameIndex } from '../src/render/sprites.js';
import { SONGS, INSTRUMENT_SETS } from '../src/audio/songs.js';
import { noteFrequency, playNote, noteHold } from '../src/audio/synth.js';
import { parseTrack, compileSong, createSequencer, startSong, advanceSequencer, trackInstrument, PATTERN_STEPS } from '../src/audio/sequencer.js';
import { EFFECTS, SFX_INSTRUMENTS, engineParams, playEffect, updateCarSounds, radioNext, radioStatus } from '../src/audio/sfx.js';
import { unlockAudio, audioState } from '../src/audio/mixer.js';
import { TASKS, PASSENGER_LINES } from '../src/data/tasks.js';
import { TIME_UP_ENDINGS } from '../src/data/goals.js';
import { sectionStats, taskFits, candidateTasks, pickTask, createPassenger, startPassenger, beginTask,
  updatePassenger, sectionChanged, finishTask, endingTier, taskProgress } from '../src/game/passenger.js';
import { countOvertakes } from '../src/world/traffic.js';
import { awardPassenger } from '../src/game/score.js';
import { createStore, saveStore, sanitize, qualifies, addHighscore, defaultData } from '../src/storage.js';
import { createMenu, menuStep, applySettings, MENU_ITEMS } from '../src/state/menu.js';
import { pauseStep } from '../src/state/pause.js';
import { nameStep, nameOf, charsOf } from '../src/state/name-entry.js';
import { createAutopilot, autopilotControls } from '../src/game/autopilot.js';
import { registerState, setState, updateState, getStateName } from '../src/state/machine.js';
import { bootState, buildDemoParams } from '../src/state/boot.js';
import { titleState } from '../src/state/title.js';
import { menuState } from '../src/state/menu.js';
import { pauseState } from '../src/state/pause.js';
import { nameEntryState } from '../src/state/name-entry.js';
import { goalState, gameOverState } from '../src/state/result.js';
import { toBuffer, createTouchState, resolveTouches } from '../src/engine/touch.js';
import { controlsState, applyCapturedKey } from '../src/state/controls.js';
import { helpState, helpStep } from '../src/state/help.js';
import { aboutStep } from '../src/state/about.js';
import { ABOUT_LINES, SOURCE_URL } from '../src/data/text.js';
import { ACTION_NAMES, PAD_NAMES, HELP_PAGES } from '../src/data/text.js';
import { STORE } from '../src/storage.js';
import { roadQuality, setRoadQuality } from '../src/render/road.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GLYPHS, GLYPH_W, GLYPH_H, hasGlyphs } from '../src/render/font.js';
import { renderRoad, prepareTrackColors, roadStats, CAMERA_DEPTH } from '../src/render/road.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ok   ${name}\n`);
  } catch (err) {
    failed++;
    process.stdout.write(`  FAIL ${name}\n       ${err.message.split('\n').join('\n       ')}\n`);
  }
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- config
test('config: coordinate constants match spec', () => {
  assert.equal(SEGMENT_LENGTH, 200);
  assert.equal(ROAD_WIDTH, 2000);
  assert.equal(CONFIG.screen.width, 320);
  assert.equal(CONFIG.screen.height, 240);
  assert.ok(near(CONFIG.loop.dt, 1 / 60));
  assert.equal(CONFIG.loop.maxStepsPerFrame, 5);
});

// ---------------------------------------------------------------- math
test('math: clamp / lerp / wrap', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
  assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(wrap(250, 100), 50);
  assert.equal(wrap(-30, 100), 70);
  assert.equal(wrap(100, 100), 0);
});

test('math: easing endpoints and monotonicity', () => {
  for (const f of [easeIn, easeOut, easeInOut]) {
    assert.ok(near(f(2, 8, 0), 2));
    assert.ok(near(f(2, 8, 1), 8));
    let prev = -Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = f(0, 1, t);
      assert.ok(v >= prev - 1e-12, `${f.name} not monotonic at t=${t}`);
      prev = v;
    }
  }
});

test('math: projection of known points', () => {
  const W = 320;
  const H = 240;
  const d = cameraDepth(90);
  assert.ok(near(d, 1));
  const p = { world: { x: 0, y: 0, z: 1000 }, camera: {}, screen: {} };
  project(p, 0, 1000, 0, d, W, H, ROAD_WIDTH);
  assert.ok(near(p.screen.x, 160));
  assert.ok(near(p.screen.y, 240), `y=${p.screen.y}`);        // 45° down → bottom edge
  assert.ok(near(p.screen.w, ROAD_WIDTH / 1000 * 160));
  // A point at camera height projects onto the horizon line.
  const q = { world: { x: 0, y: 500, z: 5000 }, camera: {}, screen: {} };
  project(q, 0, 500, 0, d, W, H, ROAD_WIDTH);
  assert.ok(near(q.screen.y, 120));
  // Lateral offset: camera right of centre → road centre moves left.
  project(q, 1000, 500, 0, d, W, H, ROAD_WIDTH);
  assert.ok(q.screen.x < 160);
  // Farther points are smaller.
  const far = { world: { x: 0, y: 0, z: 4000 }, camera: {}, screen: {} };
  project(far, 0, 1000, 0, d, W, H, ROAD_WIDTH);
  assert.ok(far.screen.w < p.screen.w);
  assert.ok(far.screen.y < p.screen.y);
});

// ---------------------------------------------------------------- rng
test('rng: deterministic per seed, in range', () => {
  const a = createRng(1234);
  const b = createRng(1234);
  const c = createRng(4321);
  const sa = [];
  const sc = [];
  for (let i = 0; i < 100; i++) {
    const v = a.next();
    assert.ok(v >= 0 && v < 1);
    assert.equal(v, b.next());
    sa.push(v);
    sc.push(c.next());
  }
  assert.notDeepEqual(sa, sc);
  a.seed(7);
  b.seed(7);
  assert.equal(a.int(1, 6), b.int(1, 6));
  for (let i = 0; i < 200; i++) {
    const n = a.int(1, 6);
    assert.ok(n >= 1 && n <= 6 && Number.isInteger(n));
  }
});

// ---------------------------------------------------------------- loop
test('loop: fixed steps, accumulation and spiral guard', () => {
  const ts = createTimeState();
  let count = 0;
  const up = () => { count++; };
  assert.equal(advanceTime(ts, 1 / 60 + 1e-9, up), 1);
  assert.equal(advanceTime(ts, 0.005, up), 0);
  assert.equal(advanceTime(ts, 0.005, up), 0);
  assert.equal(advanceTime(ts, 0.008, up), 1);         // 18 ms accumulated
  assert.ok(ts.alpha >= 0 && ts.alpha < 1);
  const steps = advanceTime(ts, 10, up);               // tab was away
  assert.equal(steps, CONFIG.loop.maxStepsPerFrame);
  assert.equal(ts.acc, 0);                             // backlog dropped
  assert.equal(advanceTime(ts, -1, up), 0);            // clock going backwards is ignored
  assert.equal(count, 2 + CONFIG.loop.maxStepsPerFrame);
});

// ---------------------------------------------------------------- params
test('params: parse debug URL parameters', () => {
  const p = parseParams('?debug=1&section=c2&seed=1234&mute=1&god=1&passenger=1&test=1');
  assert.deepEqual(p, { debug: true, section: 'C2', seed: 1234, mute: true, god: true, passenger: true, test: true });
  const d = parseParams('');
  assert.deepEqual(d, { debug: false, section: null, seed: null, mute: false, god: false, passenger: false, test: false });
  assert.equal(parseParams('?debug=0').debug, false);
  assert.equal(parseParams('?seed=abc').seed, null);
});

// ---------------------------------------------------------------- input
function fakeTarget() {
  const handlers = {};
  return {
    handlers,
    addEventListener(type, fn) { handlers[type] = fn; },
  };
}

test('input: every binding targets a known action, every action is bound', () => {
  const bound = new Set();
  for (const [code, actions] of Object.entries(buildKeyMap(DEFAULT_KEYS))) {
    for (const a of actions) {
      assert.ok(ACTIONS.includes(a), `${code} → unknown action ${a}`);
      bound.add(a);
    }
  }
  for (const a of ACTIONS) assert.ok(bound.has(a), `action ${a} has no key`);
});

test('input: held state, press edges, shared keys, reset', () => {
  const t = fakeTarget();
  const input = createInput(t);
  const ev = (code) => ({ code, preventDefault() {} });
  t.handlers.keydown(ev('ArrowUp'));
  assert.ok(input.isDown('accelerate'));
  assert.ok(input.wasPressed('accelerate'));
  input.endStep();
  assert.ok(!input.wasPressed('accelerate'));
  t.handlers.keydown(ev('ArrowUp'));                   // auto-repeat: no new edge
  assert.ok(!input.wasPressed('accelerate'));
  t.handlers.keydown(ev('KeyW'));                      // second key, same action
  t.handlers.keyup(ev('ArrowUp'));
  assert.ok(input.isDown('accelerate'));
  t.handlers.keyup(ev('KeyW'));
  assert.ok(!input.isDown('accelerate'));
  t.handlers.keydown(ev('Space'));
  assert.ok(input.isDown('drift') && input.isDown('confirm'));
  t.handlers.blur();
  assert.ok(!input.isDown('drift') && !input.isDown('confirm'));
  t.handlers.keydown(ev('KeyZ'));                      // unbound key ignored
});

function fakePad(buttons = {}, axes = [0, 0, 0, 0]) {
  const b = [];
  for (let i = 0; i < 17; i++) {
    const v = buttons[i] || 0;
    b.push({ pressed: v >= 0.5, value: v });
  }
  return { id: 'Test Pad', connected: true, mapping: 'standard', buttons: b, axes };
}

test('input: gamepad buttons map to actions with edges and analog values', () => {
  const pads = [null, null];
  const input = createInput(fakeTarget(), () => pads);
  input.poll();
  assert.ok(!input.pad.connected);
  pads[1] = fakePad({ 0: 1 });                            // A pressed, pad hot-plugged
  input.poll();
  assert.ok(input.pad.connected);
  assert.ok(input.isDown('accelerate') && input.wasPressed('accelerate') && input.isDown('confirm'));
  input.endStep();
  input.poll();
  assert.ok(input.isDown('accelerate') && !input.wasPressed('accelerate'));
  pads[1] = fakePad({ 7: 0.4 });                          // half right trigger
  input.poll();
  assert.ok(input.isDown('accelerate'));
  assert.ok(near(input.value('accelerate'), 0.4));
  pads[1] = fakePad({ 3: 1 });                            // Y → gear toggle
  input.poll();
  assert.ok(input.wasPressed('gearToggle'));
  pads[1] = null;                                          // unplugged
  input.endStep();
  input.poll();
  assert.ok(!input.pad.connected && !input.isDown('accelerate') && !input.isDown('gearToggle'));
});

test('input: stick steering with dead zone, D-pad and keys give full lock', () => {
  const pads = [fakePad({}, [0.1, 0, 0, 0])];
  const input = createInput(fakeTarget(), () => pads);
  input.poll();
  assert.equal(input.steer(), 0);                          // inside dead zone
  pads[0] = fakePad({}, [-0.6, 0, 0, 0]);
  input.poll();
  const s = input.steer();
  assert.ok(s < -0.4 && s > -0.6, `analog steer ${s}`);
  assert.ok(input.isDown('left'));                         // digital for menus
  pads[0] = fakePad({ 15: 1 });
  input.poll();
  assert.equal(input.steer(), 1);
  input.onKeyDown({ code: 'ArrowLeft' });
  pads[0] = fakePad();
  input.poll();
  assert.equal(input.steer(), -1);
  assert.equal(applyDeadzone(1, 0.2), 1);
  assert.equal(applyDeadzone(-0.2, 0.2), 0);
  for (const [a, idx] of Object.entries(PAD_BUTTONS)) {
    assert.ok(ACTIONS.includes(a));
    for (const i of idx) assert.ok(i >= 0 && i <= 16);
  }
});

// ---------------------------------------------------------------- data
const HEX = /^#[0-9a-f]{6}$/i;
const LAYER_TYPES = ['clouds', 'mountains', 'hills', 'mesas', 'forest'];
const ALL_PARTS = TEST_SECTIONS.flatMap((s) => s.segments);

test('data: test sections are valid and the loop closes', () => {
  let hills = 0;
  for (const section of TEST_SECTIONS) {
    assert.ok(THEMES[section.theme], `${section.id}: theme ${section.theme} missing`);
    for (const part of section.segments) {
      assert.ok(Number.isInteger(part.len) && part.len > 0, `${section.id}: bad len ${part.len}`);
      assert.ok(Math.abs(part.curve) <= CONFIG.track.maxCurve, `${section.id}: curve ${part.curve} out of range`);
      assert.equal(typeof part.hill, 'number');
      hills += part.hill;
    }
  }
  assert.equal(hills, 0, 'hills must sum to 0 on a looping track');
});

test('data: section sprite rules reference existing sprites inside the section', () => {
  for (const section of TEST_SECTIONS) {
    const len = sectionLength(section);
    for (const rule of section.sprites) {
      assert.ok(WORLD_SPRITES[rule.sprite], `${section.id}: unknown sprite ${rule.sprite}`);
      assert.ok(['left', 'right', 'both'].includes(rule.side), `${section.id}: bad side ${rule.side}`);
      assert.ok(rule.offset > 1, `${section.id}: ${rule.sprite} offset ${rule.offset} is on the road`);
      if (typeof rule.at === 'number') {
        assert.ok(rule.at >= 0 && rule.at < len, `${section.id}: at ${rule.at} outside section`);
      } else {
        assert.ok(rule.every > 0 && rule.from >= 0 && rule.from < len, `${section.id}: bad range rule`);
      }
    }
  }
  assert.deepEqual(expandSpriteRule({ at: 3, side: 'both', offset: 1.5 }, 10), [[3, -1.5], [3, 1.5]]);
  assert.deepEqual(expandSpriteRule({ every: 4, from: 1, to: 20, side: 'left', offset: 2 }, 10), [[1, -2], [5, -2], [9, -2]]);
});

test('data: at least 3 themes, 32–64 colour palettes with every role', () => {
  const keys = Object.keys(THEMES);
  assert.ok(keys.length >= 3, `only ${keys.length} themes`);
  assert.ok(THEME_ROLES.length >= 32 && THEME_ROLES.length <= 64);
  for (const key of keys) {
    const t = THEMES[key];
    const pal = t.palette;
    const roles = Object.keys(pal);
    assert.ok(roles.length >= 32 && roles.length <= 64, `${key}: ${roles.length} colours`);
    for (const r of THEME_ROLES) assert.match(pal[r] || '', HEX, `${key}.palette.${r}`);
    for (const r of roles) assert.ok(THEME_ROLES.includes(r), `${key}: unknown role ${r}`);
    for (const b of t.sky.bands) assert.ok(pal[b], `${key}: sky band ${b}`);
    assert.ok(t.sky.bands.length >= 2);
    for (const l of t.layers) {
      assert.ok(LAYER_TYPES.includes(l.type), `${key}: layer type ${l.type}`);
      assert.ok(pal[l.main] && pal[l.shade], `${key}: layer colours`);
      assert.ok(l.slot >= 0 && l.slot < CONFIG.sky.layerSpeeds.length, `${key}: layer slot ${l.slot}`);
      assert.ok(l.height > 0 && l.height < CONFIG.screen.height / 2);
    }
  }
  for (const variant of ['light', 'dark']) {
    for (const role of Object.values(ROAD_ROLES[variant])) assert.ok(role === null || THEME_ROLES.includes(role));
  }
});

test('data: roadside sprites are rectangular, use theme roles and stand on the ground', () => {
  for (const [id, def] of Object.entries(WORLD_SPRITES)) {
    assert.ok(def.worldWidth > 0, `${id}.worldWidth`);
    const w = def.rows[0].length;
    for (const row of def.rows) {
      assert.equal(row.length, w, `${id}: ragged row`);
      for (const ch of row) assert.ok(ch === '.' || SPRITE_CHAR_ROLES[ch], `${id}: unknown pixel '${ch}'`);
    }
    assert.ok(/[^.]/.test(def.rows[def.rows.length - 1]), `${id}: bottom row empty (sprite would float)`);
    assert.ok(/[^.]/.test(def.rows[0]), `${id}: top row empty (not cropped)`);
  }
  for (const role of Object.values(SPRITE_CHAR_ROLES)) assert.ok(THEME_ROLES.includes(role), `sprite role ${role}`);
});

// ---------------------------------------------------------------- palette
test('palette: hex round trip, mixing and quantized cached blends', () => {
  assert.deepEqual(parseHex('#12ab7f'), [0x12, 0xab, 0x7f]);
  assert.equal(toHex(1, 2, 255), '#0102ff');
  assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mixHex('#000000', '#646464', 0.5), '#323232');
  assert.equal(quantizeBlend(0.51), Math.round(0.51 * CONFIG.theme.blendSteps) / CONFIG.theme.blendSteps);
  assert.equal(quantizeBlend(2), 1);
  assert.equal(blendPalette('coastDay', 'desertNoon', 1), THEMES.desertNoon.palette);
  assert.equal(blendPalette('coastDay', 'desertNoon', 0), THEMES.coastDay.palette);
  const mid = blendPalette('coastDay', 'desertNoon', 0.5);
  assert.equal(mid, blendPalette('coastDay', 'desertNoon', 0.5), 'blend not cached');
  assert.equal(mid.grass, mixHex(THEMES.coastDay.palette.grass, THEMES.desertNoon.palette.grass, 0.5));
  const rc = roadColors('coastDay', 'coastDay', 1);
  assert.equal(rc.light.grass, THEMES.coastDay.palette.grass);
  assert.equal(rc.dark.lane, null);
});

// ---------------------------------------------------------------- sky and backgrounds
test('sky: Bayer 4x4 matrix and dithered bands', () => {
  assert.deepEqual([...BAYER4].sort((a, b) => a - b), [...Array(16).keys()]);
  const hz = 120;
  assert.equal(skyBandAt(0, 0, 5, hz), 0);
  assert.equal(skyBandAt(3, hz, 5, hz), 4);
  assert.equal(skyBandAt(3, 200, 5, hz), 4);
  // Halfway between bands 1 and 2 about half of a 4x4 block uses each band.
  const y0 = Math.round(hz * 1.5 / 4);
  let upper = 0;
  for (let y = y0; y < y0 + 4; y++) for (let x = 0; x < 4; x++) if (skyBandAt(x, y, 5, hz) === 2) upper++;
  assert.ok(upper >= 4 && upper <= 12, `dither mix ${upper}/16`);
  // Band index never decreases going down a column.
  for (let x = 0; x < 4; x++) {
    let prev = 0;
    for (let y = 0; y < hz; y += 4) {
      const b = skyBandAt(x, y, 5, hz);
      assert.ok(b >= prev);
      prev = b;
    }
  }
});

test('backgrounds: layer heights bounded, deterministic, seamless tiles', () => {
  const W = CONFIG.sky.layerWidth;
  for (const theme of Object.values(THEMES)) {
    for (const def of theme.layers) {
      if (def.type === 'clouds') {
        assert.deepEqual(cloudList(def, W), cloudList(def, W));
        continue;
      }
      const h = layerHeights(def, W);
      assert.deepEqual(h, layerHeights(def, W));
      let maxJump = 0;
      for (let x = 0; x < W; x++) {
        assert.ok(h[x] >= 0 && h[x] <= def.height, `${def.type} height ${h[x]}`);
        maxJump = Math.max(maxJump, Math.abs(h[(x + 1) % W] - h[x]));
      }
      if (def.type !== 'forest' && def.type !== 'mesas') {
        assert.ok(Math.abs(h[0] - h[W - 1]) <= Math.max(2, maxJump), `${def.type} seam jump ${h[0]} vs ${h[W - 1]}`);
      }
    }
  }
});

// ---------------------------------------------------------------- track
const track = buildTrack(TEST_SECTIONS, { loop: true, spriteDefs: WORLD_SPRITES });
prepareTrackColors(track);

test('track: segment count, length and z coordinates', () => {
  const total = ALL_PARTS.reduce((s, p) => s + p.len, 0);
  assert.equal(track.segments.length, total);
  assert.equal(track.length, total * SEGMENT_LENGTH);
  track.segments.forEach((s, i) => {
    assert.equal(s.index, i);
    assert.equal(s.p1.world.z, i * SEGMENT_LENGTH);
    assert.equal(s.p2.world.z, (i + 1) * SEGMENT_LENGTH);
  });
});

test('track: sections tag themes, sprites land on the right segments', () => {
  let start = 0;
  TEST_SECTIONS.forEach((section, si) => {
    const len = sectionLength(section);
    assert.equal(track.sectionStarts[si], start);
    let expected = 0;
    for (const rule of section.sprites) expected += expandSpriteRule(rule, len).length;
    let placed = 0;
    for (let i = start; i < start + len; i++) {
      assert.equal(track.segments[i].theme, section.theme);
      placed += track.segments[i].sprites.length;
      for (const spr of track.segments[i].sprites) assert.equal(spr.worldWidth, WORLD_SPRITES[spr.id].worldWidth);
    }
    assert.equal(placed, expected, `${section.id} sprite count`);
    start += len;
  });
});

test('track: theme transition zone blends smoothly from the previous section', () => {
  const zone = CONFIG.theme.transitionSegments;
  TEST_SECTIONS.forEach((section, si) => {
    const prev = TEST_SECTIONS[(si + TEST_SECTIONS.length - 1) % TEST_SECTIONS.length];
    const s0 = track.sectionStarts[si];
    let last = 0;
    for (let i = 0; i < zone; i++) {
      const seg = track.segments[s0 + i];
      assert.equal(seg.themeFrom, prev.theme);
      assert.ok(seg.blend > last && seg.blend <= 1, `blend not increasing at ${s0 + i}`);
      last = seg.blend;
    }
    assert.equal(last, 1);
    const after = track.segments[s0 + zone];
    assert.equal(after.blend, 1);
  });
  // Road colours of neighbouring segments never jump by more than one blend step.
  const step = 1 / CONFIG.theme.blendSteps;
  for (let i = 1; i < track.segments.length; i++) {
    const a = track.segments[i - 1];
    const b = track.segments[i];
    if (a.theme !== b.theme && b.blend > step + 1e-9) assert.fail(`hard theme cut at ${i}`);
  }
  assert.ok(track.segments.every((s) => s.colors && HEX.test(s.colors.grass)));
});

test('track: split into ease-in / hold / ease-out', () => {
  assert.deepEqual(splitPart(100), { enter: 25, hold: 50, leave: 25 });
  assert.deepEqual(splitPart(2), { enter: 0, hold: 2, leave: 0 });
  for (const len of [1, 3, 7, 50, 81]) {
    const s = splitPart(len);
    assert.equal(s.enter + s.hold + s.leave, len);
  }
});

test('track: height is continuous and accumulates per part', () => {
  const segs = track.segments;
  for (let i = 1; i < segs.length; i++) {
    assert.equal(segs[i].p1.world.y, segs[i - 1].p2.world.y, `height step at segment ${i}`);
  }
  let idx = 0;
  let y = 0;
  for (const part of ALL_PARTS) {
    idx += part.len;
    y += part.hill * CONFIG.track.hillScale;
    assert.ok(near(segs[idx - 1].p2.world.y, y, 1e-6), `part end height at ${idx}`);
  }
  assert.ok(near(segs[segs.length - 1].p2.world.y, segs[0].p1.world.y, 1e-6), 'loop seam height');
});

test('track: curvature changes smoothly (no steps on joins)', () => {
  const segs = track.segments;
  let maxDelta = 0;
  for (let i = 0; i < segs.length; i++) {
    const next = segs[(i + 1) % segs.length];
    maxDelta = Math.max(maxDelta, Math.abs(next.curve - segs[i].curve));
  }
  assert.ok(maxDelta <= 0.75, `max curve delta ${maxDelta.toFixed(3)}`);
});

test('track: findSegment and groundHeight wrap and interpolate', () => {
  assert.equal(findSegment(track, 0).index, 0);
  assert.equal(findSegment(track, 399).index, 1);
  assert.equal(findSegment(track, track.length + 10).index, 0);
  assert.equal(findSegment(track, -1).index, track.segments.length - 1);
  const s = track.segments[400];
  const mid = groundHeight(track, s.p1.world.z + SEGMENT_LENGTH / 2);
  assert.ok(near(mid, (s.p1.world.y + s.p2.world.y) / 2, 1e-6));
});

test('track: rumble stripes alternate every rumbleLength segments', () => {
  const L = CONFIG.road.rumbleLength;
  for (let i = 0; i < 4 * L; i++) {
    assert.equal(track.segments[i].dark, Math.floor(i / L) % 2 === 1);
  }
});

// ---------------------------------------------------------------- player
const straight = buildTrack({ id: 'STRAIGHT', theme: 'coastDay', segments: [{ len: 2000, curve: 0, hill: 0 }] });
const bend = buildTrack({ id: 'BEND', theme: 'coastDay', segments: [{ len: 4000, curve: 4, hill: 0 }] });
const DT = CONFIG.loop.dt;
const P = CONFIG.player;

function drive(p, c, trk, seconds, rng = createRng(1)) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) updatePlayer(p, c, trk, DT, rng);
  return p;
}
const ctl = (o = {}) => ({ throttle: 0, brake: 0, steer: 0, gearToggle: false, ...o });

// Constant-curve segment in the middle of a part (outside ease zones).
function holdCurvePlayer(gear) {
  const p = createPlayer();
  resetPlayer(p, 1500 * SEGMENT_LENGTH);
  p.gear = gear;
  return p;
}

test('player: accelerates from standstill and reaches LOW v-max, not more', () => {
  const p = createPlayer();
  drive(p, ctl({ throttle: 1 }), straight, 1);
  assert.ok(p.speed > 2000, `speed after 1s ${p.speed}`);
  drive(p, ctl({ throttle: 1 }), straight, 20);
  assert.equal(p.gear, 'LOW');
  assert.equal(p.speed, P.gears.LOW.maxSpeed);
});

test('player: HIGH reaches higher v-max than LOW, LOW accelerates faster from 0', () => {
  const low = createPlayer();
  const high = createPlayer();
  high.gear = 'HIGH';
  drive(low, ctl({ throttle: 1 }), straight, 1.5);
  drive(high, ctl({ throttle: 1 }), straight, 1.5);
  assert.ok(low.speed > high.speed * 1.5, `LOW ${low.speed.toFixed(0)} vs HIGH ${high.speed.toFixed(0)} after 1.5 s`);
  drive(high, ctl({ throttle: 1 }), straight, 30);
  assert.equal(high.speed, P.gears.HIGH.maxSpeed);
  assert.ok(P.gears.HIGH.maxSpeed > P.gears.LOW.maxSpeed);
  assert.equal(gearAccel(P.gears.LOW, P.gears.LOW.maxSpeed), 0);
});

test('player: gear toggle and downshift bleeds speed to LOW v-max', () => {
  const p = createPlayer();
  p.gear = 'HIGH';
  p.speed = P.gears.HIGH.maxSpeed;
  const rng = createRng(1);
  updatePlayer(p, ctl({ throttle: 1, gearToggle: true }), straight, DT, rng);
  assert.equal(p.gear, 'LOW');
  assert.ok(p.speed < P.gears.HIGH.maxSpeed && p.speed > P.gears.LOW.maxSpeed);
  drive(p, ctl({ throttle: 1 }), straight, 5, rng);
  assert.equal(p.speed, P.gears.LOW.maxSpeed);
});

test('player: brake stops the car, coasting slows it', () => {
  const p = createPlayer();
  p.gear = 'HIGH';
  p.speed = 10000;
  drive(p, ctl(), straight, 1);
  assert.ok(p.speed < 10000 && p.speed > 5000, `coast ${p.speed}`);
  drive(p, ctl({ brake: 1 }), straight, 2);
  assert.equal(p.speed, 0);
});

test('player: centrifugal force pushes outward and needs counter-steer', () => {
  const free = holdCurvePlayer('HIGH');
  free.speed = 9000;
  drive(free, ctl({ throttle: 1 }), bend, 1);
  assert.ok(free.x < -0.8, `no steer: x=${free.x.toFixed(2)} (right curve pushes left)`);
  const held = holdCurvePlayer('HIGH');
  held.speed = 9000;
  drive(held, ctl({ throttle: 1, steer: 1 }), bend, 1);
  assert.ok(Math.abs(held.x) < Math.abs(free.x) / 2, `with steer: x=${held.x.toFixed(2)}`);
  const slow = holdCurvePlayer('LOW');
  slow.speed = 2000;
  drive(slow, ctl({ throttle: 0.2 }), bend, 1);
  assert.ok(Math.abs(slow.x) < 0.1, `slow car barely pushed: x=${slow.x.toFixed(2)}`);
});

test('player: off-road drags speed down hard', () => {
  const p = createPlayer();
  p.gear = 'HIGH';
  p.speed = P.gears.HIGH.maxSpeed;
  p.x = 1.5;
  drive(p, ctl({ throttle: 1 }), straight, 0.5);
  assert.ok(p.offRoad);
  assert.ok(p.speed < 0.75 * P.gears.HIGH.maxSpeed, `after 0.5 s off-road ${p.speed.toFixed(0)}`);
  drive(p, ctl({ throttle: 1 }), straight, 1.5);
  assert.ok(p.speed <= P.offRoadMaxSpeed + 1, `off-road speed ${p.speed}`);
  const q = createPlayer();
  q.gear = 'HIGH';
  q.speed = P.gears.HIGH.maxSpeed;
  drive(q, ctl({ throttle: 1 }), straight, 1);
  assert.ok(!q.offRoad && q.speed === P.gears.HIGH.maxSpeed);
});

test('player: uphill slows, lateral clamp, no steering at standstill', () => {
  const hill = buildTrack({ id: 'HILL', theme: 'coastDay', segments: [{ len: 400, curve: 0, hill: 60 }] });
  const up = createPlayer();
  resetPlayer(up, 200 * SEGMENT_LENGTH);
  up.gear = 'HIGH';
  up.speed = 8000;
  const flat = createPlayer();
  resetPlayer(flat, 200 * SEGMENT_LENGTH);
  flat.gear = 'HIGH';
  flat.speed = 8000;
  drive(up, ctl({ throttle: 1 }), hill, 0.5);
  drive(flat, ctl({ throttle: 1 }), straight, 0.5);
  assert.ok(up.speed < flat.speed, `uphill ${up.speed.toFixed(0)} vs flat ${flat.speed.toFixed(0)}`);
  const s = createPlayer();
  drive(s, ctl({ steer: 1 }), straight, 1);
  assert.equal(s.x, 0);
  s.speed = P.maxSpeed;
  s.gear = 'HIGH';
  drive(s, ctl({ throttle: 1, steer: -1 }), straight, 10);
  assert.equal(s.x, -P.maxX);
});

test('player: deterministic for the same seed, bounce bounded', () => {
  const run = (seed) => {
    const p = createPlayer();
    const rng = createRng(seed);
    const trace = [];
    for (let i = 0; i < 600; i++) {
      updatePlayer(p, ctl({ throttle: 1, steer: i % 120 < 60 ? 1 : -1 }), track, DT, rng);
      assert.ok(Math.abs(p.bounce) <= P.bounce.offRoadAmp);
      trace.push(p.z, p.x, p.bounce);
    }
    return trace;
  };
  assert.deepEqual(run(99), run(99));
});

test('player: interpolation wraps the track seam', () => {
  const p = createPlayer();
  p.prevZ = track.length - 100;
  p.z = 100;
  const out = { z: 0, x: 0 };
  interpolatePlayer(p, 0.5, track.length, out);
  assert.ok(near(out.z, 0), `got ${out.z}`);
});

// ---------------------------------------------------------------- sprites
test('sprites: player car data is rectangular and uses palette colours', () => {
  const w = PLAYER_CAR_ROWS[0].length;
  for (const row of PLAYER_CAR_ROWS) {
    assert.equal(row.length, w);
    for (const ch of row) assert.ok(ch === '.' || PLAYER_CAR_PALETTE[ch], `unknown pixel '${ch}'`);
  }
  for (const c of Object.values(PLAYER_CAR_PALETTE)) assert.match(c, /^#[0-9a-f]{6}$/i);
});

test('sprites: 3 turn frames per side, same size, straight frame unchanged', () => {
  const frames = buildCarFrames(PLAYER_CAR_ROWS, PLAYER_CAR_BODY_ROWS);
  assert.equal(frames.length, 2 * TURN_LEVELS + 1);
  assert.ok(TURN_LEVELS >= 3);
  const w = frames[0][0].length;
  for (const f of frames) {
    assert.equal(f.length, PLAYER_CAR_ROWS.length);
    for (const row of f) assert.equal(row.length, w);
  }
  const pad = (w - PLAYER_CAR_ROWS[0].length) / 2;
  PLAYER_CAR_ROWS.forEach((row, y) => assert.equal(frames[TURN_LEVELS][y].slice(pad, pad + row.length), row));
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) assert.notDeepEqual(frames[i], frames[j], `frames ${i} and ${j} identical`);
  }
});

test('sprites: steer maps to frame index symmetrically', () => {
  assert.equal(steerFrameIndex(0), TURN_LEVELS);
  assert.equal(steerFrameIndex(-1), 0);
  assert.equal(steerFrameIndex(1), 2 * TURN_LEVELS);
  assert.equal(steerFrameIndex(0.3), TURN_LEVELS + 1);
  assert.equal(steerFrameIndex(-0.6), TURN_LEVELS - 2);
});

// ---------------------------------------------------------------- vehicles data
test('vehicles: at least 3 types with sprites, sizes and speed ranges', () => {
  const keys = Object.keys(VEHICLE_TYPES);
  assert.ok(keys.length >= 3, `only ${keys.length} vehicle types`);
  for (const k of keys) {
    const t = VEHICLE_TYPES[k];
    assert.ok(VEHICLE_SPRITES[t.sprite], `${k}: sprite ${t.sprite}`);
    assert.ok(t.worldWidth > 0 && t.length > 0);
    assert.ok(t.speedMin > 0 && t.speedMax >= t.speedMin && t.speedMax < CONFIG.player.maxSpeed);
    assert.ok(t.worldWidth / (2 * CONFIG.road.roadWidth) < 1 / CONFIG.road.lanes, `${k} wider than a lane`);
  }
});

test('vehicles: sprite data rectangular, palette roles valid, frames consistent', () => {
  for (const r of Object.values(VEHICLE_CHAR_ROLES)) assert.ok(THEME_ROLES.includes(r), `role ${r}`);
  for (const [main, shade] of VEHICLE_VARIANTS) assert.ok(THEME_ROLES.includes(main) && THEME_ROLES.includes(shade));
  for (const [id, def] of Object.entries(VEHICLE_SPRITES)) {
    const w = def.rows[0].length;
    for (const row of def.rows) {
      assert.equal(row.length, w, `${id}: ragged row`);
      for (const ch of row) assert.ok(ch === '.' || ch === 'B' || ch === 'b' || VEHICLE_CHAR_ROLES[ch], `${id}: pixel '${ch}'`);
    }
    assert.ok(/[^.]/.test(def.rows[def.rows.length - 1]), `${id}: floats above ground`);
    const frames = buildVehicleFrames(def.rows, def.bodyRows, CONFIG.sprites.vehicleSideLevels, CONFIG.sprites.vehicleSidePx);
    assert.equal(frames.length, 2 * CONFIG.sprites.vehicleSideLevels + 1);
    for (const f of frames) assert.equal(f[0].length, frames[0][0].length);
  }
  const mid = CONFIG.sprites.vehicleSideLevels;
  assert.equal(vehicleFrameIndex(CONFIG.screen.width / 2), mid);
  assert.equal(vehicleFrameIndex(0), 0);
  assert.equal(vehicleFrameIndex(CONFIG.screen.width), 2 * mid);
});

test('vehicles: section traffic references known types', () => {
  for (const section of TEST_SECTIONS) {
    const t = section.traffic;
    assert.ok(t && t.density >= 0 && t.density <= 1, `${section.id}: density`);
    for (const k of t.types) assert.ok(VEHICLE_TYPES[k], `${section.id}: unknown vehicle ${k}`);
  }
});

// ---------------------------------------------------------------- traffic
function trafficOverlaps(traffic, length) {
  const list = traffic.vehicles.filter((v) => v.active);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (boxesOverlap(wrapDelta(b.z - a.z, length), b.x - a.x, a.halfLen + b.halfLen, a.halfW + b.halfW)) {
        return `${a.typeKey}@${a.z.toFixed(0)},${a.x.toFixed(2)} vs ${b.typeKey}@${b.z.toFixed(0)},${b.x.toFixed(2)}`;
      }
    }
  }
  return null;
}

function trafficTrack() {
  const t = buildTrack(TEST_SECTIONS, { loop: true, spriteDefs: WORLD_SPRITES });
  return t;
}

test('traffic: spawn is deterministic, respects density and the start zone', () => {
  const t1 = trafficTrack();
  const a = createTraffic();
  spawnTraffic(a, t1, createRng(42), 0);
  const b = createTraffic();
  spawnTraffic(b, trafficTrack(), createRng(42), 0);
  const active = a.vehicles.filter((v) => v.active);
  assert.ok(active.length >= 15, `only ${active.length} cars`);
  assert.deepEqual(active.map((v) => [v.typeKey, v.z, v.x, v.variant]), b.vehicles.filter((v) => v.active).map((v) => [v.typeKey, v.z, v.x, v.variant]));
  for (const v of active) {
    assert.ok(Math.abs(wrapDelta(v.z, t1.length)) >= CONFIG.traffic.spawnClearZone);
    assert.ok([0, 1, 2].some((i) => near(v.x, laneCenter(i))), 'car not on a lane centre');
    assert.ok(t1.segments[v.segIndex].cars.includes(v), 'car missing from its segment bucket');
  }
  assert.equal(trafficOverlaps(a, t1.length), null);
});

test('traffic: 2 minutes of AI with a slow player never overlap, cars keep moving and change lanes', () => {
  const t = trafficTrack();
  const traffic = createTraffic();
  const rng = createRng(7);
  spawnTraffic(traffic, t, rng, 0);
  const player = createPlayer();
  let laneChanges = 0;
  let minMean = Infinity;
  const targets = traffic.vehicles.map((v) => v.targetX);
  for (let step = 0; step < 60 * 120; step++) {
    // Player crawls in the middle lane, forcing traffic to queue and overtake.
    player.prevZ = player.z;
    player.z = wrap(player.z + 1500 * DT, t.length);
    player.speed = 1500;
    updateTraffic(traffic, t, player, DT, rng);
    const bad = trafficOverlaps(traffic, t.length);
    assert.equal(bad, null, `overlap at step ${step}: ${bad}`);
    traffic.vehicles.forEach((v, i) => {
      if (v.targetX !== targets[i]) laneChanges++;
      targets[i] = v.targetX;
    });
    if (step % 600 === 599) {
      const act = traffic.vehicles.filter((v) => v.active);
      minMean = Math.min(minMean, act.reduce((s, v) => s + v.speed, 0) / act.length);
    }
  }
  assert.ok(laneChanges > 10, `only ${laneChanges} lane changes`);
  assert.ok(minMean > 2500, `traffic jammed, mean speed ${minMean.toFixed(0)}`);
  // Buckets consistent with positions.
  let bucketed = 0;
  for (const seg of t.segments) bucketed += seg.cars.length;
  assert.equal(bucketed, traffic.vehicles.filter((v) => v.active).length);
});

test('traffic: AI never drives into a stopped player', () => {
  const t = trafficTrack();
  const traffic = createTraffic();
  const rng = createRng(3);
  spawnTraffic(traffic, t, rng, 0);
  const player = createPlayer();
  resetPlayer(player, 30000);
  const pHalfW = playerHalfWidth();
  for (let step = 0; step < 60 * 90; step++) {
    updateTraffic(traffic, t, player, DT, rng);
    for (const v of traffic.vehicles) {
      if (!v.active) continue;
      const hit = boxesOverlap(wrapDelta(v.z - player.z, t.length), v.x - player.x,
        v.halfLen + CONFIG.collision.playerLength / 2, v.halfW + pHalfW);
      assert.ok(!hit, `car ${v.typeKey} drove into the stopped player at step ${step}`);
    }
  }
});

// ---------------------------------------------------------------- collisions
function soloTraffic(typeKey, z, x, speed) {
  const traffic = createTraffic();
  const v = traffic.vehicles[0];
  v.spawn(typeKey, z, x, 0, speed);
  return { traffic, v };
}

test('collision: overlap test is exact at the edges', () => {
  assert.ok(boxesOverlap(0, 0, 1, 1));
  assert.ok(!boxesOverlap(1, 0, 1, 1));
  assert.ok(!boxesOverlap(0, 1, 1, 1));
  assert.ok(boxesOverlap(-0.999, 0.999, 1, 1));
});

test('collision: car just beside or just behind is not a hit', () => {
  const { traffic, v } = soloTraffic('sedan', 10000, 0, 5000);
  const p = createPlayer();
  resetPlayer(p, 10000);
  p.x = v.halfW + playerHalfWidth() + 0.001;
  p.prevX = p.x;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_NONE);
  p.x = 0;
  p.z = 10000 - v.halfLen - CONFIG.collision.playerLength / 2 - 1;
  p.prevZ = p.z;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_NONE);
});

test('collision: slow rear-end bumps, no penetration, speed matched', () => {
  const { traffic, v } = soloTraffic('sedan', 10000, 0, 5000);
  const p = createPlayer();
  p.prevZ = 10000 - 1000;
  p.z = 10000 - 500;
  p.speed = 7000;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_BUMP);
  const dz = wrapDelta(v.z - p.z, straight.length);
  assert.ok(dz >= v.halfLen + CONFIG.collision.playerLength / 2, `still overlapping, dz=${dz}`);
  assert.ok(p.speed <= v.speed);
  assert.ok(isVulnerable(p));
});

test('collision: fast rear-end flips the car', () => {
  const { traffic } = soloTraffic('truck', 10000, 0, 3500);
  const p = createPlayer();
  p.prevZ = 10000 - 1600;
  p.z = 10000 - 1200;
  p.speed = 11500;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_CRASH);
  assert.equal(p.crash, CRASH_TUMBLE);
  assert.equal(p.speed, 0);
});

test('collision: side swipe pushes sideways without overlap', () => {
  const { traffic, v } = soloTraffic('van', 10000, 0, 6000);
  v.prevZ = v.z;
  const p = createPlayer();
  p.z = 10000;
  p.prevZ = 10000;
  p.prevX = -0.4;
  p.x = -0.2;
  p.speed = 6000;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_SIDE);
  assert.ok(Math.abs(p.x - v.x) >= v.halfW + playerHalfWidth(), `x=${p.x}`);
  assert.ok(p.x < 0, 'pushed to the wrong side');
});

test('collision: roadside objects stop or flip the car, bushes are passable', () => {
  const seg = { len: 400, curve: 0, hill: 0 };
  const mk = (sprite) => buildTrack({ id: 'OBJ', theme: 'coastDay', segments: [seg],
    sprites: [{ at: 100, sprite, side: 'right', offset: 1.5 }] }, { spriteDefs: WORLD_SPRITES });
  const z = 100 * SEGMENT_LENGTH;
  const half = CONFIG.collision.playerLength / 2;

  const slowTrack = mk('rock');
  const p = createPlayer();
  p.x = 1.5;
  p.prevX = 1.5;
  p.prevZ = z - half - 60;
  p.z = z - half + 20;
  p.speed = 1500;
  assert.equal(collidePlayerSprites(p, slowTrack), HIT_BUMP);
  assert.equal(p.speed, 0);
  assert.ok(p.z + half <= z, 'car front inside the rock');
  assert.ok(Math.abs(p.x) < 1.5, 'no nudge toward the road');

  const q = createPlayer();
  q.x = 1.5;
  q.prevX = 1.5;
  q.prevZ = z - half - 150;
  q.z = z - half + 50;
  q.speed = 9000;
  assert.equal(collidePlayerSprites(q, mk('palm')), HIT_CRASH);
  assert.equal(q.crash, CRASH_TUMBLE);

  const b = createPlayer();
  b.x = 1.5;
  b.prevX = 1.5;
  b.prevZ = z - half - 150;
  b.z = z - half + 50;
  b.speed = 9000;
  assert.equal(collidePlayerSprites(b, mk('bush')), HIT_NONE);
});

test('collision: fast car cannot tunnel through a thin post', () => {
  const t = buildTrack({ id: 'POST', theme: 'coastDay', segments: [{ len: 400, curve: 0, hill: 0 }],
    sprites: [{ at: 100, sprite: 'post', side: 'right', offset: 1.12 }] }, { spriteDefs: WORLD_SPRITES });
  const p = createPlayer();
  p.x = 1.12;
  p.prevX = 1.12;
  p.prevZ = 100 * SEGMENT_LENGTH - 700;
  p.z = p.prevZ + CONFIG.player.maxSpeed * DT;
  p.speed = CONFIG.player.maxSpeed;
  // Step forward until past the post; it must be hit on the way.
  let hit = HIT_NONE;
  for (let i = 0; i < 10 && hit === HIT_NONE; i++) {
    hit = collidePlayerSprites(p, t);
    p.prevZ = p.z;
    p.z += CONFIG.player.maxSpeed * DT;
  }
  assert.equal(hit, HIT_CRASH);
});

test('crash: tumble, recover onto the road, grace, then control returns', () => {
  const p = createPlayer();
  p.x = 2.2;
  p.speed = 9000;
  startCrash(p);
  const rng = createRng(1);
  const c = CONFIG.collision;
  let steps = 0;
  let maxHop = 0;
  const limit = Math.ceil((c.tumbleTime + c.recoverTime) / DT) + 5;
  while (p.crash !== CRASH_NONE && steps < limit) {
    updatePlayer(p, ctl({ throttle: 1, steer: 1 }), straight, DT, rng);
    maxHop = Math.max(maxHop, p.hop);
    assert.equal(p.speed, 0);
    steps++;
  }
  assert.equal(p.crash, CRASH_NONE, 'crash never ended');
  assert.ok(maxHop > 0, 'no tumble hop');
  assert.ok(Math.abs(p.x) <= c.recoverMaxX + 1e-9, `left off-road at x=${p.x}`);
  assert.ok(p.grace > 0 && !isVulnerable(p));
  drive(p, ctl({ throttle: 1 }), straight, 1, rng);
  assert.ok(p.speed > 1000, 'no control after recovery');
  drive(p, ctl({ throttle: 1 }), straight, c.graceTime, rng);
  assert.ok(isVulnerable(p));
});

test('crash: no collisions while tumbling or in grace', () => {
  const { traffic } = soloTraffic('sedan', 10000, 0, 0);
  const p = createPlayer();
  p.z = 10000;
  p.prevZ = 10000;
  startCrash(p);
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_NONE);
  p.crash = CRASH_RECOVER;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_NONE);
  p.crash = CRASH_NONE;
  p.grace = 0.5;
  assert.equal(collidePlayerVehicles(p, traffic, straight.length), HIT_NONE);
});

test('race: god mode ignores collisions, normal mode does not', () => {
  const input = { value: (a) => (a === 'accelerate' ? 1 : 0), steer: () => 0, wasPressed: () => false, isDown: () => false, pad: { connected: false } };
  const run = (god) => {
    const t = buildTrack(TEST_SECTIONS, { loop: true, spriteDefs: WORLD_SPRITES });
    raceState.enter({ track: t, sections: TEST_SECTIONS, rng: createRng(5), god });
    let crashed = false;
    // Full throttle in a straight line: without god mode something gets hit.
    for (let i = 0; i < 60 * 60 && !crashed; i++) {
      raceState.update(DT, input);
      const lines = [];
      raceState.debugLines(lines, 0);
      crashed = lines.some((l) => / LAST HIT (BUMP|SIDE|CRASH)/.test(l));
    }
    return crashed;
  };
  assert.equal(run(true), false);
  assert.equal(run(false), true);
});

// ---------------------------------------------------------------- route data (AGENTS.md §8.3)
const PYRAMID = [['A1'], ['B1', 'B2'], ['C1', 'C2', 'C3'], ['D1', 'D2', 'D3', 'D4'], ['E1', 'E2', 'E3', 'E4', 'E5']];
const STAGES = sectionStages(SECTIONS);
const ENV = { byId: SECTION_BY_ID, stages: STAGES, spriteDefs: WORLD_SPRITES };

test('route: exactly 15 sections with the pyramid ids', () => {
  assert.equal(SECTIONS.length, 15);
  assert.deepEqual(SECTIONS.map((s) => s.id).sort(), PYRAMID.flat().sort());
  assert.equal(new Set(SECTIONS.map((s) => s.id)).size, 15);
});

test('route: every next follows the pyramid (i → i left, i+1 right)', () => {
  PYRAMID.forEach((row, n) => {
    row.forEach((id, i) => {
      const s = SECTION_BY_ID[id];
      if (n === PYRAMID.length - 1) {
        assert.equal(s.next, null, `${id} must not continue`);
      } else {
        assert.deepEqual(s.next, { left: PYRAMID[n + 1][i], right: PYRAMID[n + 1][i + 1] }, `${id}.next`);
      }
      assert.equal(STAGES[id], n + 1, `${id} stage`);
    });
  });
});

test('route: every section reachable from A1, goals only on the last stage', () => {
  const seen = new Set();
  const stack = ['A1'];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const n = SECTION_BY_ID[id].next;
    if (n) stack.push(n.left, n.right);
  }
  assert.equal(seen.size, 15);
  const goals = new Set();
  for (const s of SECTIONS) {
    if (s.next) {
      assert.ok(!s.goal, `${s.id} has a goal but continues`);
    } else {
      assert.ok(GOALS[s.goal], `${s.id}: unknown goal ${s.goal}`);
      goals.add(s.goal);
    }
  }
  assert.equal(goals.size, 5, 'five distinct goals');
});

test('route: themes, sprites, traffic, time bonus and lengths are valid', () => {
  for (const s of SECTIONS) {
    assert.ok(THEMES[s.theme], `${s.id}: theme ${s.theme}`);
    assert.ok(s.name && hasGlyphs(s.name), `${s.id}: name not drawable`);
    assert.ok(s.timeBonus > 0, `${s.id}: timeBonus`);
    const len = sectionLength(s);
    assert.ok(len >= CONFIG.track.minLen && len <= CONFIG.track.maxLen, `${s.id}: length ${len}`);
    for (const p of s.segments) {
      assert.ok(Number.isInteger(p.len) && p.len > 0 && Math.abs(p.curve) <= CONFIG.track.maxCurve, `${s.id}: bad part`);
    }
    for (const k of s.traffic.types) assert.ok(VEHICLE_TYPES[k], `${s.id}: vehicle ${k}`);
    assert.ok(s.traffic.density >= 0 && s.traffic.density <= 1);
    const limit = s.next ? len - forkLength() : len;
    for (const rule of s.sprites) {
      assert.ok(WORLD_SPRITES[rule.sprite], `${s.id}: sprite ${rule.sprite}`);
      if (typeof rule.at === 'number') assert.ok(rule.at < limit, `${s.id}: ${rule.sprite} at ${rule.at} inside the fork`);
      else assert.ok(rule.to <= limit, `${s.id}: ${rule.sprite} rule runs into the fork`);
    }
    if (s.next) {
      const last = s.segments[s.segments.length - 1];
      assert.ok(last.len >= forkLength() && last.curve === 0, `${s.id}: fork needs a straight last part`);
      for (const r of s.forkSprites) assert.ok(WORLD_SPRITES[r.sprite] && r.every > 0, `${s.id}: fork sprite`);
    }
  }
  for (const id of ['signFork', 'checkpointGate', 'goalGate']) assert.ok(WORLD_SPRITES[id], `sprite ${id}`);
  assert.ok(CONFIG.fork.splitLength >= CONFIG.road.drawDistance, 'road beyond the fork would be missing before the decision');
  for (const v of Object.values(TEXT)) assert.ok(hasGlyphs(v), `text '${v}' not drawable`);
  for (const g of Object.values(GOALS)) assert.ok(hasGlyphs(g.name) && hasGlyphs(g.text));
  assert.equal(pickStartSection('C2'), 'C2');
  assert.equal(pickStartSection('ZZ'), 'A1');
  assert.equal(pickStartSection(null), 'A1');
});

test('route: mini-map places 15 distinct nodes row by stage', () => {
  const nodes = mapLayout(SECTIONS, STAGES);
  const keys = new Set();
  for (const s of SECTIONS) {
    const n = nodes[s.id];
    assert.equal(n.y, (STAGES[s.id] - 1) * CONFIG.hud.mapRowGap + 1);
    keys.add(`${n.x},${n.y}`);
  }
  assert.equal(keys.size, 15);
  // Left child is left of its parent's right child.
  assert.ok(nodes.B1.x < nodes.B2.x && nodes.C1.x < nodes.C2.x);
});

// ---------------------------------------------------------------- forks
function forkedTrack(side) {
  const t = createTrack();
  const info = appendSection(t, SECTION_BY_ID.A1, { spriteDefs: WORLD_SPRITES, gates: true });
  const r = applyForkDecision(t, info, side);
  const next = appendSection(t, SECTION_BY_ID[r.nextId], {
    spriteDefs: WORLD_SPRITES, baseX: r.baseX, prevTheme: info.section.theme, gates: true, ghost: r.ghost,
  });
  prepareTrackColors(t);
  return { t, info, next, r };
}

test('fork: branch offset widens then splits smoothly', () => {
  const { widenLength, spread } = CONFIG.fork;
  assert.equal(forkOffset(0), 0);
  assert.ok(near(forkOffset(widenLength), 1));
  assert.ok(near(forkOffset(forkLength()), spread));
  let prev = 0;
  for (let k = 1; k <= forkLength(); k++) {
    const v = forkOffset(k);
    assert.ok(v >= prev && v - prev < 0.1, `offset jump at ${k}`);
    prev = v;
  }
});

test('fork: roads continuous across the fork and the next section (both choices)', () => {
  for (const side of [-1, 1]) {
    const { t, info, next, r } = forkedTrack(side);
    assert.equal(r.nextId, side < 0 ? 'B1' : 'B2');
    assert.equal(next.start, info.start + info.len);
    for (let i = 1; i < t.segments.length; i++) {
      const a = t.segments[i - 1];
      const b = t.segments[i];
      assert.ok(near(a.p2.world.x, b.p1.world.x, 1e-6), `main road jumps at ${i}`);
      assert.ok(near(a.p2.world.y, b.p1.world.y, 1e-6), `height jumps at ${i}`);
      if (a.alt && b.alt) assert.ok(near(a.alt.x2, b.alt.x1, 1e-6), `second road jumps at ${i}`);
    }
    // After the decision the chosen branch is main and lies on the chosen side.
    const mid = t.segments[info.decisionIndex + 100];
    assert.ok(side < 0 ? mid.p1.world.x / ROAD_WIDTH < mid.alt.x1 : mid.p1.world.x / ROAD_WIDTH > mid.alt.x1);
    assert.ok(near(roadCenter(t, (next.start + 500) * SEGMENT_LENGTH), r.baseX));
    // The unchosen branch drifts away and ends.
    const lastGhost = t.segments[next.start + CONFIG.fork.ghostLength - 1];
    assert.ok(Math.abs(lastGhost.alt.x2 - r.baseX) > CONFIG.fork.ghostSpread, 'ghost branch did not leave');
    assert.equal(t.segments[next.start + CONFIG.fork.ghostLength].alt, null);
    // Gates and fork signs are placed.
    assert.ok(t.segments[next.start].sprites.some((sp) => sp.id === 'checkpointGate'));
    assert.ok(t.segments.some((sg) => sg.sprites.some((sp) => sp.id === 'signFork' && near(sp.x, info.baseX))));
  }
});

test('fork: both branches drivable, the gap between them is off-road', () => {
  const t = createTrack();
  const info = appendSection(t, SECTION_BY_ID.A1, { spriteDefs: WORLD_SPRITES });
  const z = (info.decisionIndex + 150) * SEGMENT_LENGTH;
  const left = branchCenter(t, z, -1);
  const right = branchCenter(t, z, 1);
  assert.ok(right - left > 4, 'branches not separated');
  assert.ok(near(nearestRoadCenter(t, z, left + 0.3), left));
  assert.ok(near(nearestRoadCenter(t, z, right - 0.3), right));
  const p = createPlayer();
  resetPlayer(p, z);
  p.gear = 'HIGH';
  p.speed = 6000;
  p.x = right;
  updatePlayer(p, ctl({ throttle: 1 }), t, DT, createRng(1));
  assert.ok(!p.offRoad, 'right branch counted as off-road');
  p.x = (left + right) / 2;
  updatePlayer(p, ctl({ throttle: 1 }), t, DT, createRng(1));
  assert.ok(p.offRoad, 'median between branches counted as road');
});

test('fork: road raster paints every row once and shows both branches', () => {
  const t = createTrack();
  const info = appendSection(t, SECTION_BY_ID.A1, { spriteDefs: WORLD_SPRITES });
  prepareTrackColors(t);
  const grass = new Set(t.segments.map((sg) => sg.colors.grass));
  const roads = new Set(t.segments.map((sg) => sg.colors.road));
  const ctx = mockCtx();
  const z = (info.decisionIndex + 20) * SEGMENT_LENGTH;
  renderRoad(ctx, t, { z, x: branchCenter(t, z + 1400, -1) });
  const rows = new Array(CONFIG.screen.height).fill(0);
  const roadRects = new Array(CONFIG.screen.height).fill(0);
  for (const r of ctx.rects) {
    if (grass.has(r.c) && r.w === CONFIG.screen.width) for (let y = r.y; y < r.y + r.h; y++) rows[y]++;
    if (roads.has(r.c)) roadRects[r.y]++;
  }
  const first = rows.findIndex((v) => v > 0);
  for (let y = first; y < rows.length; y++) assert.equal(rows[y], 1, `row ${y}`);
  assert.ok(roadRects.some((n) => n >= 2), 'second branch never drawn');
});

// ---------------------------------------------------------------- race rules
function driveRoute(sides, opts = {}) {
  const t = createTrack();
  const race = createRace();
  startRace(race, t, ENV, opts.start || 'A1', opts.god !== false);
  const player = createPlayer();
  let fork = 0;
  const times = [];
  let guard = 0;
  while (race.status === RACE_RUNNING && guard++ < 200000) {
    const info = t.sections[race.sectionIndex];
    const side = info.forked ? sides[fork] : 0;
    player.prevZ = player.z;
    player.z += SEGMENT_LENGTH;
    player.x = side ? branchCenter(t, player.z, side) : roadCenter(t, player.z);
    const before = race.sectionIndex;
    updateRace(race, t, ENV, player, opts.dt || 0);
    if (info.forked && info.chosen !== 0 && before === race.sectionIndex && race.route.length === fork + 2) fork++;
    if (race.sectionIndex !== before) times.push(race.time);
  }
  return { race, t, times };
}

test('race: all 16 left/right combinations reach one of the 5 goals', () => {
  const reached = new Set();
  for (let m = 0; m < 16; m++) {
    const sides = [0, 1, 2, 3].map((b) => ((m >> b) & 1 ? 1 : -1));
    const { race } = driveRoute(sides);
    assert.equal(race.status, RACE_FINISHED, `route ${m} did not finish`);
    assert.equal(race.route.length, 5);
    const rights = sides.filter((x) => x > 0).length;
    assert.equal(race.route[4], PYRAMID[4][rights], `route ${sides} ended at ${race.route[4]}`);
    reached.add(race.goalId);
  }
  assert.equal(reached.size, 5);
});

test('race: checkpoints add the section time bonus and advance the stage', () => {
  const { race, times } = driveRoute([-1, -1, -1, -1], { dt: 0 });
  const bonuses = race.route.slice(1).map((id) => SECTION_BY_ID[id].timeBonus);
  let expected = SECTION_BY_ID.A1.timeBonus;
  bonuses.forEach((b, i) => {
    expected += b;
    assert.equal(times[i], expected, `checkpoint ${i + 1}`);
  });
  assert.equal(race.stage, 5);
});

test('race: TIME UP ends the race, god mode never runs out of time', () => {
  const t = createTrack();
  const race = createRace();
  startRace(race, t, ENV, 'A1', false);
  const p = createPlayer();
  const steps = Math.ceil(race.time / DT) + 2;
  for (let i = 0; i < steps; i++) updateRace(race, t, ENV, p, DT);
  assert.equal(race.status, RACE_TIME_UP);
  assert.equal(race.time, 0);
  assert.ok(!raceOver(race));
  for (let i = 0; i < Math.ceil(CONFIG.race.timeUpDelay / DT) + 1; i++) updateRace(race, t, ENV, p, DT);
  assert.ok(raceOver(race));
  const g = createRace();
  startRace(g, createTrack(), ENV, 'A1', true);
  const t0 = g.time;
  for (let i = 0; i < steps; i++) updateRace(g, t, ENV, p, DT);
  assert.equal(g.status, RACE_RUNNING);
  assert.equal(g.time, t0);
});

test('race: ?section start works and the goal screen follows the finish', () => {
  const { race } = driveRoute([1], { start: 'D4' });
  assert.equal(race.route[0], 'D4');
  assert.equal(race.route[1], 'E5');
  assert.equal(race.goalId, SECTION_BY_ID.E5.goal);
  assert.ok(!raceOver(race));
  race.endTimer = CONFIG.race.finishDelay;
  assert.ok(raceOver(race));
});

test('race: full drive through a fork with traffic stays consistent', () => {
  const input = {
    value: (a) => (a === 'accelerate' ? 1 : 0),
    steer: () => steerCmd,
    wasPressed: () => false,
    isDown: () => false,
    pad: { connected: false },
  };
  let steerCmd = 0;
  raceState.enter({ env: ENV, startId: 'A1', rng: createRng(11), god: true });
  const live = raceState.inspect();
  live.player.gear = 'HIGH';
  let maxOff = 0;
  for (let i = 0; i < 60 * 150 && live.race.sectionIndex < 1; i++) {
    const z = live.player.z + 2000;
    const target = live.track.segments[Math.floor(z / SEGMENT_LENGTH)]?.alt ? branchCenter(live.track, z, -1) : roadCenter(live.track, z);
    steerCmd = Math.max(-1, Math.min(1, (target - live.player.x) * 3));
    raceState.update(DT, input);
    const bad = trafficOverlaps(live.traffic, live.track.length);
    assert.equal(bad, null, `traffic overlap at step ${i}: ${bad}`);
    maxOff = Math.max(maxOff, Math.abs(live.player.x - nearestRoadCenter(live.track, live.player.z, live.player.x)));
    assert.ok(activeCount(live.traffic) <= CONFIG.traffic.maxVehicles);
  }
  assert.equal(live.race.route[1], 'B1');
  assert.equal(live.race.sectionIndex, 1, 'never reached the next section');
  assert.ok(maxOff < 1.2, `auto driver left the road (${maxOff.toFixed(2)})`);
  assert.ok(activeCount(live.traffic) > 0, 'no traffic after the fork');
  for (const v of live.traffic.vehicles) {
    if (v.active) assert.ok(v.z > live.player.z - (CONFIG.traffic.despawnBehind + 1) * SEGMENT_LENGTH);
  }
});

// ---------------------------------------------------------------- drift
const hard = buildTrack({ id: 'HARD', theme: 'coastDay', segments: [{ len: 3000, curve: 6, hill: 0 }] });

function driftPlayer(track, z, speed) {
  const p = createPlayer();
  resetPlayer(p, z);
  p.gear = 'HIGH';
  p.speed = speed;
  return p;
}

test('drift: starts only with button, steering and enough speed on the road', () => {
  const rng = createRng(1);
  const slow = driftPlayer(straight, 10000, CONFIG.drift.minSpeed - 100);
  updatePlayer(slow, ctl({ throttle: 1, steer: 1, drift: true }), straight, DT, rng);
  assert.ok(!slow.drift, 'drift below min speed');
  const noSteer = driftPlayer(straight, 10000, 9000);
  updatePlayer(noSteer, ctl({ throttle: 1, steer: 0.2, drift: true }), straight, DT, rng);
  assert.ok(!noSteer.drift, 'drift without steering');
  const noButton = driftPlayer(straight, 10000, 9000);
  updatePlayer(noButton, ctl({ throttle: 1, steer: 1 }), straight, DT, rng);
  assert.ok(!noButton.drift, 'drift without button');
  const ok = driftPlayer(straight, 10000, 9000);
  updatePlayer(ok, ctl({ throttle: 1, steer: -1, drift: true }), straight, DT, rng);
  assert.ok(ok.drift && ok.driftDir === -1);
});

/** Simple driver that aims for the road centre; returns the worst |x| and the final speed. */
function holdCurve(p, track, seconds, useDrift) {
  const rng = createRng(2);
  let worst = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const want = Math.max(-1, Math.min(1, -p.x * 4 + (useDrift ? 0 : 1)));
    const steer = useDrift && i < 5 ? 1 : want;
    updatePlayer(p, ctl({ throttle: 1, steer, drift: useDrift }), track, DT, rng);
    worst = Math.max(worst, Math.abs(p.x));
  }
  return { worst, speed: p.speed };
}

test('drift: holds a line through a hard curve that normal driving cannot', () => {
  const z = 1500 * SEGMENT_LENGTH;
  const normal = holdCurve(driftPlayer(hard, z, 11000), hard, 3, false);
  const drift = holdCurve(driftPlayer(hard, z, 11000), hard, 3, true);
  assert.ok(normal.worst > 1, `normal driving stayed on the road (${normal.worst.toFixed(2)})`);
  assert.ok(drift.worst < 1, `drift left the road (${drift.worst.toFixed(2)})`);
  assert.ok(drift.speed > 8000, `drift too slow (${drift.speed.toFixed(0)})`);
});

test('drift: on a straight the tail slides the car unless you counter-steer', () => {
  const rng = createRng(3);
  const lazy = driftPlayer(straight, 10000, 11000);
  updatePlayer(lazy, ctl({ throttle: 1, steer: 1, drift: true }), straight, DT, rng);
  for (let i = 0; i < 90; i++) updatePlayer(lazy, ctl({ throttle: 1, steer: 0.3, drift: true }), straight, DT, rng);
  assert.ok(lazy.x > 1 || !lazy.drift, `no slide without counter-steer (x=${lazy.x.toFixed(2)})`);
  const careful = driftPlayer(straight, 10000, 11000);
  updatePlayer(careful, ctl({ throttle: 1, steer: 1, drift: true }), straight, DT, rng);
  for (let i = 0; i < 90; i++) {
    const steer = Math.max(-0.6, Math.min(0.6, -careful.x * 3));
    updatePlayer(careful, ctl({ throttle: 1, steer, drift: true }), straight, DT, rng);
  }
  assert.ok(careful.drift && Math.abs(careful.x) < 1, `counter-steer could not hold it (x=${careful.x.toFixed(2)})`);
});

test('drift: exits are predictable and reported', () => {
  const rng = createRng(4);
  const start = () => {
    const p = driftPlayer(straight, 10000, 9000);
    updatePlayer(p, ctl({ throttle: 1, steer: 1, drift: true }), straight, DT, rng);
    assert.ok(p.drift);
    return p;
  };
  const release = start();
  updatePlayer(release, ctl({ throttle: 1, steer: 1 }), straight, DT, rng);
  assert.ok(!release.drift && release.driftEnd === DRIFT_END_CLEAN);
  const counter = start();
  updatePlayer(counter, ctl({ throttle: 1, steer: -1, drift: true }), straight, DT, rng);
  assert.ok(!counter.drift && counter.driftEnd === DRIFT_END_CLEAN);
  const slow = start();
  slow.speed = CONFIG.drift.keepSpeed - 1;
  updatePlayer(slow, ctl({ steer: 1, drift: true }), straight, DT, rng);
  assert.ok(!slow.drift && slow.driftEnd === DRIFT_END_CLEAN);
  const off = start();
  off.x = 1.5;
  off.offRoad = true;
  updatePlayer(off, ctl({ throttle: 1, steer: 1, drift: true }), straight, DT, rng);
  assert.ok(!off.drift && off.driftEnd === DRIFT_END_FAIL);
  const crash = start();
  startCrash(crash);
  assert.ok(!crash.drift && crash.driftEnd === DRIFT_END_FAIL);
  updatePlayer(crash, ctl(), straight, DT, rng);
  assert.equal(crash.driftEnd, DRIFT_END_NONE, 'end flag must last one step');
});

test('drift: costs speed and is deterministic', () => {
  const run = () => {
    const p = driftPlayer(straight, 10000, 11000);
    const rng = createRng(5);
    const out = [];
    for (let i = 0; i < 120; i++) {
      updatePlayer(p, ctl({ throttle: 1, steer: i < 60 ? 1 : -0.3, drift: true }), straight, DT, rng);
      out.push(p.x, p.speed, p.driftAngle);
    }
    return out;
  };
  const a = run();
  assert.deepEqual(a, run());
  const plain = driftPlayer(straight, 10000, 11000);
  drive(plain, ctl({ throttle: 1 }), straight, 1);
  assert.ok(a[a.length - 2] < plain.speed, 'drifting was not slower than driving straight');
  assert.equal(driftFrameIndex(-1, 0.9), 0);
  assert.equal(driftFrameIndex(-1, 0.3), 1);
  assert.equal(driftFrameIndex(1, 0.3), 2);
  assert.equal(driftFrameIndex(1, 0.9), 3);
});

// ---------------------------------------------------------------- score
function fakeDrift(s, seconds, angle = 1, speed = CONFIG.player.maxSpeed) {
  const p = { speed, drift: true, driftAngle: angle, driftTime: 0, driftEnd: DRIFT_END_NONE };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    p.driftTime += DT;
    updateScore(s, p, DT);
  }
  return p;
}

function finishDrift(s, p, reason) {
  p.drift = false;
  p.driftEnd = reason;
  updateScore(s, p, DT);
  p.driftEnd = DRIFT_END_NONE;
}

test('score: distance points accumulate with speed', () => {
  const s = createScore();
  const p = { speed: 10000, drift: false, driftEnd: DRIFT_END_NONE };
  for (let i = 0; i < 60; i++) updateScore(s, p, DT);
  assert.ok(Math.abs(s.total - 10000 * CONFIG.score.distancePoints) <= 1, `distance points ${s.total}`);
});

test('score: clean drifts bank points and build the multiplier, fails reset it', () => {
  const s = createScore();
  let p = fakeDrift(s, 1);
  const pts = Math.round(s.driftPoints);
  assert.ok(Math.abs(pts - CONFIG.score.driftRate) <= 5, `drift points ${pts}`);
  const before = s.total;
  finishDrift(s, p, DRIFT_END_CLEAN);
  assert.ok(s.total - before >= pts, 'first drift not banked');
  assert.equal(s.multiplier, 2);
  p = fakeDrift(s, 1);
  const pts2 = Math.round(s.driftPoints);
  const before2 = s.total;
  finishDrift(s, p, DRIFT_END_CLEAN);
  assert.ok(s.total - before2 >= pts2 * 2, 'multiplier not applied');
  assert.equal(s.multiplier, 3);
  p = fakeDrift(s, 1);
  const before3 = s.total;
  finishDrift(s, p, DRIFT_END_FAIL);
  assert.ok(s.total - before3 < 10, 'failed drift paid out');
  assert.equal(s.multiplier, 1);
  assert.ok(s.lastFailed);
});

test('score: short drifts earn nothing, the combo expires', () => {
  const s = createScore();
  const p = fakeDrift(s, CONFIG.score.driftMinTime / 2);
  const before = s.total;
  finishDrift(s, p, DRIFT_END_CLEAN);
  assert.ok(s.total - before < 10);
  assert.equal(s.multiplier, 1);
  finishDrift(s, fakeDrift(s, 1), DRIFT_END_CLEAN);
  assert.equal(s.multiplier, 2);
  const idle = { speed: 0, drift: false, driftEnd: DRIFT_END_NONE };
  for (let i = 0; i < Math.ceil(CONFIG.score.comboWindow / DT) + 1; i++) updateScore(s, idle, DT);
  assert.equal(s.multiplier, 1);
  const cap = createScore();
  for (let i = 0; i < 10; i++) finishDrift(cap, fakeDrift(cap, 1), DRIFT_END_CLEAN);
  assert.equal(cap.multiplier, CONFIG.score.maxMultiplier);
});

test('score: goal time bonus is awarded once', () => {
  const s = createScore();
  awardGoal(s, 12.5);
  assert.equal(s.goalBonus, Math.round(12.5 * CONFIG.score.goalTimeBonus));
  const t = s.total;
  awardGoal(s, 30);
  assert.equal(s.total, t);
});

// ---------------------------------------------------------------- particles
test('particles: smoke while drifting, dust off-road, pool never grows, puffs die', () => {
  const fx = createParticles();
  const rng = createRng(6);
  const size = fx.list.length;
  const p = { drift: true, driftDir: 1, offRoad: false, speed: 9000 };
  for (let i = 0; i < 120; i++) updateParticles(fx, p, DT, rng);
  assert.ok(fx.alive > 0);
  assert.ok(fx.list.every((q) => !q.active || q.kind === PARTICLE_SMOKE));
  assert.equal(fx.list.length, size);
  for (let i = 0; i < size + 5; i++) emit(fx, PARTICLE_SMOKE, 0, 0, 0);
  assert.equal(fx.list.length, size);
  p.drift = false;
  for (let i = 0; i < Math.ceil(CONFIG.particles.life / DT) + 2; i++) updateParticles(fx, p, DT, rng);
  assert.equal(fx.alive, 0);
  p.offRoad = true;
  for (let i = 0; i < 30; i++) updateParticles(fx, p, DT, rng);
  assert.ok(fx.alive > 0 && fx.list.some((q) => q.active && q.kind !== PARTICLE_SMOKE));
});

test('race: drift points appear on the race HUD path end to end', () => {
  const input = {
    value: (a) => (a === 'accelerate' ? 1 : 0),
    steer: () => steer,
    wasPressed: () => false,
    isDown: (a) => a === 'drift' && holding,
    pad: { connected: false },
  };
  let steer = 0;
  let holding = false;
  raceState.enter({ env: ENV, startId: 'A1', rng: createRng(12), god: true });
  const live = raceState.inspect();
  live.player.gear = 'HIGH';
  live.player.speed = 10000;
  holding = true;
  steer = 1;
  raceState.update(DT, input);
  assert.ok(live.player.drift, 'race state did not pass the drift button');
  for (let i = 0; i < 60; i++) {
    steer = -Math.max(-0.6, Math.min(0.6, (live.player.x - roadCenter(live.track, live.player.z)) * 3));
    raceState.update(DT, input);
  }
  holding = false;
  const before = live.score.total;
  raceState.update(DT, input);
  assert.ok(live.score.total - before > 50, 'drift not banked through the race state');
  assert.equal(live.score.multiplier, 2);
});

// ---------------------------------------------------------------- audio
const INSTRUMENT_KEYS = ['wave', 'gain', 'attack', 'decay', 'sustain', 'release'];

function checkInstrument(name, inst) {
  for (const k of INSTRUMENT_KEYS) assert.ok(inst[k] !== undefined, `${name}.${k}`);
  assert.ok(['square', 'sawtooth', 'triangle', 'sine', 'noise'].includes(inst.wave), `${name}.wave`);
  assert.ok(inst.gain > 0 && inst.gain <= 1 && inst.sustain >= 0 && inst.sustain <= 1, `${name} levels`);
  if (inst.filter) assert.ok(['lowpass', 'highpass', 'bandpass'].includes(inst.filter.type), `${name}.filter`);
}

test('audio: note names map to equal-tempered frequencies', () => {
  assert.ok(near(noteFrequency('A4'), 440));
  assert.ok(near(noteFrequency('C4'), 261.6256, 1e-3));
  assert.ok(near(noteFrequency('A#3'), 233.0819, 1e-3));
  assert.ok(near(noteFrequency('C#6') / noteFrequency('C#5'), 2));
  assert.ok(Number.isNaN(noteFrequency('H2')) && Number.isNaN(noteFrequency('C')));
  assert.deepEqual(parseTrack('C4:2 . x:3').events.map((e) => [e.step, e.steps, e.freq > 0]), [[0, 2, true], [3, 3, false]]);
  assert.equal(parseTrack('C4:2 . x:3').length, 6);
  assert.throws(() => parseTrack('Q9'));
  assert.equal(trackInstrument('pad2'), 'pad');
});

test('audio: three original songs compile, every track fills its pattern', () => {
  assert.equal(SONGS.length, 3);
  assert.equal(new Set(SONGS.map((s) => s.name)).size, 3);
  for (const song of SONGS) {
    assert.ok(hasGlyphs(song.name), `${song.name} not drawable`);
    assert.ok(song.bpm >= 60 && song.bpm <= 180);
    const set = INSTRUMENT_SETS[song.instruments];
    assert.ok(set, `${song.name}: instruments ${song.instruments}`);
    for (const [k, inst] of Object.entries(set)) checkInstrument(`${song.instruments}.${k}`, inst);
    for (const o of song.order) assert.ok(song.patterns[o], `${song.name}: order uses ${o}`);
    const c = compileSong(song);
    assert.ok(near(c.stepDur, 60 / song.bpm / 4));
    for (const [pname, tracks] of Object.entries(song.patterns)) {
      for (const track of Object.keys(tracks)) assert.ok(set[trackInstrument(track)], `${song.name}/${pname}: no instrument for ${track}`);
      const notes = c.steps[pname].flat().filter((e) => e.freq > 0);
      for (const e of notes) {
        if (e.inst === 'bass') assert.ok(e.freq < 300, `${song.name}: bass note too high`);
        if (e.inst === 'lead') assert.ok(e.freq > 200 && e.freq < 2400, `${song.name}: lead out of range`);
      }
    }
    // The melody plays for a good part of the song (in play order).
    let leadSteps = 0;
    for (const o of song.order) for (const e of parseTrack(song.patterns[o].lead).events) leadSteps += e.steps;
    const share = leadSteps / (song.order.length * PATTERN_STEPS);
    assert.ok(share >= 0.4, `${song.name}: melody plays only ${(share * 100).toFixed(0)}% of the time`);
  }
});

test('audio: songs stay in key (lead notes fit a 7-note scale)', () => {
  for (const song of SONGS) {
    const pcs = new Set();
    for (const tracks of Object.values(song.patterns)) {
      for (const e of parseTrack(tracks.lead).events) pcs.add(Math.round(12 * Math.log2(e.freq / 440) + 69) % 12);
    }
    // Some rotation of the major scale must contain every pitch class used.
    const major = [0, 2, 4, 5, 7, 9, 11];
    const fits = [...Array(12).keys()].some((r) => [...pcs].every((pc) => major.includes((pc - r + 12) % 12)));
    assert.ok(fits, `${song.name}: melody leaves the key (${[...pcs].sort((a, b) => a - b)})`);
  }
});

test('audio: sequencer schedules each step once, on the step grid, ahead of time', () => {
  const song = SONGS[0];
  const c = compileSong(song);
  const seq = createSequencer();
  startSong(seq, c, 10);
  const times = [];
  let now = 10;
  for (let f = 0; f < 60 * 8; f++) {
    advanceSequencer(seq, now, (ev, time) => times.push(time));
    now += 1 / 60;
  }
  assert.ok(times.length > 100);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1], 'events out of order');
  for (const t of times) {
    const k = (t - 10.05) / c.stepDur;
    assert.ok(Math.abs(k - Math.round(k)) < 1e-6, 'event off the step grid');
    assert.ok(t <= now + CONFIG.audio.lookahead + 1e-9);
  }
  // Nothing new is scheduled when the clock has not moved.
  assert.equal(advanceSequencer(seq, now - 1 / 60, () => {}), 0);
  // After a long pause (hidden tab) it resyncs to "now" instead of flooding notes.
  const burst = [];
  advanceSequencer(seq, now + 30, (ev, time) => burst.push(time));
  assert.ok(burst.every((t) => t >= now + 30 - 1e-9), 'scheduled notes in the past after a pause');
  assert.ok(burst.length < 40, `flooded ${burst.length} notes after a pause`);
  // The full order loops back to the first pattern.
  const seq2 = createSequencer();
  startSong(seq2, c, 0);
  const total = c.order.length * PATTERN_STEPS * c.stepDur;
  advanceSequencer(seq2, total + 0.01, () => {});
  assert.equal(seq2.orderIndex, 0);
});

function mockAudioCtx() {
  const created = [];
  const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (kind) => {
    const n = { kind, connected: 0, disconnected: false, connect() { this.connected++; }, disconnect() { this.disconnected = true; } };
    created.push(n);
    return n;
  };
  return {
    created,
    currentTime: 0,
    createGain() { const n = node('gain'); n.gain = param(); return n; },
    createBiquadFilter() { const n = node('filter'); n.frequency = param(); n.Q = param(); return n; },
    createOscillator() { const n = node('osc'); n.frequency = param(); n.detune = param(); n.start = () => {}; n.stop = (t) => { n.stopAt = t; }; return n; },
    createBufferSource() { const n = node('noise'); n.start = () => {}; n.stop = (t) => { n.stopAt = t; }; return n; },
  };
}

test('audio: a note builds its nodes once and disconnects them all when it ends', () => {
  const ctx = mockAudioCtx();
  const dest = { connect() {} };
  const inst = INSTRUMENT_SETS.bright.lead;
  const count = playNote(ctx, dest, inst, 440, 1, 0.5, null);
  assert.equal(count, ctx.created.length);
  assert.ok(count >= 3, 'lead with detune and filter should use osc×2 + filter + gain');
  const sources = ctx.created.filter((n) => n.kind === 'osc');
  assert.ok(sources.every((o) => o.stopAt > 1 + noteHold(inst, 0.5)));
  sources[0].onended();
  assert.ok(ctx.created.every((n) => n.disconnected), 'nodes left connected after the note');
  const broken = { createGain() { throw new Error('blocked'); } };
  assert.equal(playNote(broken, dest, inst, 440, 0, 0.1, null), 0);
});

test('audio: every sound effect is defined and playable', () => {
  const needed = ['start', 'shift', 'bump', 'side', 'crash', 'checkpoint', 'timeWarn', 'timeUp', 'goal', 'driftBank', 'driftLost', 'radio',
    'taskStart', 'taskWin', 'taskLose'];
  for (const n of needed) assert.ok(EFFECTS[n], `missing effect ${n}`);
  for (const [k, inst] of Object.entries(SFX_INSTRUMENTS)) checkInstrument(k, inst);
  for (const [name, notes] of Object.entries(EFFECTS)) {
    for (const [inst, note, at, len] of notes) {
      assert.ok(SFX_INSTRUMENTS[inst], `${name}: instrument ${inst}`);
      assert.ok(note === '-' || !Number.isNaN(noteFrequency(note)), `${name}: note ${note}`);
      assert.ok(at >= 0 && len > 0);
      if (note === '-') assert.ok(SFX_INSTRUMENTS[inst].wave === 'noise' || SFX_INSTRUMENTS[inst].freq, `${name}: pitched instrument without a note`);
    }
  }
});

test('audio: engine pitch, level and brightness rise smoothly with rpm and throttle', () => {
  let prev = engineParams(0, 0);
  const e = CONFIG.audio.engine;
  assert.equal(prev.freq, e.baseFreq);
  for (let r = 0.05; r <= 1.0001; r += 0.05) {
    const p = engineParams(r, 1);
    assert.ok(p.freq > prev.freq && p.cutoff >= prev.cutoff);
    prev = p;
  }
  assert.ok(near(prev.freq, e.maxFreq));
  assert.ok(engineParams(0.5, 1).gain > engineParams(0.5, 0).gain);
  assert.equal(engineParams(2, 0).freq, e.maxFreq);
});

test('audio: without a browser audio is disabled but every call is safe', () => {
  unlockAudio();
  assert.equal(audioState().ctx, null);
  assert.ok(audioState().failed);
  playEffect('crash');
  updateCarSounds({ rpm: 5000, drift: true, driftAngle: 1, offRoad: true, speed: 9000 }, 1);
  updateCarSounds(null, 0);
  const before = radioStatus().index;
  const name = radioNext();
  assert.equal(radioStatus().index, (before + 1) % SONGS.length);
  assert.equal(name, SONGS[radioStatus().index].name);
});

// ---------------------------------------------------------------- passenger
const MEASURES = ['timeAbove', 'timeBelow', 'driftTime', 'multiplier', 'overtakes', 'noHits', 'offRoadTime'];

test('passenger: at least 6 task types, valid data, drawable texts', () => {
  const keys = Object.keys(TASKS);
  assert.ok(keys.length >= 6, `only ${keys.length} task types`);
  assert.equal(new Set(keys.map((k) => TASKS[k].measure)).size, keys.length, 'two task types share a measure');
  for (const [k, t] of Object.entries(TASKS)) {
    assert.ok(MEASURES.includes(t.measure), `${k}: measure ${t.measure}`);
    for (const f of ['target', 'kmh', 'limit']) if (t[f]) assert.equal(t[f].length, 5, `${k}.${f} needs 5 stage values`);
    if (!['noHits', 'offRoadTime'].includes(t.measure)) assert.ok(t.target, `${k}: no target`);
    if (t.measure === 'offRoadTime') assert.ok(t.limit, `${k}: no limit`);
    if (t.fits.themes) for (const th of t.fits.themes) assert.ok(THEMES[th], `${k}: theme ${th}`);
    for (let i = 0; i < 5; i++) {
      const text = t.text.replace('{target}', String(t.target ? t.target[i] : 0)).replace('{kmh}', String(t.kmh ? t.kmh[i] : 0));
      assert.ok(hasGlyphs(text) && !/[{}]/.test(text) && text.length * 6 <= CONFIG.screen.width, `${k}: text '${text}'`);
    }
  }
  for (const line of [...Object.values(PASSENGER_LINES), ...TIME_UP_ENDINGS]) assert.ok(hasGlyphs(line) && line.length * 6 <= CONFIG.screen.width, line);
  for (const g of Object.values(GOALS)) {
    assert.equal(g.endings.length, 3);
    for (const e of g.endings) assert.ok(hasGlyphs(e) && e.length * 6 <= CONFIG.screen.width, e);
  }
});

test('passenger: tasks are matched to the section data', () => {
  const twisty = { theme: 'desertNoon', traffic: { density: 0.1 }, segments: [{ len: 100, curve: 5, hill: 0 }, { len: 100, curve: -5, hill: 0 }] };
  const straightFast = { theme: 'desertNoon', traffic: { density: 0.1 }, segments: [{ len: 400, curve: 0, hill: 0 }] };
  assert.deepEqual(sectionStats(twisty), { curviness: 5, longestStraight: 0, density: 0.1 });
  const a = candidateTasks(twisty);
  const b = candidateTasks(straightFast);
  assert.ok(a.includes('drift') && !a.includes('speed') && !a.includes('overtake') && !a.includes('scenic'));
  assert.ok(b.includes('speed') && !b.includes('drift'));
  assert.ok(!taskFits(TASKS.scenic, sectionStats(straightFast), 'desertNoon'));
  assert.ok(taskFits(TASKS.scenic, sectionStats(straightFast), 'pineDusk'));
  for (const s of SECTIONS) assert.ok(candidateTasks(s).length >= 3, `${s.id}: only ${candidateTasks(s).length} fitting tasks`);
  // Deterministic, never repeats the previous task when there is a choice.
  const r1 = createRng(8);
  const r2 = createRng(8);
  let last = null;
  for (let i = 0; i < 30; i++) {
    const k = pickTask(SECTION_BY_ID.C2, r1, last);
    assert.equal(k, pickTask(SECTION_BY_ID.C2, r2, last));
    assert.notEqual(k, last);
    assert.ok(candidateTasks(SECTION_BY_ID.C2).includes(k));
    last = k;
  }
});

function passengerWith(key, stage = 1) {
  const ps = createPassenger();
  startPassenger(ps);
  const section = { theme: 'coastDay', segments: [{ len: 10, curve: 0, hill: 0 }] };
  // Force the task: a one-candidate rng is not needed, set it directly after beginTask.
  beginTask(ps, section, stage, createRng(1));
  const t = TASKS[key];
  ps.key = key;
  ps.target = t.target ? t.target[stage - 1] : 0;
  ps.kmh = t.kmh ? t.kmh[stage - 1] : 0;
  ps.limit = t.limit ? t.limit[stage - 1] : 0;
  ps.value = 0;
  return ps;
}

function passengerEnvFor(over = {}) {
  return {
    player: { speed: 0, drift: false, offRoad: false, ...over.player },
    score: { multiplier: 1, ...over.score },
    hit: false, crashed: false, overtakes: 0, section: SECTION_BY_ID.A1, stage: 1, rng: createRng(1), ...over.env,
  };
}

function runPassenger(ps, env, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) updatePassenger(ps, env, DT);
}

test('passenger: progress tasks win when the target is reached', () => {
  const kmhToSpeed = (k) => k / CONFIG.hud.kmhPerUnit;
  const speed = passengerWith('speed');
  const start = speed.hearts;
  runPassenger(speed, passengerEnvFor({ player: { speed: kmhToSpeed(speed.kmh + 10) } }), speed.target - 0.5);
  assert.ok(speed.running && taskProgress(speed) > 0.9);
  runPassenger(speed, passengerEnvFor({ player: { speed: kmhToSpeed(speed.kmh + 10) } }), 1);
  assert.ok(!speed.running && speed.hearts === start + 1 && speed.wins === 1);
  const slow = passengerWith('scenic');
  runPassenger(slow, passengerEnvFor({ player: { speed: 0 } }), 10);
  assert.ok(slow.running, 'standing still must not count as enjoying the view');
  runPassenger(slow, passengerEnvFor({ player: { speed: kmhToSpeed(slow.kmh - 20) } }), slow.target + 0.1);
  assert.ok(!slow.running && slow.wins === 1);
  const drift = passengerWith('drift');
  runPassenger(drift, passengerEnvFor({ player: { speed: 9000, drift: true } }), drift.target + 0.1);
  assert.equal(drift.wins, 1);
  const combo = passengerWith('combo');
  updatePassenger(combo, passengerEnvFor({ score: { multiplier: combo.target } }), DT);
  assert.equal(combo.wins, 1);
  const pass = passengerWith('overtake');
  for (let i = 0; i < pass.target; i++) updatePassenger(pass, passengerEnvFor({ env: { overtakes: 1 } }), DT);
  assert.equal(pass.wins, 1);
});

test('passenger: guard tasks fail on a violation, win if they survive the section', () => {
  const clean = passengerWith('clean');
  updatePassenger(clean, passengerEnvFor({ env: { hit: true } }), DT);
  assert.ok(!clean.running && clean.losses === 1);
  const clean2 = passengerWith('clean');
  runPassenger(clean2, passengerEnvFor(), 5);
  sectionChanged(clean2);
  assert.equal(clean2.wins, 1);
  const road = passengerWith('onRoad');
  runPassenger(road, passengerEnvFor({ player: { offRoad: true, speed: 3000 } }), road.limit - 0.3);
  assert.ok(road.running && taskProgress(road) > 0);
  runPassenger(road, passengerEnvFor({ player: { offRoad: true, speed: 3000 } }), 0.5);
  assert.ok(!road.running && road.losses === 1);
  const unfinished = passengerWith('speed');
  finishTask(unfinished);
  assert.equal(unfinished.losses, 1, 'unfinished progress task must be lost');
});

test('passenger: hearts stay within 0..5, crashes cost a heart, tasks follow sections', () => {
  const ps = createPassenger();
  startPassenger(ps);
  assert.equal(ps.hearts, CONFIG.passenger.startHearts);
  for (let i = 0; i < 10; i++) updatePassenger(ps, passengerEnvFor({ env: { crashed: true } }), DT);
  assert.equal(ps.hearts, 0);
  assert.equal(ps.message, PASSENGER_LINES.crash);
  ps.hearts = CONFIG.passenger.maxHearts;
  ps.running = true;
  ps.key = 'combo';
  ps.target = 2;
  updatePassenger(ps, passengerEnvFor({ score: { multiplier: 5 } }), DT);
  assert.equal(ps.hearts, CONFIG.passenger.maxHearts);
  // A new task is given only after the delay following a section change.
  const q = createPassenger();
  startPassenger(q);
  assert.ok(!q.running);
  runPassenger(q, passengerEnvFor({ env: { section: SECTION_BY_ID.C3, stage: 3 } }), CONFIG.passenger.taskDelay + 0.1);
  assert.ok(q.running && candidateTasks(SECTION_BY_ID.C3).includes(q.key) && q.stage === 3);
  assert.equal(endingTier(0), 0);
  assert.equal(endingTier(2), 1);
  assert.equal(endingTier(5), 2);
  const sc = createScore();
  awardPassenger(sc, 4);
  awardPassenger(sc, 4);
  assert.equal(sc.total, 4 * CONFIG.passenger.heartBonus);
});

test('passenger: overtakes count cars passed by the player, not cars passing the player', () => {
  const { traffic, v } = soloTraffic('sedan', 10000, 0.66, 5000);
  const p = createPlayer();
  p.z = 5000;
  assert.equal(countOvertakes(traffic, p, straight.length), 0);
  p.z = 12000;
  assert.equal(countOvertakes(traffic, p, straight.length), 1);
  assert.equal(countOvertakes(traffic, p, straight.length), 0);
  // A car starting behind that passes the player is not an overtake.
  v.ahead = 0;
  v.z = 8000;
  p.z = 11000;
  countOvertakes(traffic, p, straight.length);
  v.z = 14000;
  countOvertakes(traffic, p, straight.length);
  v.z = 9000;
  assert.equal(countOvertakes(traffic, p, straight.length), 1, 'only the car that was clearly ahead counts');
});

test('passenger: race integration, and normal mode is unchanged', () => {
  const input = { value: (a) => (a === 'accelerate' ? 1 : 0), steer: () => 0, wasPressed: () => false, isDown: () => false, pad: { connected: false } };
  const run = (passenger) => {
    raceState.enter({ env: ENV, startId: 'A1', rng: createRng(21), god: true, passenger });
    const live = raceState.inspect();
    const trace = [];
    for (let i = 0; i < 60 * 12; i++) {
      raceState.update(DT, input);
      trace.push(live.player.z, live.player.x, live.score.total);
    }
    return { trace, active: live.passenger.active, key: live.passenger.key };
  };
  const normal = run(false);
  const withP = run(true);
  assert.ok(!normal.active);
  assert.ok(withP.active && withP.key, 'no task given in passenger mode');
  assert.deepEqual(withP.trace, normal.trace, 'passenger mode changed driving or scoring');
});

// ---------------------------------------------------------------- storage
function memoryBackend() {
  const data = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('storage: highscores survive a reload, table stays sorted and trimmed', () => {
  const backend = memoryBackend();
  const a = createStore(backend);
  assert.ok(a.available);
  assert.deepEqual(a.data, defaultData());
  for (let i = 1; i <= CONFIG.highscores.max + 3; i++) addHighscore(a, { name: 'AB' + (i % 10), score: i * 1000, goal: 'goalHarbor', passenger: i % 2 === 0 });
  assert.equal(a.data.highscores.length, CONFIG.highscores.max);
  assert.equal(a.data.highscores[0].score, (CONFIG.highscores.max + 3) * 1000);
  const b = createStore(backend);  // "page refresh"
  assert.deepEqual(b.data.highscores, a.data.highscores);
  assert.ok(!qualifies(b, 1000));
  assert.ok(qualifies(b, 999999));
  assert.equal(addHighscore(b, { name: 'TOP', score: 999999, goal: '', passenger: false }), 0);
  assert.equal(addHighscore(b, { name: 'LOW', score: 1, goal: '', passenger: false }), -1);
  assert.ok(!qualifies(createStore(memoryBackend()), 0), 'zero score must not enter the table');
});

test('storage: broken, foreign or blocked storage never breaks the game', () => {
  const bad = memoryBackend();
  bad.setItem('neonCoast86', '{not json');
  assert.deepEqual(createStore(bad).data, defaultData());
  const weird = sanitize({ version: 1, settings: { music: 99, sfx: -3, engine: 5, radio: 'x', lastName: 'TOOLONG' },
    highscores: [{ name: 'OK', score: 5 }, { name: 7, score: 9 }, null, { name: 'NEG', score: -1 }] });
  assert.equal(weird.settings.music, defaultData().settings.music);
  assert.equal(weird.settings.engine, 5);
  assert.equal(weird.settings.lastName, CONFIG.highscores.defaultName);
  assert.deepEqual(weird.highscores.map((h) => h.name), ['OK']);
  assert.deepEqual(sanitize({ version: 999 }), defaultData());
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceeded'); } };
  const st = createStore(blocked);
  assert.ok(!st.available);
  assert.equal(addHighscore(st, { name: 'MEM', score: 500, goal: '', passenger: false }), 0, 'in-memory table must still work');
  assert.equal(saveStore(st), false);
  const none = createStore(null);
  assert.ok(!none.available && !saveStore(none));
});

// ---------------------------------------------------------------- menus
function pressOnce(...actions) {
  const set = new Set(actions);
  return { wasPressed: (a) => set.has(a), isDown: () => false, value: () => 0, steer: () => 0, pad: { connected: false } };
}
const NO_INPUT = pressOnce();

test('menu: navigation wraps, values change and clamp, start/back', () => {
  const settings = defaultData().settings;
  const m = createMenu(settings);
  assert.equal(MENU_ITEMS[m.cursor], 'start');
  menuStep(m, pressOnce('up'));
  assert.equal(MENU_ITEMS[m.cursor], 'back');
  menuStep(m, pressOnce('down'));
  menuStep(m, pressOnce('down'));
  assert.equal(menuStep(m, pressOnce('right')), 'mode');
  assert.ok(m.passenger && m.values[1] === TEXT.modePassenger);
  menuStep(m, pressOnce('down'));
  assert.equal(menuStep(m, pressOnce('left')), 'radio');
  assert.equal(m.radio, SONGS.length - 1, 'radio did not wrap');
  menuStep(m, pressOnce('down'));
  for (let i = 0; i < 30; i++) menuStep(m, pressOnce('right'));
  assert.equal(m.music, CONFIG.menu.volumeSteps);
  assert.equal(m.values[3], '100');
  for (let i = 0; i < 30; i++) menuStep(m, pressOnce('left'));
  assert.equal(m.music, 0);
  assert.equal(menuStep(m, pressOnce('back')), 'back');
  m.cursor = 0;
  assert.equal(menuStep(m, pressOnce('confirm')), 'start');
  assert.equal(menuStep(m, NO_INPUT), '');
  applySettings(m, settings);
  assert.ok(settings.passenger && settings.music === 0 && settings.radio === SONGS.length - 1);
  for (const v of m.values) if (v) assert.ok(hasGlyphs(v));
});

test('pause and name entry: controls behave like an arcade cabinet', () => {
  assert.equal(pauseStep(pressOnce('pause')), 'resume');
  assert.equal(pauseStep(pressOnce('back')), 'resume');
  pauseStep(pressOnce('down'));
  assert.equal(pauseStep(pressOnce('confirm')), 'restart');
  pauseStep(pressOnce('down'));
  assert.equal(pauseStep(pressOnce('confirm')), 'quit');
  pauseStep(pressOnce('down'));
  assert.equal(pauseStep(pressOnce('confirm')), 'resume', 'cursor did not wrap');
  const e = { chars: charsOf('AAA'), cursor: 0 };
  nameStep(e, pressOnce('down'));
  assert.equal(nameOf(e.chars)[0], CONFIG.highscores.charset[CONFIG.highscores.charset.length - 1]);
  nameStep(e, pressOnce('up'));
  nameStep(e, pressOnce('up'));
  assert.equal(nameOf(e.chars), 'BAA');
  assert.equal(nameStep(e, pressOnce('confirm')), false);
  nameStep(e, pressOnce('up'));
  nameStep(e, pressOnce('right'));
  nameStep(e, pressOnce('right'));
  assert.equal(e.cursor, 2);
  assert.equal(nameStep(e, pressOnce('confirm')), true);
  assert.equal(nameOf(e.chars), 'BBA');
  assert.ok(hasGlyphs(CONFIG.highscores.charset));
  for (const k of ['title1', 'title2', 'pressStart', 'menuHint', 'nameHint', 'noSave', 'paused', 'quit']) {
    assert.ok(hasGlyphs(TEXT[k]) && TEXT[k].length * 6 <= CONFIG.screen.width, k);
  }
});

test('input: menu up/down from arrows, D-pad and the left stick', () => {
  const pads = [fakePad()];
  const input = createInput(fakeTarget(), () => pads);
  input.onKeyDown({ code: 'ArrowUp' });
  assert.ok(input.wasPressed('up') && input.isDown('accelerate'));
  input.endStep();
  input.onKeyUp({ code: 'ArrowUp' });
  pads[0] = fakePad({ 13: 1 });
  input.poll();
  assert.ok(input.wasPressed('down'));
  input.endStep();
  pads[0] = fakePad({}, [0, -0.9, 0, 0]);
  input.poll();
  assert.ok(input.wasPressed('up') && !input.isDown('down'));
});

// ---------------------------------------------------------------- attract mode and state flow
test('autopilot: the demo driver stays on the road and takes forks', () => {
  raceState.enter(buildDemoParams());
  const live = raceState.inspect();
  let off = 0;
  for (let i = 0; i < 60 * 60 && live.race.sectionIndex < 1; i++) {
    raceState.update(DT, NO_INPUT);
    if (live.player.offRoad) off++;
  }
  assert.equal(live.race.sectionIndex, 1, 'demo never reached the next section');
  assert.ok(off < 60, `demo car off-road for ${off} steps`);
  assert.equal(live.player.gear, 'HIGH');
  const ap = createAutopilot();
  const c = { throttle: 0, brake: 0, steer: 0, gearToggle: false, drift: false };
  const p = createPlayer();
  p.x = 0.8;
  autopilotControls(ap, p, straight, 0, createRng(1), c);
  assert.ok(c.steer < 0 && c.throttle === 1);
});

test('states: boot → title → menu → race ⇄ pause → title, results → name entry → title', () => {
  const states = { boot: bootState, title: titleState, menu: menuState, race: raceState, pause: pauseState,
    nameEntry: nameEntryState, goal: goalState, gameOver: gameOverState };
  for (const [k, v] of Object.entries(states)) registerState(k, v);
  setState('boot', { first: true, seed: 3 });
  assert.equal(getStateName(), 'title');
  updateState(DT, NO_INPUT);
  updateState(DT, pressOnce('confirm'));
  assert.equal(getStateName(), 'menu');
  updateState(DT, pressOnce('confirm'));
  assert.equal(getStateName(), 'race');
  const live = raceState.inspect();
  for (let i = 0; i < 60; i++) updateState(DT, { ...NO_INPUT, value: (a) => (a === 'accelerate' ? 1 : 0) });
  const z = live.player.z;
  const t = live.race.time;
  assert.ok(z > 0);
  updateState(DT, pressOnce('pause'));
  assert.equal(getStateName(), 'pause');
  for (let i = 0; i < 120; i++) updateState(DT, NO_INPUT);
  assert.equal(live.player.z, z, 'race moved while paused');
  assert.equal(live.race.time, t, 'timer ran while paused');
  updateState(DT, pressOnce('pause'));
  assert.equal(getStateName(), 'race');
  assert.equal(live.player.z, z, 'resume reset the race');
  updateState(DT, pressOnce('pause'));
  updateState(DT, pressOnce('down'));
  updateState(DT, pressOnce('down'));
  updateState(DT, pressOnce('confirm'));
  assert.equal(getStateName(), 'title');
  // Result → name entry (qualifying score) → title with the entry highlighted.
  setState('goal', { race: { route: ['A1'], elapsed: 12, goalId: 'goalHarbor' }, score: { total: 123456, goalBonus: 0, passengerBonus: 0 } });
  updateState(DT, pressOnce('confirm'));
  assert.equal(getStateName(), 'nameEntry');
  updateState(DT, pressOnce('confirm'));
  updateState(DT, pressOnce('confirm'));
  updateState(DT, pressOnce('confirm'));
  assert.equal(getStateName(), 'title');
});

// ---------------------------------------------------------------- key bindings and help
test('keys: defaults cover every action, labels are short and drawable', () => {
  const map = buildKeyMap(DEFAULT_KEYS);
  const bound = new Set(Object.values(map).flat());
  for (const a of ACTIONS) assert.ok(bound.has(a) || PAD_BUTTONS[a].length > 0, `action ${a} has no key`);
  for (const a of REBINDABLE) {
    assert.ok(DEFAULT_KEYS[a] && DEFAULT_KEYS[a].length === KEY_SLOTS, `${a} defaults`);
    assert.ok(ACTION_NAMES[a] && hasGlyphs(ACTION_NAMES[a]) && PAD_NAMES[a] && hasGlyphs(PAD_NAMES[a]), `${a} names`);
    assert.ok(!FIXED_KEYS[a], `${a} is both fixed and rebindable`);
  }
  assert.equal(keyLabel('KeyW'), 'W');
  assert.equal(keyLabel('ArrowUp'), 'UP');
  assert.equal(keyLabel('Digit7'), '7');
  assert.equal(keyLabel('Numpad4'), 'NUM4');
  assert.equal(keyLabel('ShiftLeft'), 'LSHIFT');
  assert.equal(keyLabel(null), '-');
  for (const code of ['BracketLeft', 'Semicolon', 'IntlBackslash', 'MetaLeft']) {
    const l = keyLabel(code);
    assert.ok(hasGlyphs(l) && l.length <= 7, `label ${l}`);
  }
});

test('keys: a key belongs to one driving action, broken saves fall back to defaults', () => {
  const keys = normalizeBindings(DEFAULT_KEYS);
  assignKey(keys, 'drift', 1, 'KeyW');
  assert.deepEqual(keys.drift, ['Space', 'KeyW']);
  assert.deepEqual(keys.accelerate, ['ArrowUp', null], 'W must leave accelerate');
  assignKey(keys, 'drift', 0, null);
  assert.equal(keys.drift[0], null);
  const fixed = normalizeBindings({ accelerate: ['KeyI', 42], brake: 'nope', left: ['Arrow Left!', null] });
  assert.deepEqual(fixed.accelerate, ['KeyI', null]);
  assert.deepEqual(fixed.brake, DEFAULT_KEYS.brake);
  assert.deepEqual(fixed.left, [null, null]);
  assert.deepEqual(normalizeBindings(null), normalizeBindings(DEFAULT_KEYS));
  assert.equal(applyCapturedKey(keys, 'pause', 0, 'Escape'), false, 'ESC must cancel');
  assert.equal(applyCapturedKey(keys, 'pause', 0, 'Delete'), true);
  assert.equal(keys.pause[0], null);
  assert.equal(applyCapturedKey(keys, 'pause', 0, 'KeyO'), true);
  assert.equal(keys.pause[0], 'KeyO');
});

test('keys: rebinding changes driving, menus keep their fixed keys, capture swallows the key', () => {
  const input = createInput(fakeTarget(), () => []);
  const keys = normalizeBindings(DEFAULT_KEYS);
  for (const a of REBINDABLE) { keys[a] = [null, null]; }
  keys.accelerate = ['KeyI', null];
  input.setBindings(keys);
  input.onKeyDown({ code: 'ArrowUp' });
  assert.ok(!input.isDown('accelerate') && input.isDown('up'), 'arrow must still move menus but not drive');
  input.onKeyUp({ code: 'ArrowUp' });
  input.onKeyDown({ code: 'ArrowLeft' });
  assert.ok(input.wasPressed('menuLeft') && !input.isDown('left'));
  input.onKeyUp({ code: 'ArrowLeft' });
  input.onKeyDown({ code: 'KeyI' });
  assert.ok(input.isDown('accelerate'));
  input.onKeyUp({ code: 'KeyI' });
  input.endStep();
  let got = null;
  input.captureKey((code) => { got = code; });
  input.onKeyDown({ code: 'KeyI' });
  assert.equal(got, 'KeyI');
  assert.ok(!input.isDown('accelerate') && !input.wasPressed('accelerate'), 'captured key leaked into the game');
  input.onKeyUp({ code: 'KeyI' });
  input.onKeyDown({ code: 'KeyI' });
  assert.ok(input.isDown('accelerate'), 'capture must end after one key');
});

test('keys: saved bindings survive a reload', () => {
  const backend = memoryBackend();
  const a = createStore(backend);
  assignKey(a.data.settings.keys, 'drift', 0, 'KeyJ');
  saveStore(a);
  const b = createStore(backend);
  assert.equal(b.data.settings.keys.drift[0], 'KeyJ');
  assert.deepEqual(createStore(memoryBackend()).data.settings.keys, normalizeBindings(DEFAULT_KEYS));
});

test('help: pages fit the screen and page through', () => {
  assert.ok(HELP_PAGES.length >= 3);
  for (const p of HELP_PAGES) {
    assert.ok(hasGlyphs(p.title) && p.lines.length <= 9, p.title);
    for (const l of p.lines) assert.ok(hasGlyphs(l) && 18 + l.length * 6 <= CONFIG.screen.width - 8, `too long: '${l}'`);
  }
  assert.equal(helpStep(0, pressOnce('menuRight')), 1);
  assert.equal(helpStep(0, pressOnce('menuLeft')), HELP_PAGES.length - 1);
  assert.equal(helpStep(HELP_PAGES.length - 1, pressOnce('confirm')), -1);
  assert.equal(helpStep(1, pressOnce('back')), -1);
  assert.equal(helpStep(1, NO_INPUT), 1);
  for (const k of ['menuControls', 'menuHelp', 'pressKey', 'controlsHint', 'menuKeysNote', 'touchNote', 'helpHint', 'resetKeys']) {
    assert.ok(hasGlyphs(TEXT[k]) && TEXT[k].length * 6 <= CONFIG.screen.width, k);
  }
});

test('keys: menu → CONTROLS → new key → the race uses it', () => {
  registerState('controls', controlsState);
  registerState('help', helpState);
  const target = fakeTarget();
  const input = createInput(target, () => []);
  const step = () => { input.poll(); updateState(DT, input); input.endStep(); };
  const tap = (code) => { input.onKeyDown({ code }); step(); input.onKeyUp({ code }); step(); };
  setState('menu', {});
  const idx = MENU_ITEMS.indexOf('controls');
  for (let i = 0; i < idx; i++) tap('ArrowDown');
  tap('Enter');
  assert.equal(getStateName(), 'controls');
  tap('Enter');                    // capture for ACCELERATE, key 1
  tap('KeyI');                     // new key
  assert.equal(STORE.data.settings.keys.accelerate[0], 'KeyI');
  tap('Escape');
  assert.equal(getStateName(), 'menu');
  // Help opens and closes too.
  const h = MENU_ITEMS.indexOf('help');
  for (let i = MENU_ITEMS.indexOf('controls'); i < h; i++) tap('ArrowDown');
  tap('Enter');
  assert.equal(getStateName(), 'help');
  tap('Escape');
  assert.equal(getStateName(), 'menu');
  // In the race the new key accelerates.
  for (let i = 0; i < MENU_ITEMS.length; i++) { if (MENU_ITEMS[(h + i) % MENU_ITEMS.length] === 'start') break; tap('ArrowDown'); }
  tap('Enter');
  assert.equal(getStateName(), 'race');
  input.onKeyDown({ code: 'KeyI' });
  for (let i = 0; i < 60; i++) step();
  assert.ok(raceState.inspect().player.speed > 1000, 'rebound key does not accelerate');
  input.onKeyUp({ code: 'KeyI' });
  STORE.data.settings.keys = normalizeBindings(DEFAULT_KEYS);
});

// ---------------------------------------------------------------- licence
test('licence: AGPL-3.0 text, notices in the page and the README, ABOUT screen', () => {
  const license = readFileSync('LICENSE', 'utf8');
  assert.match(license.split('\n')[0], /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
  assert.ok(license.split('\n').length > 600, 'LICENSE is not the full text');
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /Copyright \(C\) 2026 Noneawe/);
  assert.match(html, /AGPL-3\.0-or-later/);
  assert.ok(html.includes(SOURCE_URL), 'source URL missing from index.html (and so from the build)');
  const readme = readFileSync('README.md', 'utf8');
  assert.match(readme, /AGPL-3\.0/);
  assert.ok(readme.includes(SOURCE_URL.replace('https://github.com/', '')) || readme.includes(SOURCE_URL));
  assert.match(SOURCE_URL, /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/);
  for (const line of [...ABOUT_LINES, SOURCE_URL, TEXT.copyright, TEXT.aboutHint, TEXT.menuAbout]) {
    assert.ok(hasGlyphs(line) && line.length * 6 <= CONFIG.screen.width - 16, `does not fit: '${line}'`);
  }
  assert.ok(ABOUT_LINES.some((l) => /AFFERO/.test(l)) && ABOUT_LINES.some((l) => /NONEAWE/.test(l)));
  assert.ok(MENU_ITEMS.includes('about'));
  assert.equal(aboutStep(pressOnce('back')), 'back');
  assert.equal(aboutStep(pressOnce('confirm')), 'open');
  assert.equal(aboutStep(NO_INPUT), '');
});

// ---------------------------------------------------------------- touch and mobile
function touchAt(t, ...pts) {
  t.points.forEach((p) => { p.id = -1; });
  pts.forEach(([x, y], i) => { t.points[i].id = i; t.points[i].x = x; t.points[i].y = y; });
  resolveTouches(t);
}

test('touch: client coordinates map to the 320×240 buffer', () => {
  const out = { x: 0, y: 0 };
  toBuffer(100 + 640, 50 + 480, { left: 100, top: 50, width: 1280, height: 960 }, out);
  assert.deepEqual(out, { x: 160, y: 120 });
  toBuffer(100, 50, { left: 100, top: 50, width: 1280, height: 960 }, out);
  assert.deepEqual(out, { x: 0, y: 0 });
});

test('touch: buttons fire their actions, the pad steers and moves menus', () => {
  const t = createTouchState();
  const gas = CONFIG.touch.buttons.find((b) => b.id === 'gas');
  const pad = CONFIG.touch.steer;
  touchAt(t);
  assert.ok(!t.active && t.steer === 0);
  touchAt(t, [gas.x, gas.y]);
  assert.ok(t.active && t.down.accelerate && t.down.confirm && t.pressedButtons.gas);
  touchAt(t, [pad.x + pad.radius * 0.5, pad.y]);
  assert.ok(near(t.steer, 0.5), `steer ${t.steer}`);
  touchAt(t, [pad.x + pad.radius * 3, pad.y + 60]);
  assert.equal(t.steer, 0, 'finger far outside the pad must not steer');
  touchAt(t, [pad.x - pad.radius * 1.2, pad.y]);
  assert.equal(t.steer, -1);
  assert.ok(t.down.left);
  touchAt(t, [pad.x + 2, pad.y]);
  assert.equal(t.steer, 0, 'dead zone');
  touchAt(t, [pad.x, pad.y - pad.radius]);
  assert.ok(t.down.up && !t.down.down);
  touchAt(t, [pad.x + pad.radius * 0.8, pad.y], [gas.x, gas.y]);
  assert.ok(t.steer > 0.5 && t.down.accelerate, 'two fingers: steer and gas together');
});

test('touch: layout stays on screen and buttons do not overlap', () => {
  const { width, height } = CONFIG.screen;
  const all = [...CONFIG.touch.buttons, { id: 'pad', ...CONFIG.touch.steer, r: CONFIG.touch.steer.radius }];
  for (const b of all) {
    assert.ok(b.x - b.r >= 0 && b.x + b.r <= width && b.y - b.r >= 0 && b.y + b.r <= height, `${b.id} off screen`);
    if (b.actions) for (const a of b.actions) assert.ok(ACTIONS.includes(a), `${b.id}: ${a}`);
    if (b.label) assert.ok(hasGlyphs(b.label));
  }
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y);
      assert.ok(d >= all[i].r + all[j].r, `${all[i].id} overlaps ${all[j].id}`);
    }
  }
  assert.ok(hasGlyphs(TEXT.rotate));
});

test('touch: input sees touch as a gamepad (edges, analog steer, menus)', () => {
  const t = createTouchState();
  const input = createInput(fakeTarget(), () => [], t);
  const gas = CONFIG.touch.buttons.find((b) => b.id === 'gas');
  const pad = CONFIG.touch.steer;
  touchAt(t, [gas.x, gas.y], [pad.x - pad.radius * 0.4, pad.y]);
  input.poll();
  assert.ok(input.isDown('accelerate') && input.wasPressed('confirm'));
  assert.ok(near(input.steer(), -0.4, 1e-9));
  assert.equal(input.value('accelerate'), 1);
  input.endStep();
  input.poll();
  assert.ok(!input.wasPressed('confirm'), 'held finger must not repeat the press');
  touchAt(t);
  input.poll();
  assert.ok(!input.isDown('accelerate') && input.steer() === 0);
});

test('performance: quality levels shorten the road but never below the fork logic', () => {
  const list = CONFIG.performance.drawDistances;
  assert.equal(list[0], CONFIG.road.drawDistance);
  for (let i = 1; i < list.length; i++) assert.ok(list[i] < list[i - 1]);
  for (const d of list) assert.ok(d <= CONFIG.fork.splitLength);
  setRoadQuality(99);
  assert.equal(roadQuality.drawDistance, list[list.length - 1]);
  const flat = buildTrack({ id: 'FLAT', theme: 'coastDay', segments: [{ len: 600, curve: 0, hill: 0 }] });
  prepareTrackColors(flat);
  renderRoad(mockCtx(), flat, { z: 0, x: 0 });
  assert.ok(roadStats.processed <= roadQuality.drawDistance);
  setRoadQuality(-5);
  assert.equal(roadQuality.drawDistance, list[0]);
});

// ---------------------------------------------------------------- code hygiene guards
function srcFiles() {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js')) files.push(p);
    }
  };
  walk('src');
  return Object.fromEntries(files.map((f) => [f, readFileSync(f, 'utf8')]));
}

test('hygiene: every export in src is used by another module or by the tests', () => {
  const src = srcFiles();
  const self = readFileSync('tools/test.mjs', 'utf8');
  const unused = [];
  for (const [f, text] of Object.entries(src)) {
    for (const m of text.matchAll(/^export\s+(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      const re = new RegExp(`\\b${m[1]}\\b`);
      const elsewhere = Object.entries(src).some(([g, t]) => g !== f && re.test(t));
      if (!elsewhere && !re.test(self)) unused.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual(unused, [], 'dead exports');
});

test('hygiene: every CONFIG key is used somewhere, no console.log outside debugLog', () => {
  const src = srcFiles();
  const config = src[join('src', 'config.js')];
  const rest = Object.entries(src).filter(([f]) => !f.endsWith('config.js')).map(([, t]) => t).join('\n')
    + readFileSync('tools/test.mjs', 'utf8');
  const unused = [];
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      const p = path ? `${path}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p);
      else if (!new RegExp(`\\b${k}\\b`).test(rest)) unused.push(p);
    }
  };
  walk(CONFIG, '');
  assert.deepEqual(unused, [], 'unused CONFIG keys');
  assert.ok(config.length > 0);
  for (const [f, t] of Object.entries(src)) {
    if (f.endsWith(join('engine', 'debug.js'))) continue;
    assert.ok(!/console\.log/.test(t), `console.log in ${f}`);
    assert.ok(!/\bvar\s/.test(t), `var in ${f}`);
    assert.ok(/^\/\/ /.test(t), `${f} must start with a module comment`);
  }
});

// ---------------------------------------------------------------- font
test('font: glyph data well-formed, debug text supported', () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    assert.equal(ch.length, 1);
    assert.equal(rows.length, GLYPH_H, `glyph '${ch}' rows`);
    for (const r of rows) assert.match(r, new RegExp(`^[01]{${GLYPH_W}}$`), `glyph '${ch}'`);
  }
  assert.ok(hasGlyphs('FPS 59.9 FRAME 1.23MS U 0.10 R 1.00'));
  assert.ok(hasGlyphs('STATE race SEG 12/1300 DRAWN 300 Z -123 X 0.00 SPD 12000 (100%) CURVE -6.00 Y 4000'));
  assert.ok(!hasGlyphs('ą'));
  const keys = Object.keys(GLYPHS);
  const zero = keys.indexOf('0');
  for (let d = 0; d <= 9; d++) assert.equal(keys[zero + d], String(d), 'digits must be contiguous for drawNumber');
  assert.ok(hasGlyphs('KM/H LOW HIGH RPM PAD NONE OFFROAD'));
});

// ---------------------------------------------------------------- road raster
function mockCtx() {
  const rects = [];
  return {
    rects,
    fillStyle: '',
    fillRect(x, y, w, h) { rects.push({ c: this.fillStyle, x, y, w, h }); },
    drawImage() {},
  };
}

const grassColors = new Set(track.segments.map((s) => s.colors.grass));

function checkRaster(z, x) {
  const ctx = mockCtx();
  const drawn = renderRoad(ctx, track, { z, x });
  const H = CONFIG.screen.height;
  const rows = new Array(H).fill(0);
  for (const r of ctx.rects) {
    assert.ok(Number.isInteger(r.x) && Number.isInteger(r.y) && Number.isInteger(r.w) && Number.isInteger(r.h),
      `non-integer rect at z=${z}`);
    if (grassColors.has(r.c) && r.w === CONFIG.screen.width) {
      for (let y = r.y; y < r.y + r.h; y++) rows[y]++;
    }
  }
  const first = rows.findIndex((v) => v > 0);
  assert.ok(drawn > 0 && first >= 0, `nothing drawn at z=${z}`);
  for (let y = first; y < H; y++) {
    assert.equal(rows[y], 1, `row ${y} painted ${rows[y]}× at z=${z}, x=${x}`);
  }
  return first;
}

test('road: every ground row painted exactly once (no gaps, no overdraw)', () => {
  const step = SEGMENT_LENGTH * 7 + 37;
  for (let z = 0; z < track.length; z += step) checkRaster(z, 0);
  checkRaster(123456 % track.length, 1.5);
  checkRaster(track.length - 50, -1.2);
});

test('road: flat straight horizon near screen centre, road centred', () => {
  const flat = buildTrack({ id: 'FLAT', theme: 'coastDay', segments: [{ len: 400, curve: 0, hill: 0 }] });
  prepareTrackColors(flat);
  const ctx = mockCtx();
  renderRoad(ctx, flat, { z: 10, x: 0 });
  const grass = ctx.rects.filter((r) => r.w === CONFIG.screen.width);
  const first = Math.min(...grass.map((r) => r.y));
  // Farthest drawn segment sits slightly below the true horizon (finite draw distance).
  const H = CONFIG.screen.height;
  const farZ = CONFIG.road.drawDistance * SEGMENT_LENGTH - 10;
  const expected = H / 2 + (CAMERA_DEPTH / farZ) * CONFIG.camera.height * (H / 2);
  assert.ok(Math.abs(first - expected) <= 1.5, `horizon row ${first}, expected ~${expected.toFixed(1)}`);
  const roadSet = new Set([THEMES.coastDay.palette.road, THEMES.coastDay.palette.roadDark]);
  for (const r of ctx.rects.filter((q) => roadSet.has(q.c))) {
    const centre = r.x + r.w / 2;
    assert.ok(Math.abs(centre - CONFIG.screen.width / 2) <= 1, `road row ${r.y} centred at ${centre}`);
  }
});

test('road: crest hides road beyond it', () => {
  // Find the top of the 40-unit hill and stand just before it.
  const segs = track.segments;
  let top = 0;
  for (let i = 1; i < segs.length; i++) if (segs[i].p1.world.y > segs[top].p1.world.y) top = i;
  const z = (top - 15) * SEGMENT_LENGTH;
  const first = checkRaster(z, 0);
  const H = CONFIG.screen.height;
  assert.ok(first > H / 2, `expected horizon below centre at crest, got row ${first}`);
});

// ---------------------------------------------------------------- roadside sprite projection
test('sprites: projection follows the segment, shrinks with distance', () => {
  const flat = buildTrack({ id: 'FLAT', theme: 'coastDay', segments: [{ len: 400, curve: 0, hill: 0 }] });
  prepareTrackColors(flat);
  renderRoad(mockCtx(), flat, { z: 0, x: 0 });
  const spr = { x: 1.5, worldWidth: 1000 };
  const near1 = { left: 0, top: 0, w: 0, h: 0, visible: 0 };
  const far1 = { ...near1 };
  assert.ok(projectSprite(flat.segments[20], spr, 20, 40, near1));
  assert.ok(projectSprite(flat.segments[80], spr, 20, 40, far1));
  assert.ok(far1.w < near1.w && far1.h < near1.h);
  assert.ok(near1.left > CONFIG.screen.width / 2, 'right-side sprite drawn left of centre');
  assert.equal(near1.visible, near1.h, 'flat road must not clip sprites');
  assert.equal(near1.top + near1.h, Math.round(flat.segments[20].p1.screen.y), 'sprite not standing on its segment');
  // Mirror on the left side.
  const left = { ...near1 };
  projectSprite(flat.segments[20], { x: -1.5, worldWidth: 1000 }, 20, 40, left);
  assert.ok(Math.abs((left.left + left.w / 2) + (near1.left + near1.w / 2) - CONFIG.screen.width) <= 1);
});

test('sprites: vehicle projection interpolates inside its segment', () => {
  const flat = buildTrack({ id: 'FLAT', theme: 'coastDay', segments: [{ len: 400, curve: 2, hill: 0 }] });
  prepareTrackColors(flat);
  renderRoad(mockCtx(), flat, { z: 0, x: 0 });
  const seg = flat.segments[30];
  const a = { left: 0, top: 0, w: 0, h: 0, visible: 0 };
  const b = { ...a };
  const m = { ...a };
  projectVehicle(seg, 0, 0, 600, 50, 26, 50, a);
  projectVehicle(seg, 1, 0, 600, 50, 26, 50, b);
  projectVehicle(seg, 0.5, 0, 600, 50, 26, 50, m);
  assert.ok(b.w <= m.w && m.w <= a.w, 'width not monotonic along the segment');
  assert.ok(b.top + b.h <= m.top + m.h && m.top + m.h <= a.top + a.h);
  assert.equal(a.top + a.h, Math.round(seg.p1.screen.y));
});

test('sprites: hidden or clipped behind a crest', () => {
  const segs = track.segments;
  let top = 0;
  for (let i = 1; i < segs.length; i++) if (segs[i].p1.world.y > segs[top].p1.world.y) top = i;
  renderRoad(mockCtx(), track, { z: (top - 15) * SEGMENT_LENGTH, x: 0 });
  const r = { left: 0, top: 0, w: 0, h: 0, visible: 0 };
  let hidden = 0;
  let clipped = 0;
  for (let i = top + 2; i < top + 150; i++) {
    const seg = segs[i];
    if (seg.p1.camera.z <= CAMERA_DEPTH) continue;
    const vis = projectSprite(seg, { x: 1.5, worldWidth: 1500 }, 40, 60, r);
    if (vis && r.visible < r.h) clipped++;
    if (vis) assert.ok(r.top + r.visible <= seg.clip, 'sprite drawn below its clip row');
    // A small sprite (e.g. a post) in the dip behind the crest disappears entirely.
    if (!projectSprite(seg, { x: 1.2, worldWidth: 150 }, 6, 20, r)) hidden++;
  }
  assert.ok(hidden > 0, 'no sprite hidden behind the crest');
  assert.ok(clipped > 0, 'no sprite partially clipped at the crest');
  assert.ok(roadStats.processed > 0 && roadStats.processed <= CONFIG.road.drawDistance);
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
