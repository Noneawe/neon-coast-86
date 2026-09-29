// Renders ASCII sprite data into offscreen canvases once, so the game loop
// only blits cached images.

/**
 * @param {string[]} rows one character per pixel
 * @param {Object<string, string>} palette character → CSS colour ('.' = transparent)
 * @returns {HTMLCanvasElement}
 */
export function renderAsciiSprite(rows, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const g = canvas.getContext('2d');
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== '.') {
        g.fillStyle = palette[ch];
        g.fillRect(x, y, end - x, 1);
      }
      x = end;
    }
  }
  return canvas;
}
