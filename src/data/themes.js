// Visual themes: a palette of named colour roles (32–64 colours), dithered sky
// bands, sun and parallax layer definitions. Road, background and roadside
// sprites take every colour from the active theme's palette.

/** Every role a theme palette must define (validated by tools/test.mjs). */
export const THEME_ROLES = [
  // sky and backgrounds
  'sky0', 'sky1', 'sky2', 'sky3', 'sky4', 'sun', 'sunStripe', 'cloud', 'cloudShade',
  'far', 'farShade', 'mid', 'midShade', 'near', 'nearShade', 'ground',
  // road
  'road', 'roadDark', 'grass', 'grassDark', 'rumble', 'rumbleDark', 'lane',
  // roadside sprites
  'outline', 'trunk', 'trunkDark', 'leaf', 'leafDark', 'leafLight',
  'rock', 'rockDark', 'rockLight', 'cactus', 'cactusDark', 'cactusLight',
  'signFace', 'signFrame', 'signMark', 'post', 'postDark', 'reflector',
  'billboardA', 'billboardB', 'billboardText',
  // traffic vehicles
  'carA', 'carAShade', 'carB', 'carBShade', 'carC', 'carCShade',
  'tire', 'glass', 'chrome', 'taillight', 'cargo', 'cargoShade',
  // effects
  'smoke', 'dust',
];

/** Road colour roles for light and dark rumble stripes (lane null = no markers). */
export const ROAD_ROLES = {
  light: { road: 'road', grass: 'grass', rumble: 'rumble', lane: 'lane' },
  dark: { road: 'roadDark', grass: 'grassDark', rumble: 'rumbleDark', lane: null },
};

/*
 * Theme format:
 *   name     UI name
 *   palette  role → '#rrggbb' (all THEME_ROLES)
 *   sky      { bands: roles top→horizon, sun: { x, y, r, stripes } } (x as 0..1 of width, y/r in px)
 *   layers   parallax layers, slot 0 = farthest (see CONFIG.sky.layerSpeeds):
 *            { slot, type: 'clouds'|'mountains'|'hills'|'mesas'|'forest',
 *              main, shade (roles), height (px), bottom (px above horizon), seed, count? }
 */
