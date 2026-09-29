# AGENTS.md – NEON COAST '86

Instructions for AI agents (and humans) working on this repository.
Read the WHOLE file before your first code change. If something here
contradicts the user's request, do what the user asks, but point out the
contradiction in your report.

---

## 1. About the project

**NEON COAST '86** (working title) is a browser-based pseudo-3D arcade
racer in 1980s pixel-art style. The gameplay is inspired by classic
"coast to coast" arcade racers:

- 5 stages, each ending in a road fork (left/right)
- 15 sections arranged as a pyramid, 5 different goals
- time limit with checkpoints
- traffic, collisions, crashes
- drifting as the core driving technique
- "Passenger" mode with a task on every stage
- radio with 3 original tracks

Goal: a playable, smooth (60 FPS) game that runs offline, has no external
dependencies and is tuned by editing data, not logic.

---

## 2. Ground rules (never break them)

1. **Original content only.** No names, logos, characters, cars, music or
   graphics from existing games or brands. Do not use the names
   "OutRun", "Sega", "Ferrari", "Testarossa" or similar in code, UI text,
   comments or file names. The player's car is an original red 80s
   convertible.
2. **Zero runtime dependencies.** Plain JavaScript (ES2020+), Canvas 2D,
   Web Audio API. No frameworks, libraries, CDNs or web fonts.
3. **Zero external game assets.** Graphics and sound are generated in code
   (procedurally or from data in `.js` files). Do not add PNG, MP3, WAV or
   TTF files to the game. The only exception is documentation: README
   screenshots in `docs/screenshots/`, which the game never loads.
4. **Don't break what works.** Every change must keep the features of the
   completed stages (see section 3). A regression = unfinished task.
5. **No placeholder shortcuts.** Never leave `// ...rest unchanged`,
   `// TODO: implement` in place of existing logic, or empty functions
   pretending to be finished.
6. **Parameters in CONFIG.** Every tunable number (speeds, forces, times,
   traffic density, volumes) lives in `src/config.js`. No magic numbers in
   game logic.

---

## 3. Stage status

Update this list when a stage is finished (`[ ]` → `[x]`) and add the date.
Do not mark a stage as finished until it meets the criteria in section 14.

- [ ] Stage 1 – pseudo-3D road engine (code done 2026-09-29, awaiting a manual smoothness check)
- [ ] Stage 2 – player car, physics, HUD, gamepad (code done 2026-09-29, awaiting a manual handling and gamepad check)
- [ ] Stage 3 – visuals: sky, parallax, sprites, themes (code done 2026-09-29, awaiting verification)
- [ ] Stage 4 – traffic and collisions (code done 2026-09-29, awaiting verification)
- [ ] Stage 5 – route structure, forks, time, checkpoints (code done 2026-09-29, awaiting verification)
- [ ] Stage 6 – drift and scoring (code done 2026-09-29, awaiting balance check)
- [ ] Stage 7 – sound and music (code done 2026-09-29, awaiting a listening check)
- [ ] Stage 8 – "Passenger" mode (code done 2026-09-29, awaiting verification)
- [ ] Stage 9 – menus, screens, pause, highscores (code done 2026-09-29, awaiting verification)
- [ ] Stage 10 – optimisation, mobile, cleanup (code done 2026-09-29, awaiting a test on a real phone)

**Work only on the stage the user asks for.** Do not implement features
from later stages "while you're at it". If something from a future stage
needs preparation now, add a minimal hook and describe it in the report.

---

## 4. Running, building, testing

Requirements: any modern browser, Node.js 18+ (only for the build and the
tests, no npm packages).

```bash
# Development mode (ES modules need an HTTP server)
python3 -m http.server 8080
# then: http://localhost:8080/index.html

# Single-file build (all modules inlined)
node tools/build.mjs
# output: dist/neon-coast.html – works when opened from disk (file://)

# Logic tests (no framework, node:assert only)
node tools/test.mjs
```

Do not add a `package.json` with dependencies. If you need a tool, write
it in `tools/` using only built-in Node modules.

### URL parameters (debug)

