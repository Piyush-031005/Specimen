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
- **Resize via rAF debounce**: Window resize events fire extremely rapidly. Deferring the actual resize to the next animation frame prevents dozens of canvas resizes per second.

### Future notes

- M2 (Entity Foundation): The entity will subscribe to `RENDER_TICK` and draw using the pre-allocated `ctx` from tick data.
- M5 (World Progression): `ParticleManager.update()` will receive stage definition to control particle behavior (color, opacity curves, direction, etc.).
- Consider adding a `DebugOverlay` (dev-only, stripped in production) to display FPS and particle count. Not in spec — only if needed for M5 tuning.
