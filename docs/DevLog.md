# SPECIMEN — Development Log

---

## Milestone 0 — Project Foundation

**Status**: ✅ Complete  
**Date**: 2026-07-08

### What was built

- Vite + Vanilla JS project initialized
- Full folder architecture created (25 modules across 8 directories)
- `constants.js` — single source of truth for all values
- `EventBus.js` — pub/sub singleton, the nervous system of the engine
- `MathUtils.js` — custom easing library (organicSine, hesitationCurve, expDecay, valueNoise)
- `PerformanceMonitor.js` — adaptive quality tracking (60fps → 45fps → reduce particles)
- `Renderer.js` — rAF loop, delta time, DPR-aware resize
- `CoordinateSystem.js` — normalized [-1,1] space
- `AnimationScheduler.js` — tick-driven animation timeline
- All system stubs for M2–M8 (typed interfaces, not empty files)
- `main.js` — startup sequence and system wiring
- `index.html` — minimal, full-screen canvas, custom cursor hidden

### Build verification

- 25 modules transformed
- 0 build errors
- 89ms build time

### Problems encountered

None. Architecture was designed before a single line of code was written.

### Solutions

N/A

### Technical debt

- LF/CRLF warnings on Windows — resolved in M1 with `.gitattributes`
- Vite scaffold left `src/assets/` stub — harmless, not removed to avoid commit noise

### Architecture decisions

- **EventBus over direct imports**: Every module communicates via events. No circular dependencies possible.
- **Pre-allocated particle pool**: Decided at architecture stage to avoid GC pressure at runtime.
- **Stubs with typed JSDoc**: Every future module has an interface defined now so M1+ never need to guess the contract.

### Future notes

- The `vite.config.js` was not modified — default config is sufficient for MVP.
- Consider adding `vite-plugin-compression` before demo phase for gzip assets.

---

## Milestone 1 — Canvas Engine

**Status**: ✅ Complete  
**Date**: 2026-07-08

### What was built

- **Renderer.js** (production rewrite):
  - Pre-allocated tick data object — zero heap allocations per frame
  - Accurate delta time with spike clamping (max 100ms, prevents tab-switch jank)
  - DPR-aware canvas sizing on init and every resize
  - Context transform set once per resize, never per frame
  - Clean `init()` / `start()` / `stop()` / `destroy()` lifecycle
  - Resize handler uses `requestAnimationFrame` debounce to prevent jank

- **CoordinateSystem.js** (updated):
  - Renamed `toPixel()` → `worldToScreen()` (spec requirement)
  - Renamed `toNormalized()` → `screenToWorld()` (spec requirement)
  - Aliases retained for backwards compatibility within stubs
  - `toPixelSize()` → `worldSizeToPixels()` (cleaner name)
  - Center computed as a cached getter

- **ParticleManager.js** (full infrastructure implementation):
  - Pre-allocated pool of 512 `Particle` objects — no `new` inside update loop
  - `spawn(props)` — finds inactive slot via typed pool scan
  - `update(deltaSeconds)` — advances life, applies velocity, deactivates expired
  - `render(ctx)` — draws all active particles as circles (no glow, no bloom)
  - `recycle()` — implicit in update (sets `active = false`)
  - `getActiveCount()` — for debugging/monitoring
  - Responds to `PERF_QUALITY_CHANGED` to clamp pool limit

- **AnimationScheduler.js** (audit complete):
  - Confirmed: zero `setTimeout` / `setInterval` usage
  - All timing is derived from `now` passed via `RENDER_TICK`
  - Pre-allocated internal structures — no Map resize during animation
  - Completed animation IDs are batch-removed after iteration

- **Documentation**:
  - `docs/Architecture.md`
  - `docs/DesignLanguage.md`
  - `docs/DevLog.md` (this file)

### Build verification

- All modules resolve
- 0 errors
- Build time: ~90ms

### Problems encountered

1. **Render-loop allocation**: The original `Renderer.js` emitted a new `{}` object on every frame via `EventBus.emit(EVENTS.RENDER_TICK, { ctx, deltaMs, ... })`. At 60fps this is 60 allocations/second — steady GC pressure over a long session.

2. **Coordinate naming**: Spec requires `worldToScreen()` and `screenToWorld()`. M0 used `toPixel()` and `toNormalized()`. Minor but a spec violation.

3. **ParticleManager was a stub**: Pool was allocated but `update()` and `render()` were empty. M1 required full infrastructure.

### Solutions

1. Pre-allocated `this._tickData` object on `Renderer` construction. The same object reference is mutated each frame and passed to `EventBus.emit`. Zero allocations.

2. Renamed coordinate methods. Kept old names as `@deprecated` aliases so M0 stubs don't break.

3. Implemented full particle pool lifecycle — spawn, update (life + velocity), render (basic circles), recycle (flag flip).

### Technical debt

- The `Renderer`'s `_tickData.ctx` is set once at construction. If the canvas context is ever recreated, this needs updating. Low risk for this project.
- Particle `render()` draws basic circles. Visual behavior (color, size, opacity curves) is deferred to M5 (World Progression).
- `vite.config.js` is still default — acceptable until pre-demo optimization.

