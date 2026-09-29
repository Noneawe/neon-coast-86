# CHANGELOG – NEON COAST '86

## [License] 2026-09-29 – GNU AGPL-3.0

### Added
- `LICENSE`: the official GNU Affero General Public License v3.0 text (from gnu.org);
  Copyright (C) 2026 Noneawe, licensed AGPL-3.0-or-later.
- In game: "(C) 2026 NONEAWE - AGPL-3.0" on the title screen and a new ABOUT menu screen with the copyright,
  a short licence summary and the source code address; ENTER / A opens the repository in a new tab
  (AGPL section 13: players can get the source of the version they play).
- Copyright and licence notice in `index.html` (so it is also in the single-file build), the README
  (badge + License section) and `CLAUDE.md`.
- 1 new test – 122 in total (licence text, notices, ABOUT texts fit the screen).

## [Docs] 2026-09-29 – English documentation and GitHub page

### Added
- `README.md` with screenshots (`docs/screenshots/`, used only by the README – the game never loads them).
- `.gitignore` (secrets in `.env`, generated `dist/`).

### Changed
- `CLAUDE.md` (AGENTS.md) and this changelog translated to English; documentation is now written in English
  (§6), reports to the user follow the user's language (§16).

## [Stage 9 – add-on] 2026-09-29 – controls help and custom key bindings

### Added
- CONTROLS screen (menu → CONTROLS): table of actions with two keys each and the gamepad button; ENTER on a
  slot waits for a new key (ESC cancels, DEL clears), a key given to a new action is removed from the old
  one, RESET TO DEFAULTS; changes are saved at once in `localStorage` and work in game without a restart.
- HOW TO PLAY screen (menu → HOW TO PLAY): 4 pages – the race, driving, drift and score, passenger mode.
- Fixed menu keys (arrows, Enter, Esc, Backspace) – menus keep working after the driving keys are rebound;
  new actions `menuLeft` / `menuRight`.
- 6 new tests – 121 in total (including the flow menu → CONTROLS → new key → throttle in a race).

### Changed
- `KEY_BINDINGS` replaced by `FIXED_KEYS` + `DEFAULT_KEYS` / `REBINDABLE`; `input.setBindings()`,
  `input.captureKey()`; settings have a `keys` field.

### Known issues
- Gamepad and touch buttons cannot be rebound (keyboard only).
- Numbers in the help texts (e.g. "3 SECONDS" of the combo window) are not taken from `CONFIG` – when the
  tuning changes, the text has to be updated by hand.

## [Stage 10] 2026-09-29 – optimisation, mobile, cleanup

### Added
- Touch controls: buttons A (throttle / confirm), B (brake / back), X (drift), G (gear), P (pause),
  R (radio) and an analog steering pad (vertical = menus); works in every game state like one more gamepad,
  several fingers at once; drawn in the 320×240 buffer (pixel art, cached).
- Touch HUD layout: speed and gear under the score, tachometer under the mini-map – thumbs cover nothing.
- Fullscreen: first touch (with landscape lock) or the F key / Back on a gamepad.
- Phone held upright: "TURN YOUR PHONE SIDEWAYS" message and an automatic race pause.
- Adaptive quality: after a lasting FPS drop / long frames the road draw distance goes 300 → 220 → 160.
- `?test=1` – the looping test track in game (performance measurements).
- Mobile viewport meta and CSS (no zoom, scrolling or text selection).
- Guard tests: every export in `src` must be used, every `CONFIG` key must be used, no `console.log` /
  `var`, every file starts with a comment. 7 new tests – 115 in total.

### Changed
- Tuning numbers moved to `CONFIG`: autopilot brake pressure, drift start angle, fork sign position,
  lost-branch threshold and traffic spacing jitter, dust spread.
- `createInput(target, getPads, touch)` accepts the touch state.

### Fixed
- Dead code removed: `setMuted`, `isDebugEnabled`, `percentRemaining`, `isFullscreen`; 6 exports used only
  inside their module made private; the test track is wired to `?test=1` instead of existing for tests only.

### Known issues (end-of-project list)
- Performance on real phones is unmeasured – Chrome emulation only (844×390, DPR 3): 60 FPS at 4× CPU
  slowdown on a normal route, 58 FPS on the dense test track; at 6× CPU about 47 FPS despite lower quality
  (cost of canvas scaling in the browser).
