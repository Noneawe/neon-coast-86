// Owns the 320×240 render canvas and scales it to the window by an integer
// factor (in device pixels) when possible, letterboxing the rest.

import { CONFIG } from '../config.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{canvas:HTMLCanvasElement, ctx:CanvasRenderingContext2D, width:number, height:number, scale:number}}
 */
export function createScreen(canvas) {
  const { width, height, letterboxColor } = CONFIG.screen;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  const screen = { canvas, ctx, width, height, scale: 1 };
  document.body.style.background = letterboxColor;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min((window.innerWidth * dpr) / width, (window.innerHeight * dpr) / height);
    const scale = fit >= 1 ? Math.floor(fit) : fit;
    canvas.style.width = `${(width * scale) / dpr}px`;
    canvas.style.height = `${(height * scale) / dpr}px`;
    screen.scale = scale;
    ctx.imageSmoothingEnabled = false;
  }

  window.addEventListener('resize', resize);
  resize();
  return screen;
}
