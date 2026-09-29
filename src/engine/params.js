// Parses URL parameters (?debug, ?section, ?seed, ?mute, ?god, ?passenger, ?test) into a
// plain object. Pure function so it can be tested without a browser.

/**
 * @param {string} search location.search string, e.g. "?debug=1&seed=42"
 * @returns {{debug:boolean, section:string|null, seed:number|null, mute:boolean, god:boolean, passenger:boolean, test:boolean}}
 */
export function parseParams(search) {
  const q = new URLSearchParams(search || '');
  const flag = (name) => q.has(name) && q.get(name) !== '0' && q.get(name) !== 'false';
  const seedRaw = q.get('seed');
  const seed = seedRaw !== null && /^-?\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const section = q.get('section');
  return {
    debug: flag('debug'),
    section: section ? section.toUpperCase() : null,
    seed,
    mute: flag('mute'),
    god: flag('god'),
    passenger: flag('passenger'),
    test: flag('test'),
  };
}
