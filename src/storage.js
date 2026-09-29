// Persistent data: highscores and settings in localStorage, with every
// access guarded. When storage is blocked (private mode, some file://
// setups) the game keeps working with an in-memory copy.

import { CONFIG } from './config.js';
import { normalizeBindings, DEFAULT_KEYS } from './engine/input.js';

const KEY = 'neonCoast86';
const VERSION = 1;

function defaultVolume(name) {
  return Math.round(CONFIG.audio.volume[name] * CONFIG.menu.volumeSteps);
}

/** @returns {object} fresh default save data */
export function defaultData() {
  return {
    version: VERSION,
    highscores: [],
    settings: {
      music: defaultVolume('music'),
      sfx: defaultVolume('sfx'),
      engine: defaultVolume('engine'),
      radio: 0,
      passenger: false,
      lastName: CONFIG.highscores.defaultName,
      keys: normalizeBindings(DEFAULT_KEYS),
    },
  };
}

function clampInt(v, lo, hi, fallback) {
  return Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
}

/**
 * Repairs loaded data: unknown or broken fields fall back to defaults.
 * @param {any} raw parsed JSON
 * @returns {object}
 */
export function sanitize(raw) {
  const d = defaultData();
  if (!raw || typeof raw !== 'object' || raw.version !== VERSION) return d;
  const st = raw.settings || {};
  const steps = CONFIG.menu.volumeSteps;
  d.settings.music = clampInt(st.music, 0, steps, d.settings.music);
  d.settings.sfx = clampInt(st.sfx, 0, steps, d.settings.sfx);
  d.settings.engine = clampInt(st.engine, 0, steps, d.settings.engine);
  d.settings.radio = clampInt(st.radio, 0, 99, 0);
  d.settings.passenger = st.passenger === true;
  if (typeof st.lastName === 'string' && st.lastName.length === CONFIG.highscores.nameLength) d.settings.lastName = st.lastName;
  d.settings.keys = normalizeBindings(st.keys);
  if (Array.isArray(raw.highscores)) {
    for (const h of raw.highscores) {
      if (h && typeof h.name === 'string' && Number.isInteger(h.score) && h.score >= 0) {
        d.highscores.push({ name: h.name.slice(0, CONFIG.highscores.nameLength), score: h.score,
          goal: typeof h.goal === 'string' ? h.goal : '', passenger: h.passenger === true });
      }
    }
    d.highscores.sort((a, b) => b.score - a.score);
    d.highscores.length = Math.min(d.highscores.length, CONFIG.highscores.max);
  }
  return d;
}

function defaultBackend() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {{getItem:Function, setItem:Function}|null} [backend] storage (defaults to localStorage)
 * @returns {{data:object, backend:object|null, available:boolean}}
 */
export function createStore(backend = defaultBackend()) {
  const store = { data: defaultData(), backend, available: false };
  try {
    if (backend) {
      const text = backend.getItem(KEY);
      store.data = sanitize(text ? JSON.parse(text) : null);
      store.available = true;
    }
  } catch (e) {
    store.data = defaultData();
    store.available = false;
  }
  return store;
}

/**
 * Writes the data; returns false when storage is unavailable.
 * @param {{data:object, backend:object|null, available:boolean}} store
 * @returns {boolean}
 */
export function saveStore(store) {
  if (!store.backend) return false;
  try {
    store.backend.setItem(KEY, JSON.stringify(store.data));
    store.available = true;
    return true;
  } catch (e) {
    store.available = false;
    return false;
  }
}

/**
 * True when `score` would enter the highscore table.
 * @param {object} store
 * @param {number} score
 * @returns {boolean}
 */
export function qualifies(store, score) {
  const list = store.data.highscores;
  if (score <= 0) return false;
  return list.length < CONFIG.highscores.max || score > list[list.length - 1].score;
}

/**
 * Inserts an entry, keeps the table sorted and trimmed, saves. Returns the rank (0-based) or -1.
 * @param {object} store
 * @param {{name:string, score:number, goal:string, passenger:boolean}} entry
 * @returns {number}
 */
export function addHighscore(store, entry) {
  if (!qualifies(store, entry.score)) return -1;
  const list = store.data.highscores;
  let at = list.findIndex((h) => entry.score > h.score);
  if (at < 0) at = list.length;
  list.splice(at, 0, { name: entry.name, score: entry.score, goal: entry.goal || '', passenger: !!entry.passenger });
  list.length = Math.min(list.length, CONFIG.highscores.max);
  saveStore(store);
  return at;
}

/** The shared store used by the game (tests create their own). */
export const STORE = createStore();
