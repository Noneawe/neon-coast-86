// Race state. Drives the player along the route (or the looping test track
// in test mode) among traffic; the camera follows behind the car. Race rules
// (time, checkpoints, forks, goal) live in game/race.js.

import { CONFIG } from '../config.js';
import { THEMES } from '../data/themes.js';
import { wrap } from '../engine/math.js';
import { createPlayer, resetPlayer, updatePlayer, interpolatePlayer, endDrift,
  CRASH_NONE, CRASH_TUMBLE, DRIFT_END_FAIL } from '../world/player.js';
import { createParticles, updateParticles } from '../world/particles.js';
import { createScore, resetScore, updateScore, awardGoal, awardPassenger } from '../game/score.js';
import { createPassenger, startPassenger, updatePassenger, sectionChanged, finishTask } from '../game/passenger.js';
import { createTraffic, spawnTraffic, updateTraffic, manageTraffic, countOvertakes, activeCount } from '../world/traffic.js';
import { collidePlayerSprites, collidePlayerVehicles, HIT_NONE, HIT_CRASH } from '../world/collision.js';
import { findSegment, createTrack, nearestRoadCenter } from '../world/track.js';
import { createRace, startRace, updateRace, raceOver, sectionProgress,
  RACE_RUNNING, RACE_FINISHED, RACE_TIME_UP } from '../game/race.js';
import { quantizeBlend, blendPalette } from '../gfx/palette.js';
import { drawParticles } from '../render/particles.js';
import { renderSky } from '../render/sky.js';
import { renderRoad, prepareTrackColors, roadStats, roadQuality, PLAYER_Z_OFFSET } from '../render/road.js';
import { drawPlayerCar, drawRoadsideSprites } from '../render/sprites.js';
import { drawHud, drawRaceHud, drawRadioName, drawPassengerHud } from '../render/hud.js';
import { setState } from './machine.js';
import { createAutopilot, autopilotControls } from '../game/autopilot.js';
import { playEffect, updateCarSounds, radioOn, radioNext, radioStatus } from '../audio/sfx.js';
import { audioState } from '../audio/mixer.js';

const player = createPlayer();
const controls = { throttle: 0, brake: 0, steer: 0, gearToggle: false, drift: false };
const view = { z: 0, x: 0 };
const bgOffsets = [0, 0, 0];
const traffic = createTraffic();
const race = createRace();
const score = createScore();
const fx = createParticles();
const passenger = createPassenger();
const passengerEnv = { player, score, hit: false, crashed: false, overtakes: 0, section: null, stage: 1, rng: null };
const PASSENGER_EFFECTS = { task: 'taskStart', win: 'taskWin', lose: 'taskLose' };
const HIT_NAMES = ['NONE', 'BUMP', 'SIDE', 'CRASH'];
let track = null;
let env = null;
let rng = null;
let god = false;
let testMode = false;
let demo = false;
const autopilot = createAutopilot();
let lastHit = HIT_NONE;
let spritesDrawn = 0;
let carsDrawn = 0;
let lastInput = null;
let radioName = '';
let radioTimer = 0;
// Previous-step values used to turn state changes into sound effects.
const prev = { gear: '', status: 0, messageTimer: 0, secs: 0, bankTimer: 0, sectionIndex: 0 };

function updateParallax(seg, dt) {
  const moved = (player.speed * dt) / CONFIG.road.segmentLength;
  const { layerSpeeds, layerWidth } = CONFIG.sky;
  for (let i = 0; i < bgOffsets.length; i++) {
    bgOffsets[i] = wrap(bgOffsets[i] + layerSpeeds[i] * layerWidth * seg.curve * moved, layerWidth);
  }
}

function readControls(input) {
  controls.gearToggle = false;
  controls.drift = false;
  if (demo) {
    autopilotControls(autopilot, player, track, race.sectionIndex, rng, controls);
    return;
  }
  if (!testMode && race.status !== RACE_RUNNING) {
    // After the race the car coasts (time up) or cruises to the road centre (goal).
    const finished = race.status === RACE_FINISHED;
    controls.throttle = finished ? CONFIG.race.autoDriveThrottle : 0;
    controls.brake = 0;
    const off = nearestRoadCenter(track, player.z, player.x) - player.x;
    controls.steer = finished ? Math.max(-1, Math.min(1, off * 2)) : 0;
    return;
  }
  controls.throttle = input.value('accelerate');
  controls.brake = input.value('brake');
  controls.steer = input.steer();
  controls.gearToggle = input.wasPressed('gearToggle');
  controls.drift = input.isDown('drift');
}

const HIT_EFFECTS = [null, 'bump', 'side', 'crash'];

