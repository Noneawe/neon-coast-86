// Debug overlay (F1 / ?debug=1): FPS, frame time and state-provided lines.
// Text is rebuilt only a few times per second to keep the frame allocation-free.

import { CONFIG } from '../config.js';
import { drawText } from './font.js';

const lines = [];
let lineCount = 0;
let lastRefresh = -Infinity;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{fps:number, frameMs:number, updateMs:number, renderMs:number, time:number}} stats
 * @param {string} stateName
 * @param {{debugLines?:(out:string[])=>number}|null} state
 */
export function drawDebugOverlay(ctx, stats, stateName, state) {
  const cfg = CONFIG.debug;
  if (stats.time - lastRefresh >= cfg.refreshInterval) {
    lastRefresh = stats.time;
    lines[0] = `FPS ${stats.fps.toFixed(1)}`;
    lines[1] = `FRAME ${stats.frameMs.toFixed(2)}MS U ${stats.updateMs.toFixed(2)} R ${stats.renderMs.toFixed(2)}`;
    lines[2] = `STATE ${stateName}`;
    lineCount = 3 + (state && state.debugLines ? state.debugLines(lines, 3) : 0);
  }
  for (let i = 0; i < lineCount; i++) {
    const y = cfg.y + i * cfg.lineHeight;
    drawText(ctx, lines[i], cfg.x + 1, y + 1, cfg.shadowColor);
    drawText(ctx, lines[i], cfg.x, y, cfg.textColor);
  }
}
