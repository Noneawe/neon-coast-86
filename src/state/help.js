// HOW TO PLAY: a few pages of rules (race, driving, drift and score,
// passenger mode). LEFT/RIGHT or ENTER turn pages, ESC goes back to the menu.

import { CONFIG } from '../config.js';
import { TEXT, HELP_PAGES } from '../data/text.js';
import { setState } from './machine.js';
import { centered, outlined, panel } from '../render/ui.js';
import { drawNumber, GLYPH_ADVANCE } from '../render/font.js';

let page = 0;

/**
 * Page index after one step of input, or -1 to leave the screen.
 * @param {number} current
 * @param {{wasPressed:(a:string)=>boolean}} input
 * @returns {number}
 */
export function helpStep(current, input) {
  const n = HELP_PAGES.length;
  if (input.wasPressed('back')) return -1;
  if (input.wasPressed('menuLeft') || input.wasPressed('left')) return (current + n - 1) % n;
  if (input.wasPressed('menuRight') || input.wasPressed('right')) return (current + 1) % n;
  if (input.wasPressed('confirm')) return current + 1 < n ? current + 1 : -1;
  return current;
}

export const helpState = {
  enter() {
    page = 0;
  },
  exit() {},
  update(dt, input) {
    const next = helpStep(page, input);
    if (next < 0) setState('menu', {});
    else page = next;
  },
  render(ctx) {
    const c = CONFIG.hud.colors;
    const { width, height } = CONFIG.screen;
    ctx.fillStyle = c.panel;
    ctx.fillRect(0, 0, width, height);
    const p = HELP_PAGES[page];
    centered(ctx, TEXT.menuHelp, 6, c.logoA, 2);
    panel(ctx, 8, 30, width - 16, 160);
    centered(ctx, p.title, 38, c.logoB, 1);
    for (let i = 0; i < p.lines.length; i++) if (p.lines[i]) outlined(ctx, p.lines[i], 18, 56 + i * 14, c.text);
    const x = width - 18 - 3 * GLYPH_ADVANCE;
    drawNumber(ctx, page + 1, 1, x, 176, c.dim, 1);
    drawNumber(ctx, HELP_PAGES.length, 1, x + 2 * GLYPH_ADVANCE, 176, c.dim, 1);
    outlined(ctx, '/', x + GLYPH_ADVANCE, 176, c.dim);
    centered(ctx, TEXT.helpHint, height - 22, c.select, 1);
  },
};
