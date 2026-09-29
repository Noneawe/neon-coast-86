// Small numeric helpers: clamping, interpolation, easing, wrapping and the
// pseudo-3D projection of a world point onto the screen buffer.

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Quadratic ease-in from a to b.
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 * @returns {number}
 */
export function easeIn(a, b, t) {
  return a + (b - a) * t * t;
}

/**
 * Quadratic ease-out from a to b.
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 * @returns {number}
 */
export function easeOut(a, b, t) {
  return a + (b - a) * (1 - (1 - t) * (1 - t));
}

/**
 * Cosine ease-in-out from a to b.
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 * @returns {number}
 */
export function easeInOut(a, b, t) {
  return a + (b - a) * (0.5 - Math.cos(t * Math.PI) / 2);
}

/**
 * Wraps value into [0, max).
 * @param {number} value
 * @param {number} max
 * @returns {number}
 */
export function wrap(value, max) {
  const r = value % max;
  return r < 0 ? r + max : r;
}

/**
 * Camera depth (distance to projection plane) for a horizontal FOV.
 * @param {number} fovDegrees
 * @returns {number}
 */
export function cameraDepth(fovDegrees) {
  return 1 / Math.tan((fovDegrees / 2) * Math.PI / 180);
}

/**
 * Projects a road point in place. Writes p.camera {x,y,z} and p.screen {x,y,w,scale}.
 * Screen values stay fractional; rasterizers round them.
 * @param {{world:{x:number,y:number,z:number}, camera:object, screen:object}} p
 * @param {number} camX camera world x
 * @param {number} camY camera world y
 * @param {number} camZ camera world z
 * @param {number} depth camera depth
 * @param {number} width screen width
 * @param {number} height screen height
 * @param {number} roadWidth half road width in world units
 */
export function project(p, camX, camY, camZ, depth, width, height, roadWidth) {
  const c = p.camera;
  const s = p.screen;
  c.x = p.world.x - camX;
  c.y = p.world.y - camY;
  c.z = p.world.z - camZ;
  const scale = depth / c.z;
  const halfW = width / 2;
  s.scale = scale;
  s.x = halfW + scale * c.x * halfW;
  s.y = height / 2 - scale * c.y * (height / 2);
  s.w = scale * roadWidth * halfW;
}