/** Turns this step's state changes into sound effects. */
function playEvents(hit) {
  if (player.gear !== prev.gear) playEffect('shift');
  if (HIT_EFFECTS[hit]) playEffect(HIT_EFFECTS[hit]);
  if (score.bankTimer > prev.bankTimer) playEffect(score.lastFailed ? 'driftLost' : 'driftBank');
  if (!testMode) {
    if (race.messageTimer > prev.messageTimer) playEffect('checkpoint');
    if (race.status !== prev.status) playEffect(race.status === RACE_TIME_UP ? 'timeUp' : 'goal');
    const secs = Math.ceil(race.time);
    if (race.status === RACE_RUNNING && secs < prev.secs && secs <= CONFIG.race.lowTimeWarning) playEffect('timeWarn');
    prev.secs = secs;
  }
  if (PASSENGER_EFFECTS[passenger.event]) playEffect(PASSENGER_EFFECTS[passenger.event]);
  prev.gear = player.gear;
  prev.status = race.status;
  prev.messageTimer = race.messageTimer;
  prev.bankTimer = score.bankTimer;
}

/** Passenger mode step: section changes, task checks, race end. */
function updatePassengerMode(dt, hit, wasRunning) {
  if (!passenger.active) return;
  if (race.sectionIndex !== prev.sectionIndex) {
    sectionChanged(passenger);
    prev.sectionIndex = race.sectionIndex;
  }
  if (race.status === RACE_RUNNING) {
    const info = track.sections[race.sectionIndex];
    passengerEnv.hit = hit !== HIT_NONE;
    passengerEnv.crashed = hit === HIT_CRASH;
    passengerEnv.overtakes = countOvertakes(traffic, player, track.length);
    passengerEnv.section = info.section;
    passengerEnv.stage = race.stage;
    updatePassenger(passenger, passengerEnv, dt);
  } else if (wasRunning) {
    finishTask(passenger);
    if (race.status === RACE_FINISHED) awardPassenger(score, passenger.hearts);
  }
}

function updateWorld(dt) {
  const wasRunning = race.status === RACE_RUNNING;
  let stepHit = HIT_NONE;
  updateParallax(findSegment(track, player.z), dt);
  updatePlayer(player, controls, track, dt, rng);
  if (!testMode) {
    updateRace(race, track, env, player, dt);
    if (race.appendedFrom >= 0) prepareTrackColors(track, race.appendedFrom);
    manageTraffic(traffic, track, player, rng);
  }
  updateTraffic(traffic, track, player, dt, rng);
  if (!god) {
    const a = collidePlayerSprites(player, track);
    const b = collidePlayerVehicles(player, traffic, track.length);
    const hit = a > b ? a : b;
    if (hit !== HIT_NONE) {
      lastHit = hit;
      stepHit = hit;
      endDrift(player, DRIFT_END_FAIL);
    }
  }
  updateScore(score, player, dt);
  if (!testMode && wasRunning && race.status === RACE_FINISHED) awardGoal(score, race.time);
  updateParticles(fx, player, dt, rng);
  if (!testMode) updatePassengerMode(dt, stepHit, wasRunning);
  if (demo) return;
  playEvents(stepHit);
  updateCarSounds(player, controls.throttle);
}

/** Leaves the race for the result screen once the post-race delay is over. */
function checkRaceOver() {
  if (testMode || demo || !raceOver(race)) return;
  setState(race.status === RACE_FINISHED ? 'goal' : 'gameOver', { race, score, passenger });
}

