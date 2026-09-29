// Traffic vehicle types: sprite, size in world units and cruising speed range.
// Sections pick from these by key in `traffic.types`.

/*
 * Vehicle type format:
 *   sprite      key in VEHICLE_SPRITES
 *   worldWidth  width in world units (road half width = 2000)
 *   length      length along the road in world units (collision box)
 *   speedMin/speedMax  cruising speed range in world units per second
 */
export const VEHICLE_TYPES = {
  sedan: { sprite: 'sedan', worldWidth: 600, length: 900, speedMin: 4500, speedMax: 6500 },
  coupe: { sprite: 'coupe', worldWidth: 640, length: 860, speedMin: 6000, speedMax: 8000 },
  van: { sprite: 'van', worldWidth: 620, length: 1000, speedMin: 4000, speedMax: 5500 },
  truck: { sprite: 'truck', worldWidth: 760, length: 1800, speedMin: 3500, speedMax: 4800 },
};