| Parameter | Effect |
|---|---|
| `?debug=1` | debug overlay (FPS, frame time, segment, position, speed) |
| `?section=C2` | start at the given section (straight into a race, no title screen) |
| `?seed=1234` | fixed RNG seed (repeatable traffic and tasks) |
| `?mute=1` | mute audio |
| `?god=1` | no collisions and infinite time |
| `?passenger=1` | "Passenger" mode for a quick start with `?section=` (chosen in the menu in normal play) |
| `?test=1` | looping test track (3 themes, dense sprites) – for performance measurements |

**F1** toggles the debug overlay during play. When you add features, add
the matching information to the overlay if it helps testing.

---

## 5. Directory layout

```
/
├── AGENTS.md            ← this file (CLAUDE.md)
├── CHANGELOG.md         ← change history
├── README.md            ← project page
├── index.html           ← development entry point
├── docs/screenshots/    ← README images only (never loaded by the game)
├── src/
│   ├── main.js          ← bootstrap, game loop
│   ├── config.js        ← CONFIG: every tunable parameter
│   ├── state/           ← game state machine (title, menu, race, pause, goal…)
│   ├── engine/
│   │   ├── loop.js      ← fixed timestep
│   │   ├── input.js     ← keyboard, gamepad, touch → actions
│   │   ├── rng.js       ← seedable RNG (mulberry32)
│   │   └── math.js      ← interpolation, easing, clamp, projection
│   ├── render/
│   │   ├── screen.js    ← 320×240 canvas, scaling, fullscreen
│   │   ├── road.js      ← pseudo-3D road drawing
│   │   ├── sky.js       ← sky, sun, parallax
│   │   ├── sprites.js   ← sprite drawing and scaling
│   │   ├── hud.js       ← HUD and mini-map
│   │   └── font.js      ← bitmap pixel font
│   ├── gfx/             ← pixel-art definitions (data) and sprite generators
│   ├── world/
│   │   ├── track.js     ← building segments from section data
│   │   ├── player.js    ← player physics, gearbox, drift
│   │   ├── traffic.js   ← traffic AI
│   │   └── collision.js
│   ├── game/
│   │   ├── race.js      ← time, checkpoints, forks, goal
│   │   ├── score.js     ← scoring
│   │   └── passenger.js ← "Passenger" mode
│   ├── audio/
│   │   ├── mixer.js     ← AudioContext, channels, volumes
│   │   ├── synth.js     ← instruments (oscillators, noise, envelopes)
│   │   ├── sequencer.js ← song playback
│   │   ├── songs.js     ← data of the 3 songs
│   │   └── sfx.js       ← sound effects and engine sound
│   ├── data/
│   │   ├── sections.js  ← 15 sections (route data)
│   │   ├── themes.js    ← theme palettes and sprite sets
│   │   └── text.js      ← all UI text
│   └── storage.js       ← localStorage (highscores, settings)
├── tools/
│   ├── build.mjs
│   └── test.mjs
└── dist/                ← build output (never edit by hand, not committed)
```

Rules:
- One module = one responsibility. `render/` modules never change game
  state; `world/` and `game/` modules never draw.
- Do not create new top-level directories without a justification in the
  report.
- `dist/` is generated. Never fix bugs directly in it.

---

## 6. Code conventions

- ES modules, `const`/`let`, no `var`. No classes where plain objects and
  functions do; classes are fine for entities with a life cycle (e.g.
  traffic vehicles).
- Identifiers, code comments and documentation (`AGENTS.md`/`CLAUDE.md`,
  `CHANGELOG.md`, `README.md`) are **in English**. Reports to the user are
  written in the language the user writes in.
- Naming: `camelCase` for variables and functions, `PascalCase` for
  classes, `UPPER_SNAKE_CASE` for constants, files `kebab-case.js` or a
  single word.
- Every file starts with a 1–3 sentence comment: what the module does.
- Exported functions have a short JSDoc comment with parameter types.
- Function length: aim for < 60 lines. Split longer ones.
- No allocations in the hot loop (render, update): do not create objects,
  arrays or closures every frame. Use object pools and buffers created
  once.
