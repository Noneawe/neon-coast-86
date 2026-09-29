// ABOUT screen: copyright, the AGPL-3.0 notice and the source code address.
// ENTER / A opens the source page in a new tab (the AGPL asks that players
// can easily get the source of the version they play).

import { CONFIG } from '../config.js';
import { TEXT, ABOUT_LINES, SOURCE_URL } from '../data/text.js';
import { setState } from './machine.js';
import { centered, panel } from '../render/ui.js';

function openSource() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open(SOURCE_URL, '_blank', 'noopener');
  } catch (e) { /* pop-ups blocked: the address stays on screen */ }
}

/**
 * One step of input: 'back', 'open' or ''.
 * @param {{wasPressed:(a:string)=>boolean}} input
 * @returns {string}
 */
export function aboutStep(input) {
  if (input.wasPressed('back')) return 'back';
  if (input.wasPressed('confirm')) return 'open';
  return '';
}

export const aboutState = {
  enter() {},
  exit() {},
  update(dt, input) {
    const act = aboutStep(input);
    if (act === 'back') setState('menu', {});
    else if (act === 'open') openSource();
  },
  render(ctx) {
    const c = CONFIG.hud.colors;
    const { width, height } = CONFIG.screen;
    ctx.fillStyle = c.panel;
    ctx.fillRect(0, 0, width, height);
    centered(ctx, TEXT.menuAbout, 6, c.logoA, 2);
    panel(ctx, 8, 28, width - 16, 176);
    for (let i = 0; i < ABOUT_LINES.length; i++) {
      if (ABOUT_LINES[i]) centered(ctx, ABOUT_LINES[i], 36 + i * 12, i < 2 ? c.select : c.text, 1);
    }
    centered(ctx, SOURCE_URL, 36 + ABOUT_LINES.length * 12 + 2, c.logoB, 1);
    centered(ctx, TEXT.aboutHint, height - 22, c.select, 1);
  },
};
