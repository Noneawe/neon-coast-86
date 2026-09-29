// Instruments: oscillators or noise through an optional filter and an ADSR
// gain envelope, with an optional pitch drop for drums. Each note builds its
// nodes once and disconnects them when it ends.

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/**
 * Frequency of a note name like 'A4' or 'C#5' (A4 = 440 Hz). NaN if invalid.
 * @param {string} name
 * @returns {number}
 */
export function noteFrequency(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m || NOTE_INDEX[m[1]] === undefined) return NaN;
  const midi = NOTE_INDEX[m[1]] + 12 * (Number(m[2]) + 1);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Seconds a note of `inst` sounds before its release starts.
 * @param {{sustain:number, attack:number, decay:number}} inst
 * @param {number} length nominal length in seconds
 * @returns {number}
 */
export function noteHold(inst, length) {
  return inst.sustain === 0 ? inst.attack + inst.decay : Math.max(inst.attack, length * 0.95);
}

function makeSource(ctx, inst, freq, time, noise, detune) {
  if (inst.wave === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    return src;
  }
  const osc = ctx.createOscillator();
  osc.type = inst.wave;
  const f = inst.freq || freq;
  osc.frequency.setValueAtTime(f, time);
  if (inst.pitchTo) osc.frequency.exponentialRampToValueAtTime(inst.pitchTo, time + inst.pitchTime);
  if (detune) osc.detune.setValueAtTime(detune, time);
  return osc;
}

/**
 * Schedules one note. Returns the number of nodes created (0 on failure).
 * @param {AudioContext} ctx
 * @param {AudioNode} dest channel node
 * @param {object} inst instrument definition (see songs.js)
 * @param {number} freq Hz (ignored when the instrument has a fixed freq)
 * @param {number} time start time (audioCtx clock)
 * @param {number} length nominal length (s)
 * @param {AudioBuffer} noise shared noise buffer
 * @returns {number}
 */
export function playNote(ctx, dest, inst, freq, time, length, noise) {
  try {
    const env = ctx.createGain();
    const hold = noteHold(inst, length);
    const end = time + hold + inst.release * 4;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(inst.gain, time + inst.attack);
    env.gain.setTargetAtTime(inst.gain * inst.sustain, time + inst.attack, Math.max(0.001, inst.decay / 3));
    env.gain.setTargetAtTime(0, time + hold, Math.max(0.001, inst.release / 3));
    let out = env;
    const nodes = [env];
    if (inst.filter) {
      const f = ctx.createBiquadFilter();
      f.type = inst.filter.type;
      f.frequency.setValueAtTime(inst.filter.freq, time);
      f.Q.setValueAtTime(inst.filter.q, time);
      f.connect(env);
      out = f;
      nodes.push(f);
    }
    const sources = [makeSource(ctx, inst, freq, time, noise, 0)];
    if (inst.detune) sources.push(makeSource(ctx, inst, freq, time, noise, inst.detune));
    env.connect(dest);
    for (const s of sources) {
      s.connect(out);
      s.start(time);
      s.stop(end);
    }
    sources[0].onended = () => {
      for (const s of sources) s.disconnect();
      for (const n of nodes) n.disconnect();
    };
    return nodes.length + sources.length;
  } catch (e) {
    return 0;
  }
}
