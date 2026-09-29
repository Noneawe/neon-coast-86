// Screen-space particle pool for tyre smoke (drifting) and dust (off-road).
// Particles are allocated once; emitting reuses dead ones and never grows the pool.

import { CONFIG } from '../config.js';

export const PARTICLE_SMOKE = 0;
const PARTICLE_DUST = 1;

/** @returns {{list:object[], smokeTimer:number, dustTimer:number, alive:number}} */
export function createParticles() {
  const list = [];
  for (let i = 0; i < CONFIG.particles.max; i++) {
    list.push({ active: false, kind: PARTICLE_SMOKE, x: 0, y: 0, vx: 0, vy: 0, age: 0, size: 0 });
  }
  return { list, smokeTimer: 0, dustTimer: 0, alive: 0 };
}

/**
 * Emits one puff at screen position (x, y). Returns false when the pool is full.
 * @param {object} fx
 * @param {number} kind PARTICLE_SMOKE or PARTICLE_DUST
 * @param {number} x
 * @param {number} y
 * @param {number} vx sideways speed (px/s)
 * @returns {boolean}
 */
export function emit(fx, kind, x, y, vx) {
  const cfg = CONFIG.particles;
  for (let i = 0; i < fx.list.length; i++) {
    const p = fx.list[i];
    if (p.active) continue;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = -cfg.riseSpeed;
    p.age = 0;
    p.size = cfg.startSize;
    return true;
  }
  return false;
}

function emitWheels(fx, kind, spread, rng) {
  const cfg = CONFIG.particles;
  const cx = CONFIG.screen.width / 2;
  const y = CONFIG.screen.height - cfg.wheelY;
  for (let s = -1; s <= 1; s += 2) {
    emit(fx, kind, cx + s * cfg.wheelOffsetX, y, s * spread * (0.5 + rng.next() * 0.5));
  }
}

/**
 * One fixed step: ages particles and emits new ones from the player's wheels.
 * @param {object} fx
 * @param {{drift:boolean, driftDir:number, offRoad:boolean, speed:number}} player
 * @param {number} dt
 * @param {{next:()=>number}} rng
 */
export function updateParticles(fx, player, dt, rng) {
  const cfg = CONFIG.particles;
  let alive = 0;
  for (let i = 0; i < fx.list.length; i++) {
    const p = fx.list[i];
    if (!p.active) continue;
    p.age += dt;
    if (p.age >= cfg.life) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.size += cfg.growth * dt;
    alive++;
  }
  fx.alive = alive;
  fx.smokeTimer -= dt;
  fx.dustTimer -= dt;
  if (player.drift && fx.smokeTimer <= 0) {
    fx.smokeTimer = cfg.smokeInterval;
    emitWheels(fx, PARTICLE_SMOKE, cfg.spreadSpeed, rng);
  }
  if (player.offRoad && player.speed > 0 && fx.dustTimer <= 0) {
    fx.dustTimer = cfg.dustInterval;
    emitWheels(fx, PARTICLE_DUST, cfg.spreadSpeed * cfg.dustSpread, rng);
  }
}
