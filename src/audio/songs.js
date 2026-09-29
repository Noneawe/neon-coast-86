// The three original radio songs as data: tempo, instrument set, 64-step
// patterns (16th notes, 4 bars) and play order. Track tokens are
// NOTE[:steps] or .[:steps] (rest); drums use x[:steps]. Composed for this game.

export const SONGS = [
  {
    name: 'COASTLINE DRIVE',
    bpm: 126,
    instruments: 'bright',
    patterns: {
      intro: {
        lead: '.:64',
        arp: 'A4:1 C5:1 E5:1 A5:1 A4:1 C5:1 E5:1 A5:1 A4:1 C5:1 E5:1 A5:1 A4:1 C5:1 E5:1 A5:1 F4:1 A4:1 C5:1 F5:1 F4:1 A4:1 C5:1 F5:1 F4:1 A4:1 C5:1 F5:1 F4:1 A4:1 C5:1 F5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 G4:1 B4:1 D5:1 G5:1 G4:1 B4:1 D5:1 G5:1 G4:1 B4:1 D5:1 G5:1 G4:1 B4:1 D5:1 G5:1',
        bass: 'A2:2 A2:2 A3:2 A2:2 A2:2 A2:2 A3:2 A2:2 F2:2 F2:2 F3:2 F2:2 F2:2 F2:2 F3:2 F2:2 C3:2 C3:2 C4:2 C3:2 C3:2 C3:2 C4:2 C3:2 G2:2 G2:2 G3:2 G2:2 G2:2 G2:2 G3:2 G2:2',
        pad1: '.:64',
        pad2: '.:64',
        pad3: '.:64',
        kick: 'x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4',
        snare: '.:4 x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:4',
        hat: '.:2 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:2',
      },
      verse: {
        lead: 'E5:3 D5:1 C5:2 E5:2 A5:4 G5:2 E5:2 F5:3 E5:1 C5:2 A4:2 C5:6 .:2 G5:3 E5:1 C5:2 E5:2 G5:4 A5:2 G5:2 D5:4 B4:2 G4:2 B4:2 D5:6',
        arp: 'A4:1 C5:1 E5:1 A5:1 A4:1 C5:1 E5:1 A5:1 A4:1 C5:1 E5:1 A5:1 A4:1 C5:1 E5:1 A5:1 F4:1 A4:1 C5:1 F5:1 F4:1 A4:1 C5:1 F5:1 F4:1 A4:1 C5:1 F5:1 F4:1 A4:1 C5:1 F5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 G4:1 B4:1 D5:1 G5:1 G4:1 B4:1 D5:1 G5:1 G4:1 B4:1 D5:1 G5:1 G4:1 B4:1 D5:1 G5:1',
        bass: 'A2:2 A2:2 A3:2 A2:2 A2:2 A2:2 A3:2 A2:2 F2:2 F2:2 F3:2 F2:2 F2:2 F2:2 F3:2 F2:2 C3:2 C3:2 C4:2 C3:2 C3:2 C3:2 C4:2 C3:2 G2:2 G2:2 G3:2 G2:2 G2:2 G2:2 G3:2 G2:2',
        pad1: '.:64',
        pad2: '.:64',
        pad3: '.:64',
        kick: 'x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4',
        snare: '.:4 x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:4',
        hat: 'x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2',
      },
      chorus: {
        lead: 'A5:4 G5:2 F5:2 E5:4 C5:4 B4:2 D5:2 G5:4 F5:2 E5:2 D5:4 E5:4 G5:2 B5:2 A5:4 G5:4 A5:10 .:2 E5:2 G5:2',
        arp: 'F5:1 A5:1 C6:1 F6:1 F5:1 A5:1 C6:1 F6:1 F5:1 A5:1 C6:1 F6:1 F5:1 A5:1 C6:1 F6:1 G5:1 B5:1 D6:1 G6:1 G5:1 B5:1 D6:1 G6:1 G5:1 B5:1 D6:1 G6:1 G5:1 B5:1 D6:1 G6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 A5:1 C6:1 E6:1 A6:1 A5:1 C6:1 E6:1 A6:1 A5:1 C6:1 E6:1 A6:1 A5:1 C6:1 E6:1 A6:1',
        bass: 'F2:2 F2:2 F3:2 F2:2 F2:2 F2:2 F3:2 F2:2 G2:2 G2:2 G3:2 G2:2 G2:2 G2:2 G3:2 G2:2 E2:2 E2:2 E3:2 E2:2 E2:2 E2:2 E3:2 E2:2 A2:2 A2:2 A3:2 A2:2 A2:2 A2:2 A3:2 A2:2',
        pad1: 'F3:16 G3:16 E3:16 A3:16',
        pad2: 'A3:16 B3:16 G3:16 C4:16',
        pad3: 'C4:16 D4:16 B3:16 E4:16',
        kick: 'x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4',
        snare: '.:4 x:8 x:2 x:6 x:8 x:2 x:6 x:8 x:2 x:6 x:8 x:2 x:2',
        hat: 'x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x',
      },
      bridge: {
        lead: 'D5:8 F5:8 E5:8 G5:8 A5:8 C6:8 B5:8 D6:4 B5:4',
        arp: '.:64',
        bass: 'D3:2 D3:2 D4:2 D3:2 D3:2 D3:2 D4:2 D3:2 E2:2 E2:2 E3:2 E2:2 E2:2 E2:2 E3:2 E2:2 F2:2 F2:2 F3:2 F2:2 F2:2 F2:2 F3:2 F2:2 G2:2 G2:2 G3:2 G2:2 G2:2 G2:2 G3:2 G2:2',
        pad1: 'D3:16 E3:16 F3:16 G3:16',
        pad2: 'F3:16 G3:16 A3:16 B3:16',
        pad3: 'A3:16 B3:16 C4:16 D4:16',
        kick: 'x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:8',
        snare: '.:8 x:16 x:16 x:16 x:8',
        hat: '.:2 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:2',
      },
    },
    order: ['intro', 'verse', 'verse', 'chorus', 'chorus', 'bridge', 'verse', 'chorus'],
  },
  {
    name: 'NEON MIRAGE',
    bpm: 112,
    instruments: 'warm',
    patterns: {
      intro: {
        lead: '.:64',
        arp: 'E4:1 G4:1 B4:1 E5:1 E4:1 G4:1 B4:1 E5:1 E4:1 G4:1 B4:1 E5:1 E4:1 G4:1 B4:1 E5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 C4:1 E4:1 G4:1 C5:1 D4:1 F#4:1 A4:1 D5:1 D4:1 F#4:1 A4:1 D5:1 D4:1 F#4:1 A4:1 D5:1 D4:1 F#4:1 A4:1 D5:1 B4:1 D5:1 F#5:1 B5:1 B4:1 D5:1 F#5:1 B5:1 B4:1 D5:1 F#5:1 B5:1 B4:1 D5:1 F#5:1 B5:1',
        bass: 'E2:3 E2:1 .:2 B2:2 E2:2 .:2 E3:2 E2:2 C3:3 C3:1 .:2 G3:2 C3:2 .:2 C4:2 C3:2 D3:3 D3:1 .:2 A3:2 D3:2 .:2 D4:2 D3:2 B2:3 B2:1 .:2 F#3:2 B2:2 .:2 B3:2 B2:2',
        pad1: 'E3:16 C3:16 D3:16 B3:16',
        pad2: 'G3:16 E3:16 F#3:16 D4:16',
        pad3: 'B3:16 G3:16 A3:16 F#4:16',
        kick: 'x:6 x:4 x:6 x:6 x:4 x:6 x:6 x:4 x:6 x:6 x:4 x:6',
        snare: '.:4 x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:4',
        hat: 'x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x',
      },
      verse: {
        lead: 'B4:2 .:1 E5:1 .:2 G5:2 F#5:2 E5:2 D5:2 E5:2 .:2 C5:1 E5:1 G5:4 E5:2 C5:2 E5:4 F#5:2 .:1 A5:1 .:2 D6:2 B5:2 A5:2 F#5:2 A5:2 B5:6 A5:2 F#5:4 D5:4',
        arp: '.:64',
        bass: 'E2:3 E2:1 .:2 B2:2 E2:2 .:2 E3:2 E2:2 C3:3 C3:1 .:2 G3:2 C3:2 .:2 C4:2 C3:2 D3:3 D3:1 .:2 A3:2 D3:2 .:2 D4:2 D3:2 B2:3 B2:1 .:2 F#3:2 B2:2 .:2 B3:2 B2:2',
        pad1: 'E3:16 C3:16 D3:16 B3:16',
        pad2: 'G3:16 E3:16 F#3:16 D4:16',
        pad3: 'B3:16 G3:16 A3:16 F#4:16',
        kick: 'x:6 x:4 x:6 x:6 x:4 x:6 x:6 x:4 x:6 x:6 x:4 x:6',
        snare: '.:4 x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:4',
        hat: 'x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x x:2 x x',
      },
      chorus: {
        lead: 'G5:4 E5:4 C6:4 B5:2 A5:2 A5:4 F#5:4 D6:6 .:2 E5:2 G5:2 B5:2 E6:6 D6:2 B5:2 G5:8 E5:8',
        arp: 'C5:1 E5:1 G5:1 C6:1 C5:1 E5:1 G5:1 C6:1 C5:1 E5:1 G5:1 C6:1 C5:1 E5:1 G5:1 C6:1 D5:1 F#5:1 A5:1 D6:1 D5:1 F#5:1 A5:1 D6:1 D5:1 F#5:1 A5:1 D6:1 D5:1 F#5:1 A5:1 D6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1 E5:1 G5:1 B5:1 E6:1',
        bass: 'C3:3 C3:1 .:2 G3:2 C3:2 .:2 C4:2 C3:2 D3:3 D3:1 .:2 A3:2 D3:2 .:2 D4:2 D3:2 E2:3 E2:1 .:2 B2:2 E2:2 .:2 E3:2 E2:2 E2:3 E2:1 .:2 B2:2 E2:2 .:2 E3:2 E2:2',
        pad1: 'C3:16 D3:16 E3:16 E3:16',
        pad2: 'E3:16 F#3:16 G3:16 G3:16',
        pad3: 'G3:16 A3:16 B3:16 B3:16',
        kick: 'x:6 x:2 x:2 x:6 x:6 x:2 x:2 x:6 x:6 x:2 x:2 x:6 x:6 x:2 x:2 x:6',
        snare: '.:4 x:8 x:3 x:5 x:8 x:3 x:5 x:8 x:3 x:5 x:8 x:3 x',
        hat: 'x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x',
      },
    },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'intro'],
  },
  {
    name: 'MIDNIGHT PINES',
    bpm: 96,
    instruments: 'soft',
    patterns: {
      intro: {
        lead: '.:64',
        arp: 'D4:2 A4:2 F#4:2 A4:2 D5:2 A4:2 F#4:2 A4:2 A4:2 E5:2 C#5:2 E5:2 A5:2 E5:2 C#5:2 E5:2 B4:2 F#5:2 D5:2 F#5:2 B5:2 F#5:2 D5:2 F#5:2 G4:2 D5:2 B4:2 D5:2 G5:2 D5:2 B4:2 D5:2',
        bass: 'D3:6 D3:2 A3:4 D3:4 A2:6 A2:2 E3:4 A2:4 B2:6 B2:2 F#3:4 B2:4 G2:6 G2:2 D3:4 G2:4',
        pad1: 'D3:16 A3:16 B3:16 G3:16',
        pad2: 'F#3:16 C#4:16 D4:16 B3:16',
        pad3: 'A3:16 E4:16 F#4:16 D4:16',
        kick: 'x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:8',
        snare: '.:64',
        hat: '.:2 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:2',
      },
      verse: {
        lead: 'F#5:6 E5:2 D5:4 A4:4 C#5:6 D5:2 E5:8 D5:4 F#5:4 B5:6 A5:2 G5:8 F#5:4 E5:4',
        arp: 'D4:2 A4:2 F#4:2 A4:2 D5:2 A4:2 F#4:2 A4:2 A4:2 E5:2 C#5:2 E5:2 A5:2 E5:2 C#5:2 E5:2 B4:2 F#5:2 D5:2 F#5:2 B5:2 F#5:2 D5:2 F#5:2 G4:2 D5:2 B4:2 D5:2 G5:2 D5:2 B4:2 D5:2',
        bass: 'D3:6 D3:2 A3:4 D3:4 A2:6 A2:2 E3:4 A2:4 B2:6 B2:2 F#3:4 B2:4 G2:6 G2:2 D3:4 G2:4',
        pad1: 'D3:16 A3:16 B3:16 G3:16',
        pad2: 'F#3:16 C#4:16 D4:16 B3:16',
        pad3: 'A3:16 E4:16 F#4:16 D4:16',
        kick: 'x:8 x:8 x:8 x:8 x:8 x:8 x:8 x:8',
        snare: '.:8 x:16 x:16 x:16 x:8',
        hat: '.:2 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:4 x:2',
      },
      chorus: {
        lead: 'B5:4 A5:4 G5:4 D5:4 E5:4 A5:8 C#6:4 C#6:6 B5:2 A5:4 F#5:4 B5:12 .:4',
        arp: 'G5:2 D6:2 B5:2 D6:2 G6:2 D6:2 B5:2 D6:2 A5:2 E6:2 C#6:2 E6:2 A6:2 E6:2 C#6:2 E6:2 F#5:2 C#6:2 A5:2 C#6:2 F#6:2 C#6:2 A5:2 C#6:2 B5:2 F#6:2 D6:2 F#6:2 B6:2 F#6:2 D6:2 F#6:2',
        bass: 'G2:6 G2:2 D3:4 G2:4 A2:6 A2:2 E3:4 A2:4 F#2:6 F#2:2 C#3:4 F#2:4 B2:6 B2:2 F#3:4 B2:4',
        pad1: 'G3:16 A3:16 F#3:16 B3:16',
        pad2: 'B3:16 C#4:16 A3:16 D4:16',
        pad3: 'D4:16 E4:16 C#4:16 F#4:16',
        kick: 'x:6 x:2 x:8 x:6 x:2 x:8 x:6 x:2 x:8 x:6 x:2 x:8',
        snare: '.:8 x:16 x:16 x:16 x:8',
        hat: 'x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2',
      },
    },
    order: ['intro', 'verse', 'verse', 'chorus', 'verse', 'chorus', 'chorus', 'intro'],
  },
];