- No `console.log` in production code. For diagnostics use the debug
  overlay or `debugLog()`, which is active only with `?debug=1`.
- Errors must never crash the game loop. Handle exceptions in audio and
  storage (browsers may block both).

---

## 7. Engine architecture

### 7.1 Game loop

- Fixed timestep: `DT = 1/60 s`, time accumulator, at most 5 update steps
  per frame (protection against the "spiral of death" after a tab switch).
- `update(dt)` changes state, `render(alpha)` only draws. Interpolating the
  camera position with `alpha` is optional but recommended.
- Stop the simulation when the tab loses visibility (`visibilitychange`)
  and pause automatically during a race.

### 7.2 State machine

States: `boot → title → menu → race ⇄ pause → goal | gameOver → nameEntry → title`;
the menu also opens `controls` (key bindings) and `help` (instructions),
both returning to `menu`.
Each state exports `enter()`, `exit()`, `update(dt)`, `render()`.
Transitions only through `setState(name, params)`. No flags like
`isPaused` scattered around the code.

### 7.3 Coordinate system

- `z` – distance along the road in world units, grows forward.
- `SEGMENT_LENGTH = 200`, `ROAD_WIDTH = 2000` (half the road width in
  world units).
- The lateral position `x` of the player and objects is **normalised**:
  `-1` = left road edge, `0` = centre, `+1` = right edge.
  `|x| > 1` means driving off the road.
- `y` – terrain height, accumulated from the segments' `hill` values.
- Camera: height and depth (FOV) in `CONFIG.camera`.

### 7.4 Pseudo-3D road

- The road is an array of segments, each with `curve`, `y` (height),
  colours and a sprite list.
- Drawn from the camera outwards (`drawDistance` segments), accumulating
  the curve offset (`dx`, `x`), clipping by `maxY` so hills hide the road
  behind them.
- Sprites and vehicles are drawn in a second pass **from farthest to
  nearest**, clipped at the segment's `clipY` line.
- Colours alternate every `CONFIG.road.rumbleLength` segments.
- A looping track is not needed in the main mode (sections are linear),
  but the stage-1 test mode may use a loop.

### 7.5 Forks

- A fork is a special section ending: the road visibly splits into two
  carriageways drifting apart, with a direction sign before the split.
- The choice is decided by `player.x` at the decision point
  (`x < 0` = left). After the decision the other branch's segments leave
  the screen smoothly; never teleport.
- The transition between sections must have no gaps in the road and no
  camera jump.

---

## 8. Route data

Sections are defined only as data in `src/data/sections.js`.
Logic must not contain conditions that depend on a specific section ID.

### 8.1 Identifiers (pyramid)

```
Stage 1:            A1
Stage 2:          B1  B2
Stage 3:        C1  C2  C3
Stage 4:      D1  D2  D3  D4
Stage 5:    E1  E2  E3  E4  E5     ← each E ends with its own goal
```

From the section with index `i` on stage `n` the road leads to indices `i`
(left) and `i+1` (right) on stage `n+1`.

### 8.2 Section format

```js
{
  id: 'C2',
  name: 'Canyon Road',          // UI text, original name
  theme: 'desertNoon',          // key from themes.js
  timeBonus: 55,                // seconds added at the checkpoint
  traffic: { density: 0.6, types: ['sedan', 'truck'] },
  segments: [
    // len: number of segments, curve: -6..6, hill: height change
    { len: 50,  curve: 0,  hill: 0 },
    { len: 100, curve: 3,  hill: 20 },
    { len: 80,  curve: -4, hill: -20 },
  ],
  sprites: [
    // procedural or manual placement
    { every: 20, from: 0, to: 400, sprite: 'cactus', side: 'both', offset: 1.4 },
    { at: 250, sprite: 'signCurveLeft', side: 'right', offset: 1.2 },
  ],
  forkSprites: [{ every: 14, sprite: 'palm', offset: 1.6 }], // decoration outside the branches
  next: { left: 'D2', right: 'D3' }, // for E*: next: null, goal: 'goalCanyon'
}
```

- Starting time = `timeBonus` of the start section; every following
  section adds its `timeBonus` at the checkpoint (a gate on its first
  segment).
