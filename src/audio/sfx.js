// Sound effects and continuous car sounds. One-shot effects are data (notes
// of SFX_INSTRUMENTS); the engine, tyre screech and gravel rumble are
// persistent nodes steered with setTargetAtTime. Also runs the radio (songs).

import { CONFIG } from '../config.js';
import { SONGS, INSTRUMENT_SETS } from './songs.js';
import { audioState, onAudioReady } from './mixer.js';
import { playNote, noteFrequency } from './synth.js';
import { compileSong, createSequencer, startSong, stopSong, advanceSequencer } from './sequencer.js';

/** Instruments used by one-shot effects (same format as song instruments). */
export const SFX_INSTRUMENTS = {
  blip: { wave: 'square', gain: 0.25, attack: 0.002, decay: 0.08, sustain: 0.5, release: 0.05 },
  chime: { wave: 'triangle', gain: 0.35, attack: 0.002, decay: 0.2, sustain: 0.4, release: 0.2 },
  buzz: { wave: 'sawtooth', gain: 0.2, attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.1, filter: { type: 'lowpass', freq: 1200, q: 1 } },
  thud: { wave: 'sine', freq: 110, pitchTo: 35, pitchTime: 0.15, gain: 0.8, attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 },
  crunch: { wave: 'noise', gain: 0.6, attack: 0.001, decay: 0.45, sustain: 0, release: 0.1, filter: { type: 'lowpass', freq: 1400, q: 0.7 } },
  scrape: { wave: 'noise', gain: 0.35, attack: 0.005, decay: 0.2, sustain: 0, release: 0.05, filter: { type: 'bandpass', freq: 3000, q: 2 } },
  click: { wave: 'noise', gain: 0.3, attack: 0.001, decay: 0.03, sustain: 0, release: 0.01, filter: { type: 'highpass', freq: 2000, q: 0.7 } },
  hiss: { wave: 'noise', gain: 0.15, attack: 0.01, decay: 0.3, sustain: 0, release: 0.05, filter: { type: 'bandpass', freq: 5000, q: 0.5 } },
};

/*
 * Effect list (AGENTS.md §10): each entry is [instrument, note or '-', start s, length s].
 * '-' = noise / fixed-pitch instruments.
 */
export const EFFECTS = {
  start: [['blip', 'A5', 0, 0.12], ['blip', 'A6', 0.15, 0.25]],
  shift: [['click', '-', 0, 0.03], ['blip', 'E4', 0, 0.04]],
  bump: [['thud', '-', 0, 0.2], ['click', '-', 0, 0.03]],
  side: [['scrape', '-', 0, 0.25]],
  crash: [['crunch', '-', 0, 0.5], ['thud', '-', 0, 0.2], ['thud', '-', 0.25, 0.2], ['crunch', '-', 0.3, 0.4]],
  checkpoint: [['chime', 'C6', 0, 0.1], ['chime', 'E6', 0.08, 0.1], ['chime', 'G6', 0.16, 0.1], ['chime', 'C7', 0.24, 0.3]],
  timeWarn: [['blip', 'B5', 0, 0.08]],
  timeUp: [['buzz', 'E4', 0, 0.3], ['buzz', 'C4', 0.3, 0.3], ['buzz', 'A3', 0.6, 0.6]],
  goal: [['chime', 'G5', 0, 0.15], ['chime', 'C6', 0.15, 0.15], ['chime', 'E6', 0.3, 0.15], ['chime', 'G6', 0.45, 0.2],
    ['chime', 'E6', 0.7, 0.12], ['chime', 'G6', 0.85, 0.6]],
  driftBank: [['blip', 'E5', 0, 0.06], ['blip', 'B5', 0.06, 0.1]],
  driftLost: [['blip', 'D4', 0, 0.08], ['blip', 'A3', 0.08, 0.15]],
  radio: [['hiss', '-', 0, 0.3]],
  taskStart: [['chime', 'E6', 0, 0.08], ['chime', 'A6', 0.1, 0.12]],
  taskWin: [['chime', 'C6', 0, 0.08], ['chime', 'G6', 0.08, 0.08], ['chime', 'C7', 0.16, 0.25]],
  taskLose: [['buzz', 'D4', 0, 0.15], ['buzz', 'C#4', 0.15, 0.3]],
};

/** Continuous sounds: the engine is always a pair of oscillators, skid and gravel are noise. */
const loops = { engine: null, engineOsc: [], engineFilter: null, skid: null, gravel: null };
const seq = createSequencer();
const compiled = SONGS.map(compileSong);
const radio = { index: 0, on: false };

/**
 * Engine sound parameters for an rpm fraction and throttle (pure).
 * @param {number} rpm 0..1 of the rev range
 * @param {number} throttle 0..1
 * @returns {{freq:number, gain:number, cutoff:number}}
 */
export function engineParams(rpm, throttle) {
  const e = CONFIG.audio.engine;
  const r = rpm < 0 ? 0 : rpm > 1 ? 1 : rpm;
  return {
    freq: e.baseFreq + (e.maxFreq - e.baseFreq) * r,
    gain: e.idleGain + e.throttleGain * throttle,
    cutoff: e.filterIdle + (e.filterMax - e.filterIdle) * r * (0.5 + 0.5 * throttle),
  };
}

