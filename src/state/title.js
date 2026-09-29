// Title screen with attract mode: a demo race driven by the autopilot runs
// behind the logo; the highscore table alternates with the logo. ENTER / Start
// opens the menu.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { STORE } from '../storage.js';
import { raceState } from './race.js';
import { buildDemoParams } from './boot.js';
import { setState } from './machine.js';
import { drawLogo, centered, panel, drawHighscores } from '../render/ui.js';
import { radioOff } from '../audio/sfx.js';

let timer = 0;
let highlight = -1;

function restartDemo() {
  timer = 0;
  raceState.enter(buildDemoParams());
}

export const titleState = {
  /** @param {{highlight?:number}} params index of a new highscore to highlight */
  enter(params) {
    highlight = typeof params.highlight === 'number' ? params.highlight : -1;
    radioOff();
    restartDemo();
    // A fresh highscore is shown first.
    if (highlight >= 0) timer = CONFIG.title.panelTime;
  },
  exit() {},
  update(dt, input) {
    if (input.wasPressed('confirm') || input.wasPressed('pause')) {
      setState('menu', {});
      return;
    }
    timer += dt;
    raceState.update(dt, input);
    if (timer >= CONFIG.title.demoTime || raceState.demoOver()) restartDemo();
  },
  render(ctx, alpha) {
    raceState.render(ctx, alpha);
    const c = CONFIG.hud.colors;
    const showScores = Math.floor(timer / CONFIG.title.panelTime) % 2 === 1;
    if (showScores) {
      panel(ctx, 70, 40, 180, 130);
      drawHighscores(ctx, STORE.data.highscores, 48, highlight);
    } else {
      drawLogo(ctx, 40);
    }
    centered(ctx, TEXT.demo, 190, c.dim, 1);
    if (Math.floor(timer / CONFIG.title.blinkInterval) % 2 === 0) centered(ctx, TEXT.pressStart, 176, c.select, 1);
  },
};