- The last `CONFIG.fork.widenLength + splitLength` segments of a section
  with `next` form the fork: the last data part must have at least that
  many segments and `curve: 0`; `sprites` rules must not reach into it.
  The decision point is the end of the widening (player `x` relative to
  the section centre: `< 0` = left).
- Goals (`goal`) are defined in `src/data/goals.js`; a straight run-out of
  `CONFIG.track.goalRunout` segments is appended after the goal line.
- UI texts live in `src/data/text.js`.

### 8.2a Chaining sections and themes on segments

`buildTrack(section | [sections], { loop, spriteDefs })` joins sections
into one segment array. Every segment gets `theme` (the section theme),
and the first `CONFIG.theme.transitionSegments` segments of a new section
get `themeFrom` and `blend` (0..1), from which the transitional road
colours and the background cross-fade are computed. Sprite rules
(`every/from/to` or `at`) use segment indices **local to the section**;
`side: 'left' | 'right' | 'both'`, `offset` > 1 (off the carriageway).

### 8.3 Data validation

`tools/test.mjs` must check at least:
- there are exactly 15 sections with valid IDs,
- every `next` points to an existing section following the pyramid,
- every section is reachable from `A1`,
- every `E*` section has a goal and no other section has one,
- every `theme` and `sprite` exists in the definitions,
- every theme has a full role palette (32–64 colours) and sprites use only
  known roles,
- `traffic.types` point to existing vehicle types, `density` in 0..1,
- section lengths are within `CONFIG.track.minLen..maxLen`,
- all 16 choice combinations end at the right goal.

### 8.4 Theme format (`src/data/themes.js`)

```js
coastDay: {
  name: 'Coast Day',
  palette: { sky0: '#2a6fdb', /* … every role from THEME_ROLES … */ },
  sky: { bands: ['sky0', 'sky1', 'sky2', 'sky3', 'sky4'],   // top to horizon
         sun: { x: 0.2, y: 26, r: 10, stripes: false } },  // x as 0..1 of the width
  layers: [ // parallax, slot 0 = farthest (speeds in CONFIG.sky.layerSpeeds)
    { slot: 0, type: 'clouds', main: 'cloud', shade: 'cloudShade',
      height: 40, bottom: 50, seed: 11, count: 7 },
    { slot: 1, type: 'mountains' | 'hills' | 'mesas' | 'forest', … },
  ],
}
```

- The palette maps **role → colour**; every theme defines exactly the
  roles in `THEME_ROLES` (currently 58, 32–64 allowed). The road, the
  background and roadside sprites take colours only from palette roles.
- Roadside sprites (`src/gfx/world-sprites.js`) are ASCII rows; character
  → role via `SPRITE_CHAR_ROLES`, `worldWidth` in world units. A sprite
  stands on its bottom row (no empty rows at the top or bottom).
- A new role must be added to `THEME_ROLES` and to **every** theme.
- Traffic vehicles (`src/gfx/vehicle-sprites.js`) use the roles in
  `VEHICLE_CHAR_ROLES`; characters `B`/`b` are the body colour of the
  variant (`VEHICLE_VARIANTS`: carA/carB/carC).

### 8.5 Vehicle types (`src/data/vehicles.js`)

```js
sedan: { sprite: 'sedan', worldWidth: 600, length: 900, speedMin: 4500, speedMax: 6500 },
```

`traffic.types` in a section are keys of `VEHICLE_TYPES`; `density` 0..1
(number of cars = `density * length / CONFIG.traffic.segmentsPerCar`).
A roadside sprite with `collide > 0` is an obstacle (solid width =
`worldWidth * collide`); `collide: 0` = passable (e.g. a bush).

### 8.6 Passenger tasks (`src/data/tasks.js`)

```js
speed: {
  text: 'FLOOR IT! {target} S OVER {kmh} KM/H',  // {target} {kmh} {limit} from the stage values
  measure: 'timeAbove',          // generic check in game/passenger.js
  target: [6, 7, 8, 9, 10],      // values for stages 1..5
  kmh: [200, 210, 220, 230, 240],
  fits: { minStraight: 150 },    // minCurviness / minStraight / minDensity / themes
},
```

