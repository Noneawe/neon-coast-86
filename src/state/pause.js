// Pause over the frozen race: resume, restart or quit to the title. Opens
// from the race (pause action) or automatically when the tab is hidden.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { setState } from './machine.js';
import { raceState } from './race.js';
import { buildRaceParams } from './boot.js';
import { centered, dimScreen, drawList, panel } from '../render/ui.js';

const ITEMS = ['resume', 'restart', 'quit'];
const LABELS = [TEXT.resume, TEXT.restart, TEXT.quit];
const VALUES = [null, null, null];
let cursor = 0;

/**
 * Pause menu choice for one step of input: 'resume', 'restart', 'quit' or ''.
 * @param {{wasPressed:(a:string)=>boolean}} input
 * @returns {string}
 */
export function pauseStep(input) {
  if (input.wasPressed('pause') || input.wasPressed('back')) return 'resume';
  if (input.wasPressed('up')) cursor = (cursor + ITEMS.length - 1) % ITEMS.length;
  if (input.wasPressed('down')) cursor = (cursor + 1) % ITEMS.length;
  return input.wasPressed('confirm') ? ITEMS[cursor] : '';
}

export const pauseState = {
  enter() {
    cursor = 0;
  },
  exit() {},
  update(dt, input) {
    const act = pauseStep(input);
    if (act === 'resume') setState('race', { resume: true });
    else if (act === 'restart') setState('race', buildRaceParams(raceState.inspect().passenger.active));
    else if (act === 'quit') setState('title', {});
  },
  render(ctx) {
    raceState.render(ctx, 1);
    dimScreen(ctx);
    panel(ctx, 80, 70, 160, 90);
    centered(ctx, TEXT.paused, 80, CONFIG.hud.colors.select, 2);
    drawList(ctx, LABELS, VALUES, cursor, 110, 100);
  },
};