- Small garbage collections about every 2 s (game code allocates about 13 KB/s, mostly car lists of new
  segments and numbers passed to Canvas); no frame hitches in the measurements.
- Traffic cars between the camera and the player are drawn under the player's sprite.
- No smoke/particles on a crash; no uphill / downhill car frames.
- A gamepad does not unlock audio (browsers require keyboard, mouse or touch).
- Saving scores from `file://` is sometimes blocked (e.g. Firefox) – scores then last until the tab closes.
- The score table does not show the route (only a P mark for passenger mode).
- Balance (drift, times, passenger task difficulty, volumes) needs tuning after tests with players.
- UI element positions (panels, texts) live in the screen code, not in `CONFIG` – layout, not tuning.

## [Stage 9] 2026-09-29 – menus, screens, pause, highscores

### Added
- Full state flow: boot → title → menu → race ⇄ pause → goal | gameOver → nameEntry → title.
- Title screen with attract mode: a demo race driven by an autopilot (`src/game/autopilot.js` – aims at the
  road, picks a random branch, brakes in sharp curves, shifts to HIGH), logo and score table alternating,
  PRESS ENTER.
- Menu (`src/state/menu.js`): START, mode NORMAL/PASSENGER, radio with preview, music / effects / engine
  volume 0–100%; changes are saved and applied at once. Keyboard and gamepad (D-pad, stick, A/B).
- Pause (Esc / P / Start) at any moment of a race, also automatically when the tab is hidden; RESUME /
  RESTART / QUIT TO TITLE; resuming resets nothing.
- Highscores: top 10 in `localStorage` (`src/storage.js`) – survive a refresh; broken data is repaired,
  in-memory fallback when storage is blocked (message on the entry screen); arcade-style 3-letter entry.
- Shared UI drawing (`src/render/ui.js`): logo, panels, lists, score table, pause dimming.
- Actions `up` / `down` (menus): arrows / W S, D-pad, vertical stick axis.
- 7 new tests – 108 in total (including the full state flow and scores surviving a "reload").

### Changed
- `createInput()` split into small functions (previously 117 lines).
- The game starts on the title screen; `?section=` still starts a race immediately.
- Result screens lead to name entry or to the title instead of a restart.

### Known issues
- The score table shows no route except the P mark (passenger mode).
- With `file://` some browsers block saving – scores last until the tab closes.

## [Stage 8] 2026-09-29 – "Passenger" mode

### Added
- "Passenger" mode (`?passenger=1`, `src/game/passenger.js`): on every section the passenger gives a task,
  drawn (seeded) only from the tasks that fit the section data – curviness, longest straight, traffic
  density, theme.
- 7 task types as data (`src/data/tasks.js`) with values growing by stage: fast driving, enjoying the view
  (slow, but not standing still), drift, drift combo, overtaking, no bumps, stay off the shoulder.
- Mood of 0–5 hearts (start 3): task done +1, missed −1, crash −1; "guard" tasks are won when they survive
  the section, goal tasks are lost when the goal isn't reached by the checkpoint.
- HUD: hearts under the mini-map, a speech line with the task or the passenger's reaction, progress bar.
- Mood-dependent ending: 3 variants for each of the 5 goals and for TIME UP; 20000 points per heart.
- Overtake counting (`countOvertakes`), task sounds (start, success, failure).
- 7 new tests – 101 in total (including: passenger mode changes neither driving nor scoring).

### Changed
- `parseParams()` returns `passenger`; `Vehicle` has an `ahead` field.

### Known issues
- The mode is enabled only by a URL parameter until the menu exists (stage 9).
- The passenger has no portrait or animation – text and hearts only.

## [Stage 7] 2026-09-29 – sound and music

### Added
- `src/audio/mixer.js`: one `AudioContext` created on the first key/click/touch, channels
  `music`/`sfx`/`engine` with separate volumes (`CONFIG.audio.volume`), `?mute=1`, suspended while the
  tab is hidden; everything in `try/catch` – missing audio never blocks the game.
