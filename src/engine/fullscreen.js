// Fullscreen and landscape lock helpers. Browsers allow both only from a user
// gesture, and some refuse them entirely, so every call is guarded.

/** Enters fullscreen and tries to lock landscape orientation. */
export function enterFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().then(lockLandscape).catch(() => {});
    }
  } catch (e) { /* not allowed here */ }
}

function lockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* not supported */ }
}

/** Toggles fullscreen (keyboard shortcut). */
export function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else enterFullscreen();
  } catch (e) { /* ignore */ }
}

/**
 * True when a touch device is held in portrait (the game needs landscape).
 * @param {boolean} touch touch controls active
 * @returns {boolean}
 */
export function isPortrait(touch) {
  return touch && typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
}
