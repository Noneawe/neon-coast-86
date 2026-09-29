// Song sequencer with lookahead scheduling on the audio clock: each call
// schedules every step that starts before now + lookahead. Pure logic —
// the actual sound is produced by the `schedule` callback.

import { CONFIG } from '../config.js';
import { noteFrequency } from './synth.js';

/** Steps in one song pattern. */
export const PATTERN_STEPS = 64;

/**
 * Parses a track string into events. Tokens: NOTE[:steps], x[:steps] (drum hit), .[:steps] (rest).
 * @param {string} text
 * @returns {{events:{step:number, steps:number, freq:number}[], length:number}} freq 0 = drum hit
 */
export function parseTrack(text) {
  const events = [];
  let step = 0;
  for (const token of text.trim().split(/\s+/)) {
    const [what, n] = token.split(':');
    const steps = n === undefined ? 1 : Number(n);
    if (!Number.isInteger(steps) || steps < 1) throw new Error(`bad length in '${token}'`);
    if (what === 'x') events.push({ step, steps, freq: 0 });
    else if (what !== '.') {
      const freq = noteFrequency(what);
      if (Number.isNaN(freq)) throw new Error(`bad note '${token}'`);
      events.push({ step, steps, freq });
    }
    step += steps;
  }
  return { events, length: step };
}

/** Instrument key for a track name (pad1 → pad). */
export function trackInstrument(track) {
  return track.replace(/\d+$/, '');
}

/**
 * Pre-computes per-step event lists for every pattern of a song.
 * @param {{bpm:number, patterns:Object<string,Object<string,string>>, order:string[]}} song
 * @returns {{stepDur:number, order:string[], steps:Object<string, {inst:string, freq:number, steps:number}[][]>}}
 */
export function compileSong(song) {
  const steps = {};
  for (const [name, tracks] of Object.entries(song.patterns)) {
    const table = [];
    for (let i = 0; i < PATTERN_STEPS; i++) table.push([]);
    for (const [track, text] of Object.entries(tracks)) {
      const { events, length } = parseTrack(text);
      if (length !== PATTERN_STEPS) throw new Error(`${song.name}/${name}/${track}: ${length} steps`);
      for (const e of events) table[e.step].push({ inst: trackInstrument(track), freq: e.freq, steps: e.steps });
    }
    steps[name] = table;
  }
  return { stepDur: 60 / song.bpm / CONFIG.audio.stepsPerBeat, order: song.order.slice(), steps };
}

/** @returns {{song:object|null, orderIndex:number, step:number, nextTime:number}} */
export function createSequencer() {
  return { song: null, orderIndex: 0, step: 0, nextTime: 0 };
}

/**
 * @param {object} seq
 * @param {object} compiled from compileSong
 * @param {number} now audio clock
 */
export function startSong(seq, compiled, now) {
  seq.song = compiled;
  seq.orderIndex = 0;
  seq.step = 0;
  seq.nextTime = now + 0.05;
}

/** @param {object} seq */
export function stopSong(seq) {
  seq.song = null;
}

/**
 * Schedules all steps starting before now + lookahead.
 * @param {object} seq
 * @param {number} now audio clock
 * @param {(ev:{inst:string, freq:number, steps:number}, time:number, length:number)=>void} schedule
 * @returns {number} events scheduled
 */
export function advanceSequencer(seq, now, schedule) {
  const song = seq.song;
  if (!song) return 0;
  const { lookahead, resyncGap } = CONFIG.audio;
  if (seq.nextTime < now - resyncGap) seq.nextTime = now;
  let count = 0;
  while (seq.nextTime < now + lookahead) {
    const events = song.steps[song.order[seq.orderIndex]][seq.step];
    for (let i = 0; i < events.length; i++) {
      schedule(events[i], seq.nextTime, events[i].steps * song.stepDur);
      count++;
    }
    seq.nextTime += song.stepDur;
    seq.step++;
    if (seq.step >= PATTERN_STEPS) {
      seq.step = 0;
      seq.orderIndex = (seq.orderIndex + 1) % song.order.length;
    }
  }
  return count;
}