- Matching is computed from the section data (`sectionStats`): mean
  |curve|, longest straight, traffic density, theme. Every section must
  have ≥ 3 fitting tasks.
- Hearts 0–5 (start 3): task done +1, missed −1, crash −1.
  Ending = `GOALS[goal].endings[tier]` (tier by `CONFIG.passenger.tiers`).
- Passenger mode must not change driving or scoring except for the goal
  bonus (tested).

---

## 9. Graphics and pixel art

- Render buffer: **320×240**. Scaled to the window by an integer factor
  when possible, with `image-rendering: pixelated` and
  `imageSmoothingEnabled = false`. Letterbox in the background colour.
- Never draw anything at a higher resolution than the buffer (no "hi-res"
  text or lines on top).
- Palette: 32–64 colours per theme, defined in `themes.js` as hex. Do not
  introduce colours outside the theme palette in world objects.
- Sprites: defined as data (palette index arrays or ASCII strings with a
  character → colour map), rendered once to an offscreen canvas (cache)
  at start-up or on theme change.
- Sprite scaling: `drawImage` with coordinates rounded to whole pixels.
  For very small scales use simplified versions (LOD) to avoid flicker.
- Sky gradient: colour bands with dithering (4×4 Bayer pattern), not a
  smooth gradient.
- Font: custom 5×7 or 8×8 bitmap font defined in `render/font.js`.
- Player car: at least 3 turn frames per side, drift frames, bouncing on
  bumps, smoke as pooled particles.

---

## 10. Audio

- One `AudioContext`, created lazily after the first user interaction.
  Everything wrapped in `try/catch`; missing audio must never block the
  game.
- Channels: `music`, `sfx`, `engine`, each with its own `GainNode` and a
  volume from the settings.
- Music: custom sequencer (lookahead scheduling with
  `audioCtx.currentTime`, not `setInterval` to play notes).
  3 original songs in `songs.js` as data (tempo, patterns, instruments).
- Engine: oscillator(s) with a frequency that follows the revs, smooth
  changes with `setTargetAtTime`, no clicks.
- Do not create new audio nodes every frame. One-shot effects may create
  nodes but must disconnect them when they end.
- Never play or imitate melodies from existing songs.
- Song format (`src/audio/songs.js`): `{ name, bpm, instruments, patterns, order }`;
  a pattern = 64 steps (16th notes, 4 bars), tracks `lead, arp, bass,
  pad1..3, kick, snare, hat` as tokens `NOTE[:steps]`, `x[:steps]`,
  `.[:steps]`. Instrument sets in `INSTRUMENT_SETS` (format in a comment
  in the file).
- Effect list (`EFFECTS` in `src/audio/sfx.js`), one-shot: `start`,
  `shift`, `bump`, `side`, `crash`, `checkpoint`, `timeWarn`, `timeUp`,
  `goal`, `driftBank`, `driftLost`, `radio`, `taskStart`, `taskWin`,
  `taskLose`; continuous: engine, tyre screech (drift), gravel (shoulder).
  A new effect = an entry in `EFFECTS` + a test.

---

## 11. Controls

Input is mapped to **actions**, not keys. Game logic reads actions only.

| Action | Keyboard | Gamepad (standard) |
|---|---|---|
| `accelerate` | ↑ / W | A / RT |
| `brake` | ↓ / S | B / LT |
| `left` / `right` | ← → / A D | left stick / D-pad |
| `up` / `down` (menus) | ↑ ↓ / W S | left stick / D-pad |
| `menuLeft` / `menuRight` (menus) | ← → | left stick / D-pad |
| `drift` | Space | X |
| `gearToggle` | Shift / Q | Y / LB |
| `radioNext` | R | RB |
| `pause` | Esc / P | Start |
| `confirm` | Enter / Space | A |
| `back` | Esc / Backspace | B |
| `fullscreen` | F | Back / Select |