function noiseLoop(ctx, s, type, freq, q) {
  const src = ctx.createBufferSource();
  src.buffer = s.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(f);
  f.connect(g);
  g.connect(s.channels.sfx);
  src.start();
  return g;
}

function buildLoops(s) {
  try {
    const ctx = s.ctx;
    loops.engine = ctx.createGain();
    loops.engine.gain.value = 0;
    loops.engineFilter = ctx.createBiquadFilter();
    loops.engineFilter.type = 'lowpass';
    loops.engineFilter.frequency.value = CONFIG.audio.engine.filterIdle;
    loops.engineFilter.connect(loops.engine);
    loops.engine.connect(s.channels.engine);
    for (const [type, mul] of [['sawtooth', 1], ['square', 0.5]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = CONFIG.audio.engine.baseFreq * mul;
      o.connect(loops.engineFilter);
      o.start();
      loops.engineOsc.push({ osc: o, mul });
    }
    loops.skid = noiseLoop(ctx, s, 'bandpass', 2600, 4);
    loops.gravel = noiseLoop(ctx, s, 'lowpass', 350, 1);
  } catch (e) {
    loops.engine = null;
  }
}

onAudioReady(buildLoops);

/**
 * Plays a one-shot effect by name. Silently does nothing without audio.
 * @param {string} name key of EFFECTS
 */
export function playEffect(name) {
  const s = audioState();
  const fx = EFFECTS[name];
  if (!s.ctx || !fx) return;
  const t0 = s.ctx.currentTime;
  for (let i = 0; i < fx.length; i++) {
    const [inst, note, at, len] = fx[i];
    const freq = note === '-' ? 0 : noteFrequency(note);
    playNote(s.ctx, s.channels.sfx, SFX_INSTRUMENTS[inst], freq, t0 + at, len, s.noise);
  }
}

function target(param, value, now) {
  param.setTargetAtTime(value, now, CONFIG.audio.smoothing);
}

/**
 * Steers the continuous car sounds (call once per frame).
 * @param {{rpm:number, drift:boolean, driftAngle:number, offRoad:boolean, speed:number}|null} p
 *   player, or null to silence the car (menus, result screens)
 * @param {number} throttle 0..1
 */
export function updateCarSounds(p, throttle) {
  const s = audioState();
  if (!s.ctx || !loops.engine) return;
  try {
    const now = s.ctx.currentTime;
    if (!p) {
      target(loops.engine.gain, 0, now);
      target(loops.skid.gain, 0, now);
      target(loops.gravel.gain, 0, now);
      return;
    }
    const c = CONFIG.player;
    const e = engineParams((p.rpm - c.rpmIdle) / (c.rpmMax - c.rpmIdle), throttle);
    for (let i = 0; i < loops.engineOsc.length; i++) target(loops.engineOsc[i].osc.frequency, e.freq * loops.engineOsc[i].mul, now);
    target(loops.engineFilter.frequency, e.cutoff, now);
    target(loops.engine.gain, e.gain, now);
    target(loops.skid.gain, p.drift ? CONFIG.audio.skidGain * p.driftAngle : 0, now);
    target(loops.gravel.gain, p.offRoad ? CONFIG.audio.offRoadGain * (p.speed / c.maxSpeed) : 0, now);
  } catch (e) { /* ignore */ }
}

function scheduleNote(ev, time, length) {
  const s = audioState();
  const set = INSTRUMENT_SETS[SONGS[radio.index].instruments];
  playNote(s.ctx, s.channels.music, set[ev.inst], ev.freq, time, length, s.noise);
}

/** Feeds the music sequencer; call once per frame. */
export function tickAudio() {
  const s = audioState();
  if (!s.ctx || s.ctx.state !== 'running') return;
  if (radio.on && !seq.song) startSong(seq, compiled[radio.index], s.ctx.currentTime);
  advanceSequencer(seq, s.ctx.currentTime, scheduleNote);
}

/** Turns the radio on (starts the current song when audio is ready). */
export function radioOn() {
  radio.on = true;
}

/** Stops the music. */
export function radioOff() {
  radio.on = false;
  stopSong(seq);
}

/**
 * Switches to the next song.
 * @returns {string} name of the new song
 */
export function radioNext() {
  radio.index = (radio.index + 1) % SONGS.length;
  stopSong(seq);
  playEffect('radio');
  return SONGS[radio.index].name;
}

/**
 * Selects a song by index (menu); restarts playback if the radio is on.
 * @param {number} index
 * @returns {string} song name
 */
export function radioSelect(index) {
  radio.index = ((index % SONGS.length) + SONGS.length) % SONGS.length;
  stopSong(seq);
  return SONGS[radio.index].name;
}

/** @returns {string[]} song names in radio order */
export function songNames() {
  return SONGS.map((s) => s.name);
}

/** @returns {{index:number, on:boolean, name:string, step:number}} radio status for the debug overlay */
export function radioStatus() {
  return { index: radio.index, on: radio.on, name: SONGS[radio.index].name, step: seq.step };
}
