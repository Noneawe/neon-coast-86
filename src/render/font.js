// Bitmap 5×7 pixel font. Glyphs are data (rows of '0'/'1'); each colour is
// rendered once into an offscreen atlas and text is blitted from it.

export const GLYPH_W = 5;
export const GLYPH_H = 7;
export const GLYPH_ADVANCE = 6;

/** Character → 7 rows of 5 bits. Lowercase letters map to uppercase. */
export const GLYPHS = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  'D': ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  'N': ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  'Y': ['10001', '10001', '10001', '01010', '00100', '00100', '00100'],
  'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '/': ['00000', '00001', '00010', '00100', '01000', '10000', '00000'],
  '%': ['11000', '11001', '00010', '00100', '01000', '10011', '00011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  "'": ['01100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000'],
};

const GLYPH_CHARS = Object.keys(GLYPHS);

/** charCode → atlas column (or -1). Lowercase resolves to uppercase. */
const GLYPH_INDEX = new Int16Array(128).fill(-1);
GLYPH_CHARS.forEach((ch, i) => {
  GLYPH_INDEX[ch.charCodeAt(0)] = i;
});
for (let c = 97; c <= 122; c++) GLYPH_INDEX[c] = GLYPH_INDEX[c - 32];

const atlases = new Map();

function buildAtlas(color) {
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_CHARS.length * GLYPH_W;
  canvas.height = GLYPH_H;
  const g = canvas.getContext('2d');
  g.fillStyle = color;
  GLYPH_CHARS.forEach((ch, i) => {
    const rows = GLYPHS[ch];
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (rows[y][x] === '1') g.fillRect(i * GLYPH_W + x, y, 1, 1);
      }
    }
  });
  return canvas;
}

function getAtlas(color) {
  let atlas = atlases.get(color);
  if (!atlas) {
    atlas = buildAtlas(color);
    atlases.set(color, atlas);
  }
  return atlas;
}

/**
 * Checks whether every character of `text` has a glyph.
 * @param {string} text
 * @returns {boolean}
 */
export function hasGlyphs(text) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 128 || GLYPH_INDEX[code] < 0) return false;
  }
  return true;
}

/**
 * Draws text at whole-pixel position (x, y). Unknown characters are skipped.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} color CSS hex colour
 * @param {number} [scale] integer pixel scale (default 1)
 */
export function drawText(ctx, text, x, y, color, scale = 1) {
  const atlas = getAtlas(color);
  const px = Math.round(x);
  const py = Math.round(y);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const idx = code < 128 ? GLYPH_INDEX[code] : -1;
    if (idx < 0) continue;
    ctx.drawImage(atlas, idx * GLYPH_W, 0, GLYPH_W, GLYPH_H,
      px + i * GLYPH_ADVANCE * scale, py, GLYPH_W * scale, GLYPH_H * scale);
  }
}

/**
 * Draws a non-negative integer right-aligned in `digits` cells without
 * allocating a string (safe for per-frame HUD use).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} value
 * @param {number} digits cell count; leading zeros are left blank
 * @param {number} x left edge of the first cell
 * @param {number} y
 * @param {string} color
 * @param {number} [scale]
 */
export function drawNumber(ctx, value, digits, x, y, color, scale = 1) {
  const atlas = getAtlas(color);
  let v = Math.max(0, Math.floor(value));
  const zero = GLYPH_INDEX[48];
  for (let i = digits - 1; i >= 0; i--) {
    const d = v % 10;
    if (v > 0 || i === digits - 1) {
      ctx.drawImage(atlas, (zero + d) * GLYPH_W, 0, GLYPH_W, GLYPH_H,
        Math.round(x) + i * GLYPH_ADVANCE * scale, Math.round(y), GLYPH_W * scale, GLYPH_H * scale);
    }
    v = Math.floor(v / 10);
  }
}