- `src/audio/synth.js`: instruments from data (oscillators, noise, ADSR envelope, filter, pitch drop for
  drums, second detuned oscillator); a note's nodes are disconnected when it ends.
- `src/audio/sequencer.js`: sequencer with lookahead scheduling (`currentTime` + 0.15 s) called every
  frame, resynchronisation after a pause.
- `src/audio/songs.js`: 3 original songs – "Coastline Drive" (126 BPM, A minor), "Neon Mirage" (112 BPM,
  E minor), "Midnight Pines" (96 BPM, D major): melody, arpeggio, bass, 3-voice pad, kick, snare, hi-hat;
  3 sound sets.
- `src/audio/sfx.js`: 12 one-shot effects (start, gear shift, bump, side swipe, crash, checkpoint, time
  warning, TIME UP, goal, drift banked/lost, radio) and continuous sounds – engine (2 oscillators + filter,
  `setTargetAtTime`), tyre screech while drifting, gravel on the shoulder.
- Radio: R / RB switches the song, name on screen; debug overlay – audio state, song and step.
- 8 new audio tests – 94 in total.

### Changed
- The game loop has an `onVisible` hook (audio resume).

### Known issues
- No volume settings in a menu yet (stage 9) – only `CONFIG.audio.volume`.
- Whether the songs sound musical needs a listening check.

## [Stage 6] 2026-09-29 – drift and scoring

### Added
- Drift (Space / X + steering, from 5000 u/s): centrifugal force drops to 35%, but the tail pulls the car
  towards the inside of the curve in proportion to the angle; steering into the drift opens the angle,
  counter-steering closes it; drifting costs speed. Exit: releasing the button, strong counter-steer or
  losing speed (clean); shoulder, collision or crash (failed). Lets you take a curve of 6 without braking,
  needs counter-steering on a straight.
- Drift frames (2 per side, generated from the car data) and smoke from the rear wheels; dust on the
  shoulder – pool of 64 particles (`src/world/particles.js`, `src/render/particles.js`), `smoke`/`dust`
  colours from the theme palette.
- Scoring (`src/game/score.js`): points for distance, drift points counted during the drift and banked
  only after a clean exit × multiplier (grows to ×5 with drifts chained within 3 s); a failed drift loses
  them and resets the multiplier; drifts shorter than 0.5 s earn nothing; bonus for time left at the goal.
- HUD: SCORE and multiplier, running drift counter above the car, "+points" when banked, "DRIFT LOST".
- Goal and game-over screens show the score and time bonus; debug overlay – drift state and particle count.
- 11 new tests – 86 in total.

### Changed
- Theme palette: +2 roles (`smoke`, `dust`) – 58 in total.
- `drawRaceHud()` takes the score and player state.

### Known issues
- Drift balance (angle, slide, drag) needs manual tuning in `CONFIG.drift`.

## [Stage 5] 2026-09-29 – route structure, forks, time, checkpoints

### Added
- 15 sections in a pyramid A1 → E1..E5 (`src/data/sections.js`) with original names, 3 themes, harder curves
  and denser traffic further on; 5 goals (`src/data/goals.js`); UI texts in `src/data/text.js`.
- Linear route built while driving: after the decision at a fork the chosen section is appended.
- Fork: the road widens → splits into two carriageways drifting apart; signs before the fork and on the
  median; decision by `player.x` at the end of the widening. Road centres live in the world
  (`p.world.x`), so the transition never moves the camera; the unchosen branch leaves the screen and ends.
- Time: countdown from the start section's `timeBonus`, a checkpoint (gate) at the start of every following
  section adds its `timeBonus`, CHECKPOINT / EXTENDED TIME message, blinking when time runs low.
- TIME UP → the car coasts, GAME OVER screen after 3 s; goal (GOAL gate) → the car slows down, goal screen
  after 3 s with the destination, route and time; ENTER starts a new race (minimal screens, full ones in
  stage 9).
- HUD: TIME, STAGE and section name, pre-rendered pyramid mini-map with the driven route, blinking current
  section and progress.
- Traffic on a linear route: cars are added out of sight ahead of the player and removed behind; at a fork
  every car picks a branch, cars on the abandoned branch disappear.
