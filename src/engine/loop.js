// Fixed-timestep game loop: accumulates real time, runs update(dt) in fixed
// steps (capped per frame), then render(alpha). Stops while the tab is hidden.

import { CONFIG } from '../config.js';

/**
 * Creates the accumulator state used by advanceTime.
 * @returns {{acc:number, alpha:number, dt:number, maxSteps:number, maxFrameTime:number}}
 */
export function createTimeState() {
  return {
    acc: 0,
    alpha: 0,
    dt: CONFIG.loop.dt,
    maxSteps: CONFIG.loop.maxStepsPerFrame,
    maxFrameTime: CONFIG.loop.maxFrameTime,
  };
}

/**
 * Feeds real elapsed time into the accumulator and runs fixed updates.
 * Drops the backlog when the step cap is hit (spiral-of-death guard).
 * @param {ReturnType<typeof createTimeState>} ts
 * @param {number} elapsed real seconds since previous frame
 * @param {(dt:number) => void} update
 * @returns {number} number of update steps performed
 */
export function advanceTime(ts, elapsed, update) {
  const e = elapsed > ts.maxFrameTime ? ts.maxFrameTime : elapsed > 0 ? elapsed : 0;
  ts.acc += e;
  let steps = 0;
  while (ts.acc >= ts.dt && steps < ts.maxSteps) {
    update(ts.dt);
    ts.acc -= ts.dt;
    steps++;
  }
  if (ts.acc >= ts.dt) ts.acc = 0;
  ts.alpha = ts.acc / ts.dt;
  return steps;
}

/**
 * Browser loop driven by requestAnimationFrame.
 * @param {{update:(dt:number)=>void, render:(alpha:number)=>void, onHidden?:()=>void, onVisible?:()=>void}} hooks
 * @returns {{start:()=>void, stats:{fps:number, frameMs:number, updateMs:number, renderMs:number, steps:number, time:number}}}
 */
export function createLoop(hooks) {
  const ts = createTimeState();
  const stats = { fps: 0, frameMs: 0, updateMs: 0, renderMs: 0, steps: 0, time: 0 };
  let last = 0;
  let running = false;
  let fpsFrames = 0;
  let fpsTimer = 0;

  function frame(now) {
    if (!running) return;
    const elapsed = (now - last) / 1000;
    last = now;
    const t0 = performance.now();
    stats.steps = advanceTime(ts, elapsed, hooks.update);
    const t1 = performance.now();
    hooks.render(ts.alpha);
    const t2 = performance.now();
    stats.updateMs = t1 - t0;
    stats.renderMs = t2 - t1;
    stats.frameMs = t2 - t0;
    stats.time += elapsed;
    fpsFrames++;
    fpsTimer += elapsed;
    if (fpsTimer >= CONFIG.loop.fpsSampleTime) {
      stats.fps = fpsFrames / fpsTimer;
      fpsFrames = 0;
      fpsTimer = 0;
    }
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running) return;
    running = true;
    ts.acc = 0;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.hidden) {
      running = false;
      if (hooks.onHidden) hooks.onHidden();
    } else {
      if (hooks.onVisible) hooks.onVisible();
      resume();
    }
  }

  function start() {
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) resume();
  }

  return { start, stats };
}