### Architecture decisions

- **Pre-allocated tick data**: This is a hard invariant from this point forward. No subscriber of `RENDER_TICK` should assume they can mutate the tick data object.
- **Particle pool size 512**: Generous enough for all 5 world stages. Reduced to 128 on quality downgrade.
- **Resize via rAF debounce**: Defer actual resize until next animation frame — prevents canvas resize flood on drag-resize.

### Future notes

- M2: Entity subscribes to RENDER_TICK. Geometry draws at entity's drifted world position.
- M5: ParticleManager update() receives current stage definition for per-stage visual behavior.

---

## Milestone 2 — Entity Foundation

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **Geometry.js** (full implementation):
  - The ONE iconic geometry: Merkaba form (sacred geometry / Metatron's Cube inspired)
  - Structure: outer ring → outer triangle (CW) → inner triangle (CCW) →
    mid ring (electric blue) → 6 inner spokes (impossible intersections) →
    core ring + dot (soft violet)
  - Module-level constants TWO_PI, PI_OVER_3 (no Math.PI * 2 per frame)
  - All radii cached in `_rebuildCache()` — only recomputed on resize
  - Pure draw function — no state, no animation logic inside Geometry

- **EntityAnimator.js** (full implementation):
  - Organic breathing via `organicSine()` — asymmetric waveform, random phase offset
  - Counter-rotation: outer CW, inner CCW at 0.73x (offset rhythm)
  - `valueNoise2D()` perturbation on rotation rate — never a steady clock
  - Idle drift via two independent `organicSine()` with Lissajous-like paths
  - `expDecay()` smoothing on drift position — no snapping
  - **Intentional imperfection**: random hesitation events slow rotation to 15% for 0.3–1.1s
  - Per-state animation params (breathSpeed, amplitude, rotationSpeed, driftScale, hesitationChance)
  - Params smoothly lerp toward target when behavior state changes

- **Entity.js** (full implementation):
  - Shares mutable EntityState with EntityAnimator
  - Fade-in intro: opacity 0 → 1 over 2400ms, smootherstep, 600ms delay
  - Cursor lean: in CURIOUS state, drifts 6% toward cursor world position
  - Translates canvas context to drifted world position for each draw call
  - Rebuilds geometry cache on resize

### Visual verification

Verified live in browser:
- ✅ Merkaba symbol renders correctly (outer ring, two triangles, mid ring, spokes, core)
- ✅ Counter-rotation at offset speeds — never robotic
- ✅ Organic breathing scale — subtle, asymmetric
- ✅ Lissajous idle drift — entity wanders, never repeats exactly
- ✅ Smooth fade-in over 2.4 seconds
- ✅ Zero console errors

### Problems encountered

1. **Entity constructor signature**: M0 stub took only `coords`. M2 added `scheduler` for fade-in animation. Required `main.js` update.

2. **Context translation for drift**: Geometry renders relative to a fixed center point. To apply drift, the canvas context is temporarily translated by the world-to-screen offset. Slight overhead but clean separation — Geometry stays pure.

### Solutions

1. Added `scheduler` as second parameter to Entity constructor.

2. Save/translate/draw/restore pattern in `_onTick()`. Only triggered when drift offset is non-zero (check added to skip unnecessary save/restore).

### Technical debt

- Geometry `render()` opens a `ctx.save()/restore()` block plus additional state changes per layer. Total save/restore per frame: 2 (Entity + Geometry). Acceptable for now. Could consolidate in M9 polish.
- The `hesitationChance` parameter is per-frame at 60fps. At 30fps it fires half as often — slightly different feel. Acceptable until M9 polish.

### Architecture decisions

- **EntityState as shared reference**: Both Entity and EntityAnimator hold the same object reference. Animator writes to it; Entity reads from it at render time. Clean data flow, no events for per-frame values.
- **Geometry is stateless**: All animation state lives in EntityAnimator. Geometry is a pure renderer — testable, replaceable, zero side effects.
- **Merkaba form as identity**: This geometry is locked permanently. No random shape generation. The entity IS the Merkaba. Its identity comes from behavior, not from shape variation.

### Future notes

- M3: `PulseGenerator` emits visual pulse ring from entity position. Geometry remains unchanged — pulse is a separate visual layer.
- M4: Behavior state changes will visibly affect entity animation speed/amplitude through EntityAnimator's per-state params.
- M9 polish: Consider adding a very faint glow (~3px blur, 20% opacity) on the core ring only for Stage 4+ world.

- **Resize via rAF debounce**: Window resize events fire extremely rapidly. Deferring the actual resize to the next animation frame prevents dozens of canvas resizes per second.

### Future notes

- M2 (Entity Foundation): The entity will subscribe to `RENDER_TICK` and draw using the pre-allocated `ctx` from tick data.
- M5 (World Progression): `ParticleManager.update()` will receive stage definition to control particle behavior (color, opacity curves, direction, etc.).
- Consider adding a `DebugOverlay` (dev-only, stripped in production) to display FPS and particle count. Not in spec — only if needed for M5 tuning.