- `?section=ID` starts at any section; `?god=1` also stops the clock.
- Sprites: fork sign, CHECKPOINT gate, GOAL gate.
- 14 new tests (data validation from §8.3, fork geometry, 16 routes to 5 goals, checkpoints, TIME UP, god,
  start with `?section`, driving through a fork with traffic) – 75 in total.

### Changed
- `track.js`: `createTrack` + `appendSection` + `applyForkDecision`; segments have `section`, `alt` (second
  carriageway), road centre in `p1/p2.world.x`; `findSegment` clamps on a linear route.
- Roadside sprites store an absolute `x` instead of an `offset` from the centre.
- Shoulder, lateral limit and crash recovery are relative to the nearest carriageway.
- Vehicles: `laneX` relative to their carriageway + `side` (branch); `spawnTraffic(traffic, track, rng, z, maxZ)`.
- Debug overlay moved lower (under the HUD), shows route, time and FORK.

### Known issues
- The goal and game-over screens are temporary (stage 9).
- The whole driven route stays in memory (about 11 000 segments – within budget).
- The test track from stage 3 is now used only by the tests.

## [Stage 4] 2026-09-29 – traffic and collisions

### Added
- 4 vehicle types (sedan, coupe, van, truck) as ASCII data with 3 colour variants from the theme palette
  and side-view frames depending on the position on screen (`src/gfx/vehicle-sprites.js`,
  `src/data/vehicles.js`).
- Traffic AI (`src/world/traffic.js`, `Vehicle` class from a pool of 48 cars): lane driving, speed-dependent
  gap, braking for obstacles, lane change when the lane is free (the target lanes of other cars are
  checked too), hard constraint – a car never ends a step overlapping an obstacle. The player is an
  obstacle for the AI.
- Traffic spawning per section from `traffic {density, types}`, deterministic for a seed, clear zone at
  the start.
- Player collisions (`src/world/collision.js`): rear-ending (bounce and speed matching, or a crash at a
  large speed difference), side swipe (push away), roadside objects with `collide` (stop with a nudge
  towards the road, or a crash), swept test – a fast car never passes through a post.
- Crash: flip in place with a hop → back onto the road → 1.5 s of protection (blinking), then normal driving.
- `?god=1` disables collisions.
- Debug overlay: cars on screen, car state (OK/TUMBLE/RECOVER/GRACE), last collision, GOD.
- 12 new palette roles for vehicles (56 in total); 17 new tests – 61 in total.

### Changed
- `drawRoadsideSprites()` also draws cars (in the same far-to-near order) and returns counters.
- `drawPlayerCar(ctx, player)` takes the player object (crash frames, blinking).
- `buildTurnFrame()` has optional shear, side-panel width and side-character parameters.
- Roadside sprites have a `collide` field; segments have a `cars` list.

### Known issues
- Traffic cars between the camera and the player are drawn under the player's sprite.
- Traffic loops with the test track; spawning ahead of the player on a linear route is stage 5.
- No collision sounds (stage 7) and no smoke on a crash.

## [Stage 3] 2026-09-29 – visuals: sky, parallax, sprites, themes

### Added
- 3 themes (`coastDay`, `desertNoon`, `pineDusk`), each with a palette of 44 named colour roles.
- Sky from colour bands dithered with a 4×4 Bayer matrix, sun (striped in the dusk theme), cached per
  theme in offscreen canvases (`src/render/sky.js`).
- 3 parallax layers per theme generated procedurally from a seed: clouds, mountains, hills, mesas, forest
  (`src/gfx/backgrounds.js`); offset follows road curvature and speed.
- 9 roadside sprites as ASCII data with palette roles: palm, pine, cactus, bush, rock, 2 curve signs, a
  "NEON 86" billboard, a post (`src/gfx/world-sprites.js`); cached per theme with LOD 1, 1/2, 1/4.
- Second sprite pass from farthest to nearest, clipped at the segment's `clip` – objects hide behind hills
  (`projectSprite()` as a pure function).
- Smooth theme transitions: a 120-segment zone at the start of a section, road colours blended in 8 steps
  (cached strings, no per-frame allocation), background cross-faded with `globalAlpha`.
- Test track of 3 sections (one per theme); the desert section has dense sprites for performance tests.
- Debug overlay: sprites drawn, theme and transition progress.
- 10 new tests (themes, palettes, dithering, background, sprites, transitions, clipping) – 44 in total.

