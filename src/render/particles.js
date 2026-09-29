// Draws the smoke / dust particle pool as rounded pixel blobs coloured from
// the current theme palette; old particles thin out with a checker pattern.

import { CONFIG } from '../config.js';
import { PARTICLE_SMOKE } from '../world/particles.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{list:object[]}} fx
 * @param {{smoke:string, dust:string}} palette current (possibly blended) theme palette
 */
export function drawParticles(ctx, fx, palette) {
  const life = CONFIG.particles.life;
  for (let i = 0; i < fx.list.length; i++) {
    const p = fx.list[i];
    if (!p.active) continue;
    const s = Math.max(1, Math.round(p.size));
    const left = Math.round(p.x - s / 2);
    const top = Math.round(p.y - s / 2);
    const fading = p.age > life * 0.6;
    ctx.fillStyle = p.kind === PARTICLE_SMOKE ? palette.smoke : palette.dust;
    for (let r = 0; r < s; r++) {
      if (fading && (r + i) % 2 === 1) continue;
      // Trim the corners so blobs look round.
      const inset = s > 2 && (r === 0 || r === s - 1) ? 1 : 0;
      ctx.fillRect(left + inset, top + r, s - 2 * inset, 1);
    }
  }
}