export const raceState = {
  /**
   * @param {{track?:object, env?:object, startId?:string, rng?:object, god?:boolean, passenger?:boolean,
   *   demo?:boolean, resume?:boolean}} params
   *   test mode: pass a prebuilt looping `track`; route mode: pass `env` and `startId`;
   *   demo: attract-mode autopilot (no sound, no result screens); resume: back from pause, nothing resets
   */
  enter(params) {
    if (params.resume) return;
    rng = params.rng;
    demo = !!params.demo;
    god = !!params.god || demo;
    autopilot.sectionIndex = -1;
    testMode = !!params.track;
    env = params.env || null;
    track = testMode ? params.track : createTrack();
    if (!testMode) startRace(race, track, env, params.startId, god);
    prepareTrackColors(track);
    resetPlayer(player, 0);
    player.x = track.sections[0].baseX;
    player.prevX = player.x;
    for (let i = 0; i < bgOffsets.length; i++) bgOffsets[i] = 0;
    const reach = testMode ? Infinity : CONFIG.traffic.spawnAhead * CONFIG.road.segmentLength;
    spawnTraffic(traffic, track, rng, player.z, reach);
    lastHit = HIT_NONE;
    resetScore(score);
    for (const p of fx.list) p.active = false;
    prev.gear = player.gear;
    prev.status = race.status;
    prev.messageTimer = 0;
    prev.secs = Math.ceil(race.time);
    prev.bankTimer = 0;
    prev.sectionIndex = 0;
    passenger.active = false;
    passengerEnv.rng = rng;
    if (params.passenger && !testMode && !demo) startPassenger(passenger);
    radioTimer = 0;
    if (demo) return;
    radioOn();
    playEffect('start');
  },

  exit() {
    updateCarSounds(null, 0);
  },

  update(dt, input) {
    lastInput = input;
    if (!demo && input.wasPressed('pause')) {
      setState('pause', {});
      return;
    }
    if (!demo && input.wasPressed('radioNext')) {
      radioName = radioNext();
      radioTimer = CONFIG.audio.radioMessageTime;
    }
    if (radioTimer > 0) radioTimer -= dt;
    readControls(input);
    updateWorld(dt);
    checkRaceOver();
  },

  /** @returns {boolean} true when the demo race has ended (attract mode restarts it) */
  demoOver() {
    return raceOver(race);
  },

  render(ctx, alpha) {
    interpolatePlayer(player, alpha, track.length, view);
    const seg = findSegment(track, view.z);
    view.z = track.loop ? wrap(view.z - PLAYER_Z_OFFSET, track.length) : Math.max(0, view.z - PLAYER_Z_OFFSET);
    renderSky(ctx, seg.themeFrom, seg.theme, quantizeBlend(seg.blend), bgOffsets);
    renderRoad(ctx, track, view);
    const drawn = drawRoadsideSprites(ctx, track, roadStats.baseIndex, roadStats.processed, alpha);
    spritesDrawn = drawn.drawn;
    carsDrawn = drawn.cars;
    drawParticles(ctx, fx, blendPalette(seg.themeFrom, seg.theme, seg.blend));
    drawPlayerCar(ctx, player);
    drawHud(ctx, player);
    if (!testMode && !demo) {
      const info = track.sections[race.sectionIndex];
      drawRaceHud(ctx, race, score, player, info.section.name, sectionProgress(race, track, player));
      drawPassengerHud(ctx, passenger);
    }
    if (radioTimer > 0) drawRadioName(ctx, radioName);
  },

  /** @returns {{player:object, race:object, track:object, traffic:object, score:object, fx:object}} live objects (tests, debug) */
  inspect() {
    return { player, race, track, traffic, score, fx, passenger };
  },

  /**
   * @param {string[]} out
   * @param {number} start
   * @returns {number} lines written
   */
  debugLines(out, start) {
    const seg = findSegment(track, player.z);
    const kmh = player.speed * CONFIG.hud.kmhPerUnit;
    const pad = lastInput ? lastInput.pad : null;
    const themeName = THEMES[seg.theme].name;
    out[start] = `SEG ${seg.index}/${track.segments.length} DRAWN ${roadStats.drawn}/${roadQuality.drawDistance} SPR ${spritesDrawn} CARS ${carsDrawn}/${activeCount(traffic)}`;
    out[start + 1] = `Z ${player.z.toFixed(0)} X ${player.x.toFixed(2)}${player.offRoad ? ' OFFROAD' : ''}${seg.alt ? ' FORK' : ''}`;
    out[start + 2] = `SPD ${player.speed.toFixed(0)} ${kmh.toFixed(0)}KMH ${player.gear} ${player.rpm.toFixed(0)}RPM`;
    out[start + 3] = `CURVE ${seg.curve.toFixed(2)} Y ${seg.p1.world.y.toFixed(0)} STEER ${controls.steer.toFixed(2)}`;
    out[start + 4] = seg.blend < 1 ? `THEME ${themeName} ${(seg.blend * 100).toFixed(0)}%` : `THEME ${themeName}`;
    out[start + 5] = pad && pad.connected ? `PAD ${pad.id.slice(0, 40)}` : 'PAD NONE';
    const crash = player.crash === CRASH_NONE ? (player.grace > 0 ? 'GRACE' : 'OK')
      : player.crash === CRASH_TUMBLE ? 'TUMBLE' : 'RECOVER';
    out[start + 6] = `CAR ${crash} LAST HIT ${HIT_NAMES[lastHit]}${god ? ' GOD' : ''}`;
    out[start + 7] = testMode ? 'TEST LOOP' : `ROUTE ${race.route.join('-')} T ${race.time.toFixed(1)} E ${race.elapsed.toFixed(1)}`;
    const radio = radioStatus();
    const a = audioState();
    out[start + 10] = passenger.active
      ? `PASSENGER ${passenger.hearts}/5 ${passenger.key || '-'} ${passenger.value.toFixed(1)}/${passenger.target || passenger.limit} ${passenger.running ? 'RUN' : 'IDLE'}`
      : 'PASSENGER OFF';
    out[start + 9] = `AUDIO ${a.ctx ? a.ctx.state.toUpperCase() : a.failed ? 'FAILED' : 'LOCKED'}${a.muted ? ' MUTED' : ''} ${radio.name} ${radio.step}`;
    out[start + 8] = player.drift
      ? `DRIFT ${player.driftDir > 0 ? 'R' : 'L'} ANG ${player.driftAngle.toFixed(2)} T ${player.driftTime.toFixed(1)} FX ${fx.alive}`
      : `DRIFT OFF X${score.multiplier} COMBO ${score.comboTimer.toFixed(1)} FX ${fx.alive}`;
    return 11;
  },
};