### Changed
- `buildTrack()` accepts a list of sections and options `{ loop, spriteDefs }`; a segment has `theme`,
  `themeFrom`, `blend`, `colors`.
- `renderRoad(ctx, track, view)` takes colours from the segment and records `roadStats` for the sprite pass.
- `themes.js` format changed to a role palette – described in AGENTS.md §8.4.

### Known issues
- No distance fog.
- Sprites have no collisions yet (stage 4) – the car drives through them.
- On a short section (< 120 segments) the theme transition lasts the whole section.

## [Stage 2] 2026-09-29 – player car, physics, HUD, gamepad

### Added
- Player physics `src/world/player.js`: LOW/HIGH gearbox (LOW – strong acceleration, top speed 176 km/h;
  HIGH – weak launch, top speed 293 km/h), brake, coasting, slower uphill, centrifugal force in curves
  (needs counter-steering, sharp curves need lifting off), strong braking on the shoulder, a downshift bleeds
  speed, bouncing on bumps (seeded RNG).
- Player car: original red 64×30 px convertible defined as ASCII (`src/gfx/player-car.js`), generator of
  3 turn frames per side (`src/gfx/car-frames.js`), cached in an offscreen canvas.
- HUD (`src/render/hud.js`): speed in km/h (2× digits), LOW/HIGH indicator, segmented tachometer; outlined text.
- Gamepad (standard mapping): A/RT throttle (RT analog), B/LT brake, left stick (dead zone, analog steering)
  and D-pad, X drift, Y/LB gear, RB radio, Start pause; connecting and disconnecting during play.
- `drawNumber()` in the font – drawing numbers without allocating strings.
- Debug overlay: gear, revs, km/h, OFFROAD, steering value, pad name.
- 13 new tests (physics, gamepad, sprites) – 35 in total.

### Changed
- The camera follows the player; `CONFIG.camera.height` 1000 → 1600 (car-to-road proportions).
- Camera test drive removed (`src/world/camera.js`, `CONFIG.testDrive`).
- Boot creates the RNG from `?seed=` or a random seed.

### Known issues
- No drift frames and smoke (stage 6), no uphill/downhill frames.
- The gamepad was tested only with an emulated `navigator.getGamepads` in headless Chrome.

## [Stage 1] 2026-09-29 – pseudo-3D road engine (project started from scratch)

### Added
- Project skeleton: `index.html`, `src/main.js`, `src/config.js` (CONFIG with every parameter).
- Game loop with a 1/60 s fixed timestep, at most 5 steps per frame, backlog dropping, simulation stopped
  while the tab is hidden (`src/engine/loop.js`).
- Keyboard → action mapping from the controls table (`src/engine/input.js`).
- Seedable mulberry32 RNG, URL parameter parser, `debugLog()` active with `?debug=1`.
- Building segments from section data in the `{len, curve, hill}` format with ease-in / hold / ease-out for
  curvature and height (`src/world/track.js`).
- Pseudo-3D road renderer rasterising whole-pixel scanlines: curve accumulation, hills hide the road behind
  them (every row painted once), striped shoulders, lane markers with LOD against flicker
  (`src/render/road.js`).
- 320×240 screen scaled by an integer factor in device pixels, letterbox.
- 5×7 bitmap font with an atlas in an offscreen canvas (`src/render/font.js`).
- Debug overlay (F1 / `?debug=1`): FPS, frame time, state, segment, position, speed, curve.
- State machine (`setState`) with `boot` and `race` states (camera test drive: ↑/↓ speed, ←/→ shift).
- Looping test track `src/data/test-track.js` and a minimal `coastDay` theme in `src/data/themes.js`.
- `tools/build.mjs` – bundler into one file `dist/neon-coast.html` (each module in its own scope, syntax
  check, 1 MB limit).
- `tools/test.mjs` – 22 logic tests (math, projection, RNG, loop, input, track, road rasterisation).

### Known issues
- No background beyond the road (flat sky, no fog or parallax) – stage 3 scope.
- The camera test drive has no centrifugal force – player physics is stage 2.
- Smoothness and absence of flicker checked only in headless Chrome; needs a live check.
