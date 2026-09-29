// Bootstrap: reads URL params, creates screen, input, audio, sprite cache and
// loop, registers states and starts the game in the boot state.
// NEON COAST '86 – Copyright (C) 2026 Noneawe – AGPL-3.0-or-later, see LICENSE.

import { CONFIG } from './config.js';
import { parseParams } from './engine/params.js';
import { setDebugEnabled, debugLog } from './engine/debug.js';
import { createInput } from './engine/input.js';
import { createTouchState, attachTouch, isTouchDevice } from './engine/touch.js';
import { enterFullscreen, toggleFullscreen, isPortrait } from './engine/fullscreen.js';
import { drawTouchControls } from './render/touch.js';
import { roadQuality, setRoadQuality } from './render/road.js';
import { setTouchLayout } from './render/hud.js';
import { centered } from './render/ui.js';
import { TEXT } from './data/text.js';
import { createLoop } from './engine/loop.js';
import { createScreen } from './render/screen.js';
import { drawDebugOverlay } from './render/debug.js';
import { initSprites } from './render/sprites.js';
import { initSky } from './render/sky.js';
import { registerState, setState, updateState, renderState, getStateName, getState } from './state/machine.js';
import { bootState } from './state/boot.js';
import { raceState } from './state/race.js';
import { goalState, gameOverState } from './state/result.js';
import { titleState } from './state/title.js';
import { menuState } from './state/menu.js';
import { pauseState } from './state/pause.js';
import { nameEntryState } from './state/name-entry.js';
import { controlsState } from './state/controls.js';
import { helpState } from './state/help.js';
import { aboutState } from './state/about.js';
import { STORE } from './storage.js';
import { initHud } from './render/hud.js';
import { SECTIONS } from './data/sections.js';
import { sectionStages } from './game/race.js';
import { initAudio, suspendAudio, resumeAudio, onAudioReady, setChannelVolume } from './audio/mixer.js';
import { tickAudio, radioSelect } from './audio/sfx.js';

const params = parseParams(window.location.search);
setDebugEnabled(params.debug);

const screen = createScreen(document.getElementById('game'));
const touch = createTouchState();
touch.enabled = isTouchDevice();
attachTouch(screen.canvas, touch, () => {
  if (CONFIG.touch.autoFullscreen) enterFullscreen();
});
const input = createInput(window, undefined, touch);
input.setBindings(STORE.data.settings.keys);
const perf = { slow: 0 };
const overlay = { visible: params.debug };
initAudio(window, params.mute);
radioSelect(STORE.data.settings.radio);
onAudioReady(() => {
  for (const ch of ['music', 'sfx', 'engine']) setChannelVolume(ch, STORE.data.settings[ch] / CONFIG.menu.volumeSteps);
});
initSprites();
initSky();
initHud(SECTIONS, sectionStages(SECTIONS));

window.addEventListener('gamepadconnected', (e) => debugLog('gamepad connected', e.gamepad.id));
window.addEventListener('gamepaddisconnected', (e) => debugLog('gamepad disconnected', e.gamepad.id));

registerState('boot', bootState);
registerState('title', titleState);
registerState('menu', menuState);
registerState('race', raceState);
registerState('pause', pauseState);
registerState('nameEntry', nameEntryState);
registerState('controls', controlsState);
registerState('help', helpState);
registerState('about', aboutState);
registerState('goal', goalState);
registerState('gameOver', gameOverState);

const loop = createLoop({
  update(dt) {
    input.poll();
    if (input.wasPressed('debugToggle')) overlay.visible = !overlay.visible;
    if (input.wasPressed('fullscreen')) toggleFullscreen();
    // A phone turned to portrait pauses the race (the game needs landscape).
    if (isPortrait(touch.enabled) && getStateName() === 'race') setState('pause', {});
    updateState(dt, input);
    input.endStep();
    adaptQuality(dt);
  },
  render(alpha) {
    tickAudio();
    setTouchLayout(touch.enabled);
    renderState(screen.ctx, alpha);
    drawTouchControls(screen.ctx, touch);
    if (isPortrait(touch.enabled)) drawRotateHint(screen.ctx);
    if (overlay.visible) drawDebugOverlay(screen.ctx, loop.stats, getStateName(), getState());
  },
  onHidden() {
    input.reset();
    suspendAudio();
    // Leaving the tab mid-race pauses the game.
    if (getStateName() === 'race') setState('pause', {});
  },
  onVisible() {
    resumeAudio();
  },
});

/** Drops the road draw distance one level after a stretch of slow frames. */
function adaptQuality(dt) {
  const p = CONFIG.performance;
  const slow = loop.stats.frameMs > p.slowFrameMs || (loop.stats.fps > 0 && loop.stats.fps < p.minFps);
  perf.slow = slow ? perf.slow + dt : 0;
  if (perf.slow < p.window || roadQuality.level >= p.drawDistances.length - 1) return;
  setRoadQuality(roadQuality.level + 1);
  perf.slow = 0;
  debugLog('quality lowered to', roadQuality.drawDistance);
}

function drawRotateHint(ctx) {
  ctx.fillStyle = CONFIG.hud.colors.panel;
  ctx.fillRect(0, 0, CONFIG.screen.width, CONFIG.screen.height);
  centered(ctx, TEXT.rotate, CONFIG.screen.height / 2 - 4, CONFIG.hud.colors.select, 1);
}

setState('boot', { first: true, seed: params.seed, god: params.god, section: params.section, passenger: params.passenger, test: params.test });
loop.start();