- The player can rebind the driving actions (`REBINDABLE` in
  `src/engine/input.js`: accelerate, brake, steering, drift, gear, radio,
  pause, fullscreen) on the CONTROLS screen – 2 keys per action, a key
  assigned to a new action is removed from the old one, stored in
  `settings.keys`. Menu keys (`FIXED_KEYS`: arrows, Enter, Esc,
  Backspace, F1) are fixed so the menus always stay usable. Gamepad and
  touch buttons are fixed (shown on the CONTROLS screen).
- How to play: the `HELP_PAGES` in `src/data/text.js` (HOW TO PLAY screen).
- The analog stick gives smooth steering (dead zone in CONFIG).
- Touch controls (`src/engine/touch.js`, `src/render/touch.js`): buttons
  A/B/X/G/P/R and a steering pad (analog steering, vertical movement =
  menus) in 320×240 buffer pixels, layout in `CONFIG.touch`. Touch acts as
  one more gamepad (same actions). Visible on devices with
  `pointer: coarse` or after the first touch; the first touch enters
  fullscreen and locks landscape. Phone held upright: a message on screen
  and the race pauses.
- Quality: when FPS stays below `minFps` or the frame time above
  `slowFrameMs` for `CONFIG.performance.window` s, the road draw distance
  drops one level (`CONFIG.performance.drawDistances`).
- Handle gamepads being connected and disconnected during play.
- Saving (`src/storage.js`): key `neonCoast86` in `localStorage`, data
  `{ version, highscores[10], settings }`; broken or foreign data is
  repaired with defaults, blocked storage = an in-memory copy.

---

## 12. Performance

Budgets (mid-range desktop, Chrome):
- **Steady 60 FPS**, frame time < 8 ms for update + render.
- No noticeable GC pauses while driving (check DevTools → Performance, no
  saw-tooth memory graph).
- `dist/neon-coast.html` smaller than 1 MB.

Mandatory techniques:
- sprite cache in offscreen canvases,
- object pools (particles, vehicles, effects),
- drawing only visible segments and sprites,
- no `getImageData`/`putImageData` in the game loop,
- no `ctx.save()/restore()` and no `filter`/`shadowBlur` changes per
  sprite.

If a change may affect performance, report measurements before and after
(FPS / frame time from the debug overlay).

---

## 13. Testing

### 13.1 Automated tests (`node tools/test.mjs`)

Test pure logic that needs neither canvas nor audio:
- route data validation (section 8.3),
- segment building and height/curve accumulation,
- projecting a world point to the screen for known cases,
- player physics: acceleration, top speed in both gears, centrifugal force,
- collision detection (overlap, no collision just beside),
- scoring and passenger task evaluation,
- determinism: same seed → same results.

All tests must pass before a task is finished.

### 13.2 Manual tests (smoke-test checklist)

After every change, go through in a browser:
1. Start the game from the title screen into a race with no console errors.
2. Drive through a straight, a curve and a hill; leave the road.
3. Collide with a car and with a roadside object.
4. Pause and resume; switch tabs and come back.
5. Take a fork both ways (from stage 5).
6. Drift through a curve (from stage 6).
7. Sound starts after interaction, mute works (from stage 7).
8. Build (`node tools/build.mjs`) and run `dist/` from `file://`.

If you cannot run a browser, say so plainly in the report and list which
points the user has to verify. **Never claim you tested something you did
not test.**

---

## 14. Definition of Done per stage

**Stage 1 – road:** smooth curves and hills with no steps at the joins; no
flicker at top speed; a hill hides the road behind its crest; steady
60 FPS.

**Stage 2 – player:** centrifugal force needs counter-steering; the
shoulder clearly slows the car; LOW/HIGH differ in acceleration and top
speed; the gamepad works with no configuration; the HUD is readable at
320×240.

**Stage 3 – visuals:** sprites don't "float" relative to the road; objects
hide behind hills; smooth palette transition between themes; at least 3
themes; FPS unchanged with dense sprites.

**Stage 4 – traffic:** at least 3 vehicle types; the AI never drives into
itself; no interpenetration on collisions; a crash ends with the car back
on the road and the game never hangs.

**Stage 5 – routes:** 15 sections, 5 goals, all reachable; the fork is
visible on the road; checkpoints add time; TIME UP ends the game; the
mini-map shows the route; data validation tests pass.