/*
 * Instrument format (see audio/synth.js):
 *   wave     'square' | 'sawtooth' | 'triangle' | 'sine' | 'noise'
 *   gain     peak level; attack / decay / release in seconds; sustain 0..1
 *   detune   cents of a second detuned oscillator (thicker sound), optional
 *   filter   { type, freq, q } biquad filter, optional
 *   freq     fixed pitch in Hz (drums); pitchTo / pitchTime: pitch drop target and time
 * Track names map to instruments by dropping trailing digits (pad1 → pad).
 */
export const INSTRUMENT_SETS = {
  bright: {
    lead: { wave: 'sawtooth', detune: 7, gain: 0.08, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.12, filter: { type: 'lowpass', freq: 3200, q: 1 } },
    arp: { wave: 'square', gain: 0.04, attack: 0.002, decay: 0.08, sustain: 0.2, release: 0.05, filter: { type: 'lowpass', freq: 2400, q: 1 } },
    bass: { wave: 'square', gain: 0.11, attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.05, filter: { type: 'lowpass', freq: 700, q: 2 } },
    pad: { wave: 'triangle', gain: 0.035, attack: 0.3, decay: 0.5, sustain: 0.8, release: 0.4 },
    kick: { wave: 'sine', freq: 150, pitchTo: 45, pitchTime: 0.12, gain: 0.5, attack: 0.001, decay: 0.25, sustain: 0, release: 0.05 },
    snare: { wave: 'noise', gain: 0.16, attack: 0.001, decay: 0.14, sustain: 0, release: 0.03, filter: { type: 'bandpass', freq: 1800, q: 0.8 } },
    hat: { wave: 'noise', gain: 0.05, attack: 0.001, decay: 0.04, sustain: 0, release: 0.02, filter: { type: 'highpass', freq: 7000, q: 0.7 } },
  },
  warm: {
    lead: { wave: 'square', detune: 5, gain: 0.06, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.15, filter: { type: 'lowpass', freq: 2400, q: 2 } },
    arp: { wave: 'triangle', gain: 0.06, attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.08 },
    bass: { wave: 'sawtooth', gain: 0.1, attack: 0.005, decay: 0.12, sustain: 0.6, release: 0.06, filter: { type: 'lowpass', freq: 600, q: 4 } },
    pad: { wave: 'sawtooth', gain: 0.022, attack: 0.4, decay: 0.6, sustain: 0.8, release: 0.5, filter: { type: 'lowpass', freq: 1200, q: 1 } },
    kick: { wave: 'sine', freq: 130, pitchTo: 40, pitchTime: 0.14, gain: 0.5, attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 },
    snare: { wave: 'noise', gain: 0.14, attack: 0.001, decay: 0.16, sustain: 0, release: 0.03, filter: { type: 'bandpass', freq: 1500, q: 0.7 } },
    hat: { wave: 'noise', gain: 0.04, attack: 0.001, decay: 0.03, sustain: 0, release: 0.02, filter: { type: 'highpass', freq: 8000, q: 0.7 } },
  },
  soft: {
    lead: { wave: 'triangle', detune: 4, gain: 0.1, attack: 0.03, decay: 0.3, sustain: 0.7, release: 0.3 },
    arp: { wave: 'sine', gain: 0.05, attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.15 },
    bass: { wave: 'triangle', gain: 0.16, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.1 },
    pad: { wave: 'sawtooth', gain: 0.02, attack: 0.8, decay: 0.8, sustain: 0.8, release: 0.8, filter: { type: 'lowpass', freq: 900, q: 1 } },
    kick: { wave: 'sine', freq: 120, pitchTo: 40, pitchTime: 0.15, gain: 0.4, attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 },
    snare: { wave: 'noise', gain: 0.1, attack: 0.001, decay: 0.2, sustain: 0, release: 0.05, filter: { type: 'bandpass', freq: 1200, q: 0.6 } },
    hat: { wave: 'noise', gain: 0.03, attack: 0.001, decay: 0.05, sustain: 0, release: 0.02, filter: { type: 'highpass', freq: 6500, q: 0.7 } },
  },
};