export const THEMES = {
  coastDay: {
    name: 'Coast Day',
    palette: {
      sky0: '#2a6fdb', sky1: '#3f8ae6', sky2: '#5fa8f0', sky3: '#86c4f5', sky4: '#b8e0fa',
      sun: '#fff4b0', sunStripe: '#ffd860', cloud: '#ffffff', cloudShade: '#cfe3f5',
      far: '#7a9cc8', farShade: '#6384b3', mid: '#4f9a58', midShade: '#3d8248',
      near: '#3a8a3e', nearShade: '#2c7031', ground: '#44a044',
      road: '#6b6b70', roadDark: '#646469', grass: '#3aa53a', grassDark: '#2f9433',
      rumble: '#f2f2f2', rumbleDark: '#d62828', lane: '#f4f4f4',
      outline: '#1a2a1a', trunk: '#a0703c', trunkDark: '#76502a',
      leaf: '#2f9e3a', leafDark: '#1e7a2a', leafLight: '#6cd05a',
      rock: '#a89a8a', rockDark: '#7a6e62', rockLight: '#d0c4b4',
      cactus: '#4a9a4a', cactusDark: '#2e7a36', cactusLight: '#7ac46a',
      signFace: '#f2c200', signFrame: '#3a3a40', signMark: '#1a1a1a',
      post: '#e8e8e8', postDark: '#9a9aa0', reflector: '#ff3030',
      billboardA: '#ff4fa0', billboardB: '#20c0e0', billboardText: '#ffffff',
      carA: '#2a5ad8', carAShade: '#1c3e9a', carB: '#f0e8d8', carBShade: '#b8b0a0',
      carC: '#f0c020', carCShade: '#b08a10', tire: '#18181c', glass: '#243a58',
      chrome: '#c8c8d0', taillight: '#ff2a2a', cargo: '#e8e4dc', cargoShade: '#b4b0a8',
      smoke: '#eef0f4', dust: '#c8b890',
    },
    sky: { bands: ['sky0', 'sky1', 'sky2', 'sky3', 'sky4'], sun: { x: 0.2, y: 26, r: 10, stripes: false } },
    layers: [
      { slot: 0, type: 'clouds', main: 'cloud', shade: 'cloudShade', height: 40, bottom: 50, seed: 11, count: 7 },
      { slot: 1, type: 'mountains', main: 'far', shade: 'farShade', height: 34, bottom: 0, seed: 21 },
      { slot: 2, type: 'hills', main: 'mid', shade: 'midShade', height: 14, bottom: 0, seed: 31 },
    ],
  },

  desertNoon: {
    name: 'Desert Noon',
    palette: {
      sky0: '#3a7bd0', sky1: '#5d97dc', sky2: '#86b4e6', sky3: '#b4d2ee', sky4: '#e6ecef',
      sun: '#fffbe0', sunStripe: '#ffe890', cloud: '#fbf6ea', cloudShade: '#e4d8c4',
      far: '#c98a5a', farShade: '#a86e46', mid: '#e0a868', midShade: '#c88e50',
      near: '#d8964e', nearShade: '#b87a3c', ground: '#e2b070',
      road: '#7a7068', roadDark: '#72685f', grass: '#e6b878', grassDark: '#d8a868',
      rumble: '#f4f0e8', rumbleDark: '#c83a1e', lane: '#f6f2ea',
      outline: '#2a1a10', trunk: '#8a6a48', trunkDark: '#624a30',
      leaf: '#7a8a3a', leafDark: '#5a6a28', leafLight: '#a8b85a',
      rock: '#b87a4a', rockDark: '#8a5634', rockLight: '#dca070',
      cactus: '#3e8a44', cactusDark: '#2a6a30', cactusLight: '#6cb65a',
      signFace: '#f0b000', signFrame: '#4a3a30', signMark: '#1a1208',
      post: '#f0e8dc', postDark: '#a8988a', reflector: '#ff4020',
      billboardA: '#ff8a20', billboardB: '#20a0a0', billboardText: '#fff8e8',
      carA: '#3a6ab0', carAShade: '#284c80', carB: '#e8dcc4', carBShade: '#b0a48c',
      carC: '#c84a2a', carCShade: '#8e321c', tire: '#1c1814', glass: '#2c3a4a',
      chrome: '#d0c8bc', taillight: '#ff3a1e', cargo: '#d8c8a8', cargoShade: '#a8987a',
      smoke: '#f4efe4', dust: '#e0c090',
    },
    sky: { bands: ['sky0', 'sky1', 'sky2', 'sky3', 'sky4'], sun: { x: 0.72, y: 22, r: 13, stripes: false } },
    layers: [
      { slot: 0, type: 'clouds', main: 'cloud', shade: 'cloudShade', height: 30, bottom: 64, seed: 12, count: 3 },
      { slot: 1, type: 'mesas', main: 'far', shade: 'farShade', height: 30, bottom: 0, seed: 22 },
      { slot: 2, type: 'hills', main: 'mid', shade: 'midShade', height: 10, bottom: 0, seed: 32 },
    ],
  },

  pineDusk: {
    name: 'Pine Dusk',
    palette: {
      sky0: '#2a1850', sky1: '#5a2a78', sky2: '#a03a80', sky3: '#e0605a', sky4: '#ffa048',
      sun: '#ffe070', sunStripe: '#ff7a40', cloud: '#d07aa0', cloudShade: '#a05a88',
      far: '#4a3070', farShade: '#3a2460', mid: '#2a3a58', midShade: '#1e2c48',
      near: '#1e3a30', nearShade: '#142a22', ground: '#24402c',
      road: '#4e4a58', roadDark: '#474352', grass: '#2c5a34', grassDark: '#244e2c',
      rumble: '#e8e0f0', rumbleDark: '#b02a4a', lane: '#ece4f4',
      outline: '#0e0a18', trunk: '#6a4a38', trunkDark: '#4a3226',
      leaf: '#1e5a3a', leafDark: '#12422a', leafLight: '#3a7a50',
      rock: '#6a6078', rockDark: '#4a4258', rockLight: '#9088a0',
      cactus: '#2e6a40', cactusDark: '#1e4a2c', cactusLight: '#4a8a58',
      signFace: '#f0a000', signFrame: '#2a2632', signMark: '#140e08',
      post: '#d8d0e0', postDark: '#8a8298', reflector: '#ff3050',
      billboardA: '#ff3aa0', billboardB: '#3a60ff', billboardText: '#fff0ff',
      carA: '#3a4ab8', carAShade: '#262f80', carB: '#c8c0d8', carBShade: '#8a8298',
      carC: '#e0802a', carCShade: '#a0561a', tire: '#0e0c14', glass: '#1a2034',
      chrome: '#a8a0b8', taillight: '#ff2a4a', cargo: '#b0a8c0', cargoShade: '#807890',
      smoke: '#d8d0e4', dust: '#6a7a58',
    },
    sky: { bands: ['sky0', 'sky1', 'sky2', 'sky3', 'sky4'], sun: { x: 0.6, y: 92, r: 22, stripes: true } },
    layers: [
      { slot: 0, type: 'mountains', main: 'far', shade: 'farShade', height: 44, bottom: 0, seed: 13 },
      { slot: 1, type: 'forest', main: 'mid', shade: 'midShade', height: 22, bottom: 0, seed: 23 },
      { slot: 2, type: 'hills', main: 'near', shade: 'nearShade', height: 10, bottom: 0, seed: 33 },
    ],
  },
};
