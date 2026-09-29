// Seedable pseudo-random generator (mulberry32). Same seed gives the same
// sequence, which keeps traffic and passenger tasks reproducible.

/**
 * @param {number} seed 32-bit integer seed
 * @returns {{next: () => number, range: (min:number, max:number) => number, int: (min:number, max:number) => number, seed: (s:number) => void}}
 */
export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor((max - min + 1) * next()),
    seed: (s) => { state = s >>> 0; },
  };
}