**Stage 6 – drift:** drifting gives an advantage in tight curves but needs
a feel for it; entry and exit are predictable; points and multiplier are
visible.

**Stage 7 – audio:** 3 songs that sound musical; engine without clicks;
every effect on the list; separate volumes; no AudioContext errors.

**Stage 8 – passenger:** at least 6 task types; the draw fits the section;
the 0–5 heart rating is clear to the player; it affects the ending; the
normal mode works unchanged.

**Stage 9 – shell:** attract mode with a driving demo; full menu on
keyboard and gamepad; pause at any moment of a race; highscores survive a
page refresh.

**Stage 10 – polish:** smooth play on a phone in landscape; touch controls;
fullscreen; no dead code; CONFIG complete; list of known bugs in the
CHANGELOG.

---

## 15. Agent workflow

### Before a change
1. Read this file and `CHANGELOG.md`.
2. Read the modules the task touches and their direct dependencies. Don't
   guess the API of existing functions.
3. Run `node tools/test.mjs` to know the starting state.
4. If the request is ambiguous in a way that changes the result, ask one
   specific question. Resolve small ambiguities yourself and describe the
   decision in the report.

### During the change
- Small steps; run the tests after every bigger step.
- Don't refactor code unrelated to the task. If you see a problem outside
  the scope, describe it in the report instead of fixing it.
- Don't change the data formats (`sections.js`, `themes.js`, `songs.js`)
  without updating this file and the validator.

### After the change
1. `node tools/test.mjs` – all tests green.
2. `node tools/build.mjs` – build without errors.
3. Smoke test from section 13.2 (or a clear note that it was not done).
4. An entry in `CHANGELOG.md`.
5. Update section 3 of this file if a stage is finished.
6. A report to the user in the format of section 16.

---

## 16. Report format

Write the report in the language the user uses.

```
## Summary
One or two sentences: what was done.

## Changes
- file: what and why

## Tests
- automated: result
- manual: what was checked, what the user has to verify

## Design decisions
- decision: reason (only those that did not follow directly from the request)

## Known limitations and risks
- what doesn't work perfectly, what wasn't done, possible regressions

## Next steps
- at most 3 points
```

Be specific and honest. A report that hides a problem is worse than an
unfinished task.

---

## 17. CHANGELOG.md

Entry format:

```
## [Stage N] YYYY-MM-DD – short title
### Added
### Changed
### Fixed
### Known issues
```

Newest entries on top. Document changes of game behaviour and data
formats, not every small style fix.

---

## 18. Known pitfalls

- **Road flicker at high speed** – usually missing rounding of screen
  coordinates or a wrong `maxY` clipping condition.
- **"Floating" sprites** – sprite position computed from another segment
  or without the curve offset `dx`.
- **Steps at curve joins** – an abrupt `curve` change; use easing
  (ease-in / hold / ease-out) when entering and leaving a curve.
- **No sound** – AudioContext is `suspended`; resume it after interaction
  (`resume()`).
- **Gamepad not visible** – the browser exposes a pad only after a button
  press; poll `navigator.getGamepads()` every frame.
- **Spiral of death after a tab switch** – cap the update steps per frame
  and reset the accumulator on return.
- **Blurry graphics** – `imageSmoothingEnabled` resets when the canvas is
  resized; set it again after every resize.
- **localStorage unavailable** (private mode, `file://` in some browsers)
  – the game must work without saving.
- **The build breaks modules** – when inlining, watch the dependency order
  and name clashes; test `dist/` from `file://`.

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Segment | the smallest piece of road, fixed length `SEGMENT_LENGTH` |
| Section | one of the 15 routes, e.g. `C2` |
| Stage | a pyramid level (1–5) or a development stage of the project – tell them apart by context |
| Rumble | alternating shoulder stripes |
| Fork | the end of a section with a left/right choice |
| Checkpoint | the point at the end of a section that adds time |
| Theme | palette + sprite set + background of a section |
| Attract mode | the demo on the title screen, like in arcade cabinets |
| LOW/HIGH | the two gears of the manual gearbox |
