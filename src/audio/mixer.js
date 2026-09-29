// Owns the single AudioContext (created lazily on the first user gesture),
// the master gain and the music / sfx / engine channels. Every call is
// guarded: blocked or missing audio never breaks the game.

import { CONFIG } from '../config.js';
import { debugLog } from '../engine/debug.js';

const state = {
  ctx: null,
  master: null,
  channels: { music: null, sfx: null, engine: null },
  noise: null,
  muted: false,
  failed: false,
  ready: [],
};

/** @returns {{ctx:AudioContext|null, channels:object, noise:AudioBuffer|null, muted:boolean, failed:boolean}} */
export function audioState() {
  return state;
}

function createNoise(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Fixed LCG so the noise is identical every run.
  let seed = 12345;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buf;
}

function createGraph(ctx) {
  const v = CONFIG.audio.volume;
  state.master = ctx.createGain();
  state.master.gain.value = state.muted ? 0 : v.master;
  state.master.connect(ctx.destination);
  for (const name of Object.keys(state.channels)) {
    const g = ctx.createGain();
    g.gain.value = v[name];
    g.connect(state.master);
    state.channels[name] = g;
  }
  state.noise = createNoise(ctx);
}

/** Creates (once) and resumes the AudioContext. Safe to call repeatedly. */
export function unlockAudio() {
  if (state.failed) return;
  try {
    if (!state.ctx) {
      const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!Ctor) {
        state.failed = true;
        return;
      }
      state.ctx = new Ctor();
      createGraph(state.ctx);
      for (const fn of state.ready) fn(state);
      debugLog('audio ready', state.ctx.sampleRate);
    }
    if (state.ctx.state === 'suspended') state.ctx.resume().catch(() => {});
  } catch (e) {
    state.failed = true;
    debugLog('audio unavailable', e && e.message);
  }
}

/**
 * Registers the unlock listeners on the first user gesture.
 * @param {{addEventListener:Function}} target usually window
 * @param {boolean} muted start muted (?mute=1)
 */
export function initAudio(target, muted) {
  state.muted = !!muted;
  const unlock = () => unlockAudio();
  for (const type of ['keydown', 'pointerdown', 'touchstart']) target.addEventListener(type, unlock);
}

/**
 * Runs `fn(state)` once the context exists (immediately if it already does).
 * @param {(s:object)=>void} fn
 */
export function onAudioReady(fn) {
  if (state.ctx) fn(state);
  else state.ready.push(fn);
}

/**
 * @param {'music'|'sfx'|'engine'} name
 * @param {number} volume 0..1
 */
export function setChannelVolume(name, volume) {
  const g = state.channels[name];
  if (!g) return;
  try {
    g.gain.setTargetAtTime(volume, state.ctx.currentTime, CONFIG.audio.smoothing);
  } catch (e) { /* ignore */ }
}

/** Pauses audio while the tab is hidden. */
export function suspendAudio() {
  try {
    if (state.ctx && state.ctx.state === 'running') state.ctx.suspend().catch(() => {});
  } catch (e) { /* ignore */ }
}

/** Resumes audio when the tab is visible again (only after a prior unlock). */
export function resumeAudio() {
  try {
    if (state.ctx && state.ctx.state === 'suspended') state.ctx.resume().catch(() => {});
  } catch (e) { /* ignore */ }
}
