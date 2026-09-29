// Central tuning table. Every number that affects gameplay, rendering or timing
// lives here so the game can be tuned by editing data instead of logic.

export const CONFIG = {
  screen: {
    width: 320,              // internal render buffer width (px)
    height: 240,             // internal render buffer height (px)
    letterboxColor: '#000000',
  },

  loop: {
    dt: 1 / 60,              // fixed simulation step (s)
    maxStepsPerFrame: 5,     // spiral-of-death guard
    maxFrameTime: 0.25,      // longest real frame accepted before clamping (s)
    fpsSampleTime: 1,        // FPS counter averaging window (s)
  },

  road: {
    segmentLength: 200,      // world units per segment
    roadWidth: 2000,         // half of road width in world units
    rumbleLength: 3,         // segments per colour stripe
    lanes: 3,
    drawDistance: 300,       // segments drawn ahead of the camera (upper bound; see performance)
    rumbleRatio: 1 / 6,      // rumble strip width relative to half road width
    laneMarkerRatio: 1 / 32, // lane marker width relative to half road width
    laneMarkerMinPx: 1,      // markers thinner than this are skipped (anti-flicker LOD)
  },

  camera: {
    height: 1600,            // camera height above the ground (world units)
    fieldOfView: 100,        // horizontal FOV in degrees
  },

  track: {
    easeFraction: 0.25,      // share of a part used for ease-in and for ease-out
    hillScale: 200,          // world units of height per data 'hill' unit
    maxCurve: 6,             // absolute curve limit accepted in section data
    minLen: 1500,            // section length limits in segments (validated by tests)
    maxLen: 3000,
    goalRunout: 400,         // straight segments appended after the goal line
  },

  fork: {
    widenLength: 60,         // segments where the road widens before splitting
    splitLength: 300,        // segments where the two branches diverge (>= road.drawDistance)
    spread: 6,               // final branch centre offset (normalized x) at the end of the split
    ghostLength: 200,        // segments the unchosen branch keeps drifting away after the fork
    ghostSpread: 40,         // extra offset the unchosen branch reaches before it ends
    signLead: 40,            // fork warning signs this many segments before the widening
    medianSignAt: 70,        // segments into the split where the median sign stands
    signOffset: 1.4,         // lateral position of the fork warning signs (normalized x)
  },

  race: {
    finishDelay: 3,          // s from crossing the goal to the goal screen
    timeUpDelay: 3,          // s from TIME UP to the game over screen
    checkpointMessageTime: 2.5, // s the checkpoint message stays on screen
    lowTimeWarning: 10,      // s left when the timer starts blinking
    autoDriveThrottle: 0.5,  // throttle used after the goal
  },

  sky: {
    horizonOffset: 2,        // background horizon row below screen centre (px)
    layerWidth: 640,         // parallax layer tile width (px)
    layerSpeeds: [0.0008, 0.0016, 0.0028], // layer shift (fraction of tile) per segment per curve unit
  },

  theme: {
    transitionSegments: 120, // segments over which a new section blends from the previous theme
    blendSteps: 8,           // quantization of palette blends (cached colour sets)
  },

  sprites: {
    minHeightPx: 2,          // roadside sprites smaller than this are skipped
    lodLevels: 3,            // cached sizes: full, 1/2, 1/4
    vehicleSideLevels: 2,    // traffic side-view frames per side
    vehicleSidePx: 2,        // side panel width per side-view level (px)
    vehicleSideThresholds: [0.25, 0.6], // |screen x offset| (fraction of half width) for side frames
  },

  traffic: {
    maxVehicles: 48,         // pool size
    segmentsPerCar: 25,      // section segments per car at density 1
    spawnMinGap: 1500,       // min distance between spawned cars in one lane
    spawnClearZone: 3000,    // no cars spawned this close to the player start
    lookahead: 5000,         // how far ahead AI looks for obstacles
    minGap: 350,             // bumper gap kept at standstill
    headway: 0.35,           // extra gap per unit of speed (s)
    accel: 2000,             // units/s^2
    brake: 7000,             // units/s^2
    laneChangeSpeed: 1.2,    // normalized x per second
    laneChangeCooldown: 2,   // s between lane changes
    laneCheckBack: 1500,     // free space needed behind in the target lane
    sideMargin: 0.04,        // lateral safety margin (normalized x)
    spawnAhead: 450,         // linear tracks: keep spawning cars up to this many segments ahead
    despawnBehind: 60,       // linear tracks: recycle cars this many segments behind the player
    endMargin: 20,           // linear tracks: cars this close to the track end are removed
    lostBranchDistance: 1.5, // car farther than this from the main road after a fork is removed
    spawnJitter: 0.5,        // random spread of spawn spacing (0 = even)
  },

  collision: {
    playerWidth: 640,        // player car width in world units
    playerLength: 900,       // player car length in world units
    crashRelSpeed: 5000,     // closing speed on a vehicle that flips the car
    spriteCrashSpeed: 3000,  // speed into a solid roadside object that flips the car
    bumpSpeedFactor: 0.7,    // player speed after a light rear-end = vehicle speed * this
    sideSpeedFactor: 0.85,   // speed kept after a side swipe
    sideGap: 0.01,           // extra lateral separation after a side swipe (normalized x)
    spriteNudge: 0.15,       // push toward the road after a light knock on an object (normalized x)
    tumbleTime: 1.6,         // s of flipping in place
    tumbleHopPx: 14,         // peak hop of the tumbling car (px)
    tumbleSpins: 2,          // rolls during the tumble
    recoverTime: 1.0,        // s to slide back onto the road
    recoverMaxX: 0.6,        // car is put back within this |x|
    graceTime: 1.5,          // s without collisions after recovery
    blinkInterval: 0.1,      // s per blink phase while recovering
  },

  input: {
    stickDeadzone: 0.2,      // analog stick dead zone (0..1)
    stickDigital: 0.5,       // stick deflection that counts as a digital left/right press
    triggerThreshold: 0.15,  // analog trigger value that counts as pressed
  },

  player: {
    maxSpeed: 12000,         // absolute top speed (world units/s), HIGH gear v-max
    gears: {
      LOW: { maxSpeed: 7200, accel: 5000, lowSpeedAccel: 5000, lowSpeedLimit: 0 },
      HIGH: { maxSpeed: 12000, accel: 3200, lowSpeedAccel: 1200, lowSpeedLimit: 4000 },
    },
    startGear: 'LOW',
    accelFalloff: 0.6,       // accel multiplier loss at gear v-max: a * (1 - k * (v/vmax)^2)
    brake: 10000,            // units/s^2 at full brake
    coastDecel: 1500,        // units/s^2 with throttle released
    overRevDecel: 3000,      // units/s^2 when above current gear v-max (after downshift)
    slopeGravity: 2500,      // units/s^2 per unit of road slope (uphill slows)
    steerSpeed: 2.4,         // normalized x per second at full steer and max speed
    centrifugal: 0.6,        // outward push: curve * k * speedPct^2 per second
    steerResponse: 10,       // visual steer smoothing rate (1/s)
    offRoadMaxSpeed: 3500,   // speed the car is dragged down to off-road
    offRoadDecel: 8000,      // units/s^2 of off-road drag above offRoadMaxSpeed
    maxX: 2.5,               // lateral limit (|x| > 1 is off-road)
    rpmIdle: 900,
    rpmMax: 7500,
    bounce: {
      roadDistance: 600,     // world units between bumps on asphalt
      offRoadDistance: 200,  // world units between bumps off-road
      roadAmp: 1,            // max bump offset on asphalt (px at max speed)
      offRoadAmp: 3,         // max bump offset off-road (px at max speed)
    },
    steerFrameThresholds: [0.2, 0.5, 0.8], // |steer| needed for turn frames 1..3
    turnShear: 1.5,          // sprite top-row shift per turn frame (px)
    turnSidePx: 2,           // side panel width revealed per turn frame (px)
    spriteBottom: 4,         // gap between car sprite and screen bottom (px)
  },

  drift: {
    minSpeed: 5000,          // speed needed to start a drift
    keepSpeed: 3000,         // drift ends below this speed
    minSteer: 0.5,           // |steer| needed to start a drift
    centrifugalFactor: 0.35, // share of centrifugal push left while drifting
    slide: 1.3,              // inward slide at full angle (normalized x per s at max speed)
    steerFactor: 0.6,        // steering authority while drifting
    baseAngle: 0.45,         // drift angle with neutral steering (0..1)
    startAngle: 0.22,        // angle at the moment the drift starts
    angleRate: 2.5,          // how fast the angle follows steering (1/s)
    drag: 1500,              // speed loss at full angle (units/s^2)
    accelFactor: 0.5,        // share of engine acceleration while drifting
    exitCounterSteer: 0.7,   // counter-steer beyond this ends the drift
    frameAngle: 0.65,        // angle where the second drift frame is used
    frameShear: [7, 9],      // sprite top-row shift for drift frames 1 and 2 (px)
    frameSidePx: [6, 8],     // side panel width for drift frames 1 and 2 (px)
  },

  score: {
    distancePoints: 0.01,    // points per world unit driven
    driftRate: 400,          // drift points per second at full angle and max speed
    driftMinTime: 0.5,       // shorter drifts earn nothing and break no combo
    comboWindow: 3,          // s after a drift in which the next one raises the multiplier
    maxMultiplier: 5,
    goalTimeBonus: 1000,     // points per second left at the goal
    bankMessageTime: 1.5,    // s the banked drift points stay on screen
  },

  passenger: {
    startHearts: 3,          // mood at the start (0..maxHearts)
    maxHearts: 5,
    crashPenalty: 1,         // hearts lost on a crash
    heartBonus: 20000,       // score per heart at the goal
    messageTime: 2.5,        // s a passenger line stays on screen
    taskDelay: 1.5,          // s after a checkpoint before the next task is given
    tiers: [2, 4],           // heart counts where the medium / high ending starts
  },

  title: {
    demoTime: 45,            // s before the attract demo restarts
    panelTime: 6,            // s per title panel (logo / highscores)
    blinkInterval: 0.5,      // s per PRESS ENTER blink phase
  },

  menu: {
    volumeSteps: 10,         // volume settings go 0..volumeSteps
    lineHeight: 13,          // px between menu lines
  },

  highscores: {
    max: 10,
    nameLength: 3,
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .!',
    defaultName: 'AAA',
  },

  autopilot: {
    lookahead: 1500,         // world units ahead used to aim at the road
    steerGain: 3,            // steer per unit of lateral error
    brakeCurve: 4,           // |curve| where the demo car brakes at high speed
    brakeSpeed: 8500,        // speed above which it brakes in sharp curves
    shiftSpeed: 6000,        // switches to HIGH above this speed
    brakeAmount: 0.6,        // brake pressure in sharp curves
  },

  touch: {
    // Buttons in 320×240 buffer pixels; actions fire while a finger is on the button.
    buttons: [
      { id: 'gas', x: 288, y: 198, r: 22, label: 'A', actions: ['accelerate', 'confirm'] },
      { id: 'brake', x: 244, y: 214, r: 16, label: 'B', actions: ['brake', 'back'] },
      { id: 'drift', x: 290, y: 150, r: 16, label: 'X', actions: ['drift'] },
      { id: 'gear', x: 244, y: 170, r: 12, label: 'G', actions: ['gearToggle'] },
      { id: 'pause', x: 226, y: 14, r: 10, label: 'P', actions: ['pause'] },
      { id: 'radio', x: 200, y: 14, r: 10, label: 'R', actions: ['radioNext'] },
    ],
    // Steering pad: horizontal offset from its centre steers, vertical flicks move menus.
    steer: { x: 56, y: 196, radius: 44, deadzone: 0.12, vertical: 0.55 },
    autoFullscreen: true,    // first touch requests fullscreen + landscape lock
    hudSpeedY: 36,           // touch layout: gear / speed block under the score (px)
    hudTachY: 96,            // touch layout: tachometer bottom under the mini-map (px)
  },

  performance: {
    slowFrameMs: 12,         // update+render time that counts as too slow
    minFps: 55,              // measured FPS below this also counts as too slow (browser raster cost)
    window: 2,               // s of slow frames before quality drops one level
    drawDistances: [300, 220, 160], // road draw distance per quality level
  },

  particles: {
    max: 64,                 // pool size
    smokeInterval: 0.03,     // s between smoke puffs per wheel while drifting
    dustInterval: 0.06,      // s between dust puffs off-road
    life: 0.6,               // s a puff lives
    growth: 10,              // px of size gained per second
    startSize: 2,            // px
    riseSpeed: 18,           // px/s upward drift
    spreadSpeed: 40,         // px/s max sideways drift
    dustSpread: 0.5,         // dust spreads this much slower than smoke
    wheelOffsetX: 22,        // px from car centre to each rear wheel
    wheelY: 8,               // px above the screen bottom
  },

  audio: {
    volume: { master: 0.8, music: 0.6, sfx: 0.8, engine: 0.5 }, // channel levels 0..1
    lookahead: 0.15,         // s of notes scheduled ahead of audioCtx.currentTime
    stepsPerBeat: 4,         // song patterns use 16th notes
    resyncGap: 0.5,          // s behind before the sequencer jumps to now (tab switch)
    smoothing: 0.05,         // setTargetAtTime time constant for continuous sounds (s)
    engine: {
      baseFreq: 38,          // Hz at idle
      maxFreq: 150,          // Hz at max rpm
      idleGain: 0.25,        // level at idle (0..1 of the engine channel)
      throttleGain: 0.35,    // extra level at full throttle
      filterIdle: 500,       // lowpass cutoff at idle (Hz)
      filterMax: 2400,       // lowpass cutoff at max rpm and full throttle (Hz)
    },
    skidGain: 0.35,          // tyre screech level while drifting (at full angle)
    offRoadGain: 0.3,        // gravel rumble level off-road at max speed
    radioMessageTime: 2,     // s the song name stays on screen
  },

  hud: {
    kmhPerUnit: 293 / 12000, // speed → km/h display factor
    margin: 8,
    speedScale: 2,           // speed digits pixel scale
    tachCells: 16,
    tachCellW: 3,
    tachCellGap: 1,
    tachCellH: 8,
    tachYellow: 0.7,         // rpm fraction where tach turns yellow
    tachRed: 0.9,            // rpm fraction where tach turns red
    timeScale: 2,            // countdown digits pixel scale
    mapNodeGap: 10,          // mini-map horizontal spacing between nodes (px)
    mapRowGap: 8,            // mini-map vertical spacing between stages (px)
    blinkInterval: 0.25,     // s per blink phase (low time, current map node)
    colors: {
      text: '#ffffff',
      warn: '#ff3b3b',
      mapLine: '#6a6a7a',
      mapRoute: '#ffd23f',
      mapNode: '#b0b0c0',
      mapCurrent: '#ff4fa0',
      mapGoal: '#3ce05a',
      panel: '#0c0818',
      logoA: '#ff4fa0',
      logoB: '#3ae0ff',
      select: '#ffd23f',
      heartFull: '#ff4f7a',
      heartEmpty: '#5a3040',
      bubble: '#fff4f8',
      shadow: '#000000',
      label: '#ffd23f',
      dim: '#6a6a7a',
      tachGreen: '#3ce05a',
      tachYellow: '#ffd23f',
      tachRed: '#ff3b3b',
      tachOff: '#2a2a3a',
    },
  },

  debug: {
    refreshInterval: 0.25,   // overlay text refresh period (s)
    x: 4,
    y: 40,
    lineHeight: 9,
    textColor: '#ffffff',
    shadowColor: '#000000',
  },
};

export const SEGMENT_LENGTH = CONFIG.road.segmentLength;
export const ROAD_WIDTH = CONFIG.road.roadWidth;
