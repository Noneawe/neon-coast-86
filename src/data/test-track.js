// Looping test track (?test=1 and the automated tests): three chained
// sections, one per theme, in the sections.js format. Hills sum to zero so
// the loop closes; the desert section has dense sprites for performance checks.

export const TEST_SECTIONS = [
  {
    id: 'T1',
    name: 'Test Coast',
    theme: 'coastDay',
    traffic: { density: 0.5, types: ['sedan', 'van', 'coupe'] },
    segments: [
      { len: 50, curve: 0, hill: 0 },
      { len: 100, curve: 2, hill: 0 },
      { len: 80, curve: 0, hill: 20 },
      { len: 100, curve: -4, hill: -20 },
      { len: 60, curve: 0, hill: 0 },
    ],
    sprites: [
      { every: 12, from: 0, to: 390, sprite: 'palm', side: 'both', offset: 1.5 },
      { every: 8, from: 4, to: 390, sprite: 'post', side: 'both', offset: 1.12 },
      { every: 30, from: 16, to: 390, sprite: 'bush', side: 'right', offset: 2.4 },
      { every: 45, from: 30, to: 390, sprite: 'rock', side: 'left', offset: 2.8 },
      { at: 30, sprite: 'signCurveRight', side: 'left', offset: 1.35 },
      { at: 205, sprite: 'signCurveLeft', side: 'right', offset: 1.35 },
      { at: 120, sprite: 'billboard', side: 'right', offset: 2.2 },
    ],
  },
  {
    id: 'T2',
    name: 'Test Desert',
    theme: 'desertNoon',
    traffic: { density: 0.4, types: ['truck', 'sedan'] },
    segments: [
      { len: 100, curve: 0, hill: 40 },
      { len: 100, curve: 0, hill: -40 },
      { len: 120, curve: 6, hill: 10 },
      { len: 120, curve: -6, hill: -10 },
      { len: 60, curve: 0, hill: 0 },
    ],
    sprites: [
      { every: 4, from: 0, to: 500, sprite: 'cactus', side: 'both', offset: 1.6 },
      { every: 6, from: 2, to: 500, sprite: 'rock', side: 'both', offset: 2.6 },
      { every: 10, from: 0, to: 500, sprite: 'post', side: 'both', offset: 1.12 },
      { at: 180, sprite: 'signCurveRight', side: 'left', offset: 1.35 },
      { at: 300, sprite: 'signCurveLeft', side: 'right', offset: 1.35 },
      { at: 60, sprite: 'billboard', side: 'left', offset: 2.2 },
    ],
  },
  {
    id: 'T3',
    name: 'Test Pines',
    theme: 'pineDusk',
    traffic: { density: 0.7, types: ['sedan', 'van', 'truck', 'coupe'] },
    segments: [
      { len: 100, curve: 3, hill: 30 },
      { len: 100, curve: -3, hill: -30 },
      { len: 80, curve: 4, hill: 0 },
      { len: 80, curve: -2, hill: 0 },
      { len: 50, curve: 0, hill: 0 },
    ],
    sprites: [
      { every: 7, from: 0, to: 410, sprite: 'pine', side: 'both', offset: 1.6 },
      { every: 11, from: 3, to: 410, sprite: 'pine', side: 'both', offset: 2.5 },
      { every: 25, from: 5, to: 410, sprite: 'bush', side: 'left', offset: 1.3 },
      { every: 8, from: 0, to: 410, sprite: 'post', side: 'both', offset: 1.12 },
      { at: 80, sprite: 'signCurveRight', side: 'left', offset: 1.35 },
      { at: 180, sprite: 'signCurveLeft', side: 'right', offset: 1.35 },
    ],
  },
];
