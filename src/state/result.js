// Result screens after a race: goal reached or game over. Shows the ending,
// route, time and score; ENTER continues to name entry (new highscore) or
// back to the title.

import { CONFIG } from '../config.js';
import { TEXT } from '../data/text.js';
import { GOALS, TIME_UP_ENDINGS } from '../data/goals.js';
import { endingTier } from '../game/passenger.js';
import { drawText, GLYPH_ADVANCE } from '../render/font.js';
import { setState } from './machine.js';
import { STORE, qualifies } from '../storage.js';

const lines = [];
const colors = [];
let title = '';
const result = { score: 0, goal: '', passenger: false };

function center(ctx, text, y, color, scale) {
  const w = (text.length * GLYPH_ADVANCE - 1) * scale;
  drawText(ctx, text, Math.round((CONFIG.screen.width - w) / 2), y, color, scale);
}

function makeState(isGoal) {
  return {
    /** @param {{race:object, score:object, passenger?:object}} params */
    enter(params) {
      const race = params.race;
      const score = params.score;
      const ps = params.passenger;
      result.score = score.total;
      result.goal = isGoal ? race.goalId || '' : '';
      result.passenger = !!(ps && ps.active);
      title = isGoal ? TEXT.goal : TEXT.gameOver;
      lines.length = 0;
      colors.length = 0;
      if (isGoal && GOALS[race.goalId]) {
        lines.push(GOALS[race.goalId].name, GOALS[race.goalId].text, '');
        colors.push(CONFIG.hud.colors.label, CONFIG.hud.colors.text, '');
      }
      if (ps && ps.active) {
        const tier = endingTier(ps.hearts);
        const ending = isGoal && GOALS[race.goalId] ? GOALS[race.goalId].endings[tier] : TIME_UP_ENDINGS[tier];
        lines.push(ending, `${TEXT.hearts} ${ps.hearts}/${CONFIG.passenger.maxHearts}`, '');
        colors.push(CONFIG.hud.colors.bubble, CONFIG.hud.colors.heartFull, '');
      }
      lines.push(`${TEXT.route} ${race.route.join(' ')}`, `${TEXT.totalTime} ${race.elapsed.toFixed(2)}`);
      colors.push(CONFIG.hud.colors.text, CONFIG.hud.colors.text);
      if (score.goalBonus > 0) {
        lines.push(`${TEXT.timeBonus} ${score.goalBonus}`);
        colors.push(CONFIG.hud.colors.text);
      }
      if (score.passengerBonus > 0) {
        lines.push(`${TEXT.heartBonus} ${score.passengerBonus}`);
        colors.push(CONFIG.hud.colors.text);
      }
      lines.push(`${TEXT.score} ${score.total}`, '', TEXT.pressConfirm);
      colors.push(CONFIG.hud.colors.label, '', CONFIG.hud.colors.label);
    },
    exit() {},
    update(dt, input) {
      if (!input.wasPressed('confirm')) return;
      if (qualifies(STORE, result.score)) setState('nameEntry', result);
      else setState('title', {});
    },
    render(ctx) {
      ctx.fillStyle = CONFIG.screen.letterboxColor;
      ctx.fillRect(0, 0, CONFIG.screen.width, CONFIG.screen.height);
      center(ctx, title, 40, isGoal ? CONFIG.hud.colors.label : CONFIG.hud.colors.warn, 3);
      for (let i = 0; i < lines.length; i++) if (lines[i]) center(ctx, lines[i], 80 + i * 11, colors[i], 1);
    },
  };
}

export const goalState = makeState(true);
export const gameOverState = makeState(false);
