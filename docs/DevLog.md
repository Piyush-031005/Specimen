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

- M3: PulseRenderer spawns pulse rings on ENTITY_PULSE_EMITTED. Match echo on COMMUNICATION_MATCH.
- M5: ParticleManager update() receives current stage definition for per-stage visual behavior.

---

## Milestone 3 — Communication Engine

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **PulseRenderer.js** (NEW):
  - Pre-allocated pool of 8 PulseRing objects — flat array, zero allocations in update/render
  - Entity pulses: warm white ring, expands from entity edge to 2.6x radius, 1.6s life
  - Match echoes: electric blue ring, smaller (1.7x), faster (0.9s), on COMMUNICATION_MATCH
  - Misses: NOTHING visual — silence is the response. Never punishes visitor.
  - smootherstep easing on expansion — organic, not linear
  - Opacity: fade-in over first 15% of life, then fade-out. Peak: 38% (entity) / 55% (echo)
  - Pixel values cached and rebuilt on EVENTS.RESIZE

- **PulseGenerator.js** (production rewrite):
  - Non-deterministic by design: per-state [min, max] interval range
  - 30% chance of hesitation variance: adds 150–900ms extra before pulsing
  - CURIOUS: 1400-2200ms; CALM: 2800-4500ms; HESITANT: 3500-6500ms; TRUSTING: 1100-1900ms
  - DEFENSIVE + OBSERVING: completely silent
  - lastPulseTime getter exposed for RhythmMatcher consumption

- **RhythmMatcher.js** (production rewrite):
  - Zero setTimeout — window managed by `_windowOpenedAt` timestamp comparison
  - Late responses (< 2x window): recorded as miss — visitor was trying
  - Very late responses (> 2x window): silently ignored — visitor wasn't responding
  - COMMUNICATION_FIRST_SUCCESS: emitted once, 200ms after first match settles
  - consecutiveMisses tracked for entity behavioral nuance

- **ToleranceSystem.js** (production):
  - MAX_WINDOW_MS=700 at trust=0 → MIN_WINDOW_MS=200 at trust=100
  - mapRange interpolation — progressive, never suddenly hard

- **BehaviorEngine.js** (updated):
  - COMMUNICATION_FIRST_SUCCESS: entity leans toward CURIOUS if CALM or HESITANT
    Trust boost of MATCH_GAIN*2 — subtle, not dramatic
  - _getRecentMatchRate(): replaced Array.filter allocation with manual loop

- **main.js** (updated):
  - PulseRenderer instantiated and self-wired (subscribes to RENDER_TICK internally)
  - USER_PULSE_RESPONSE → memory.recordResponseTime() for rhythm fingerprint

### Visual verification

- ✅ Warm white pulse rings expand from entity edge on entity pulses
- ✅ Blue echo rings appear on match (communication confirmed)
- ✅ Misses: complete silence — no visual punishment
- ✅ First success: entity visibly leans toward CURIOUS state
- ✅ 28 modules, 0 errors, 99ms build

### Problems encountered

1. **`Array.filter(Boolean)` in BehaviorEngine hot path**: Called every 5s evaluation cycle. Replaced with manual loop — no allocation.

2. **`Math.PI * 2` in organicSine and EntityAnimator**: organicSine called 5x/frame. Math.PI * 2 computed every call. Fixed with module-level `_TWO_PI`, `_FOUR_PI` constants.

### Solutions

Both fixed in the zero-allocation audit commit before M4.

### Technical debt

- `PulseGenerator` uses `setTimeout` for pulse scheduling. This is acceptable — pulse timing is not in the render hot path and doesn't cause frame drops.
- `COMMUNICATION_FIRST_SUCCESS` uses a 200ms `setTimeout` for settling delay. Also acceptable — one-time event.
- The match echo (blue ring) currently spawns at canvas center, not at drifted entity position. The drift is ±1.4% of screen — visually imperceptible. Will revisit in M9 polish if needed.

### Architecture decisions

- **Silence as failure feedback**: The most important UX decision of M3. When the visitor misses, they get nothing. No red flash, no error sound, no shake. The entity simply continues. This creates natural curiosity — "did I miss something? let me try again." Consistent with the project philosophy.
- **PulseRenderer is independent of PulseGenerator**: Generator owns timing. Renderer owns visuals. Communicates via EventBus only. Perfectly modular.
- **Two-threshold miss detection**: Responses within 2x the window are a "miss" (they tried). Beyond 2x — silently ignored (they weren't responding to that pulse). Prevents false punishment.

### Future notes

- M4: BehaviorEngine FSM transitions will visibly change pulse frequency through PulseGenerator's per-state params.
- M5: When WorldEngine advances stages, PulseRenderer may gain stage-specific color evolution (warm white → soft violet → warm gold as stages progress). Deferred to M5.
- M8 (Signature Moment): Cursor absorption happens at Stage 4→5 transition. PulseRenderer will spawn a unique inward-collapsing ring (inverse direction) at that moment.

---

## Milestone 4 — Behavior Engine

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **TransitionRules.js** (full implementation):
  - Transition logic evaluated every 5 seconds.
  - Based on organic patterns: `trust`, `recentMatchRate`, and `idleSeconds`.
  - Added robust transition paths avoiding dead ends (e.g. from DEFENSIVE, if user stays and proves consistency, it slowly opens to HESITANT).
  - Universal OBSERVING trigger: 5% chance every 5 seconds (when in CALM or CURIOUS) to enter a state of complete stillness and silence.

- **StateDefinitions.js** (finalized):
  - Retained as the central architectural reference for state design intent.
  - Defines the visual modifiers, pulse frequencies, and imperfection chances for: `CURIOUS`, `CALM`, `DEFENSIVE`, `HESITANT`, `TRUSTING`, and `OBSERVING`.

- **Intentional Imperfections** (orchestrated):
  - FSM transitions now actively change the current state in `PulseGenerator` (modulating pulse rate and timing variance) and `EntityAnimator` (modulating breathing, rotation, and visual hesitation).
  - The entity feels alive because it hesitates randomly and modulates its behavior based on the visitor's patience and accuracy.

### Visual verification

- ✅ Entity actively changes pulse tempo based on behavior state.
- ✅ Long periods of inactivity drive the entity into HESITANT, then DEFENSIVE.
- ✅ Consecutive matches build trust and transition the entity into TRUSTING, increasing fluidity.
- ✅ OBSERVING state correctly freezes the entity for 5 seconds before resuming its previous state.

### Architecture decisions

- **Patterns over single events**: Transitions evaluate trends (e.g., `recentMatchRate`), not just the last interaction. A single miss won't break trust, but a string of them will.
- **Stateless logic evaluation**: `TransitionRules.js` is a pure function that evaluates a context object, making it highly testable and decoupled from the engine state.

### Future notes

- M5: WorldEngine will use the trust built in M4 to unlock world stages (Darkness → Pulse → Geometry → Light → Closest Glimpse).

---

## Milestone 5 — World Progression Engine

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **StageDefinitions.js**:
  - Defined the 5 world stages: Darkness, Pulse, Geometry, Light, The Closest Glimpse.
  - Mapped specific parameters to each stage: background luminosity, particle count, color, max opacity, motion type (`static`, `inward`, `orbital`, `resonance`), and base velocity multipliers.

- **WorldEngine.js**:
  - Listens to `BEHAVIOR_TRUST_UPDATED`.
  - Ensures sequential stage progression: even if trust spikes, it only advances one stage per evaluation to preserve the visual journey.
  - Broadcasts the initial stage on load via `worldEngine.init()`.

- **ParticleManager.js**:
  - Evolved from basic rendering into dynamic stage-driven generation.
  - Re-engineered `spawn()` signature from taking an object payload to primitive arguments (`x`, `y`, `vx`, `vy`, etc.).
  - **Zero Allocation Achieved**: Eradicated the `{...}` object allocation per spawn. The `update()` hot path generates particles, applies complex motion (inward vectors, spirals, resonance), and manages fading without a single heap allocation.
  - Opacity fade-in/out now uses a sine wave (`Math.sin(lifeProgress * Math.PI)`) for an organic, breathing appearance.

- **Renderer.js**:
  - Connected to the `WORLD_STAGE_CHANGED` event to handle background luminosity.
  - When luminosity > 0 (Stages 2+), renders a soft, dynamic radial gradient at the center that shifts from pitch black to a very subtle warm gold/white tint.

### Visual verification

- ✅ Stage 1: Completely black. Zero particles.
- ✅ Stage 2: Small, static electric blue particles drift subtly in the background.
- ✅ Stage 3: Soft violet particles flow inward toward the entity.
- ✅ Stage 4: Warm gold particles spiral into elegant orbital paths; center background glows faintly.
- ✅ Stage 5: Dense, fast, resonant swarm of white particles.
- ✅ Zero console errors. Zero allocation dropouts. Stable 60fps.

### Architecture decisions

- **Decoupled Progression**: The visual engines (`ParticleManager`, `Renderer`) know nothing about trust or logic. They only listen to `WORLD_STAGE_CHANGED`. The FSM trust simply triggers the stage transition.
- **Strict Primitive Parameters**: Refactoring `spawn()` to take primitives instead of objects is essential for the zero-allocation contract. Particle pools in JS must be flat data structures to avoid GC spikes over long sessions.

### Future notes

- M6: The audio engine will need to reflect these world stages (e.g., adding a sub-bass hum in Stage 3, and a choral resonance in Stage 5).
- M7: The memory system will persist the achieved trust and stage. Return visitors should feel an immediate recognition from the entity (starting slightly warmer).

---

## Milestone 6 — Audio Engine

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **AudioEngine.js**:
  - Implements a strictly controlled `AudioContext` initialization. It *never* unlocks automatically. It waits for the very first deliberate `pointerdown` event, guaranteeing browser compliance and avoiding awkward popups.
  - Wires the FSM (`BEHAVIOR_STATE_CHANGED`) and `WORLD_STAGE_CHANGED` directly into the synths.

- **PulseSynth.js**:
  - A generative sine wave synth acting as the entity's heartbeat.
  - **Trust Detuning**: When the entity is `HESITANT` or `DEFENSIVE` (low trust), the fundamental frequency actively detunes, making it sound uncertain and slightly dissonant.
  - **Success Bloom**: When `COMMUNICATION_SUCCESS` fires, it triggers an overtone bloom (a triangle wave perfect fifth) that opens up via a lowpass filter, creating a deeply rewarding sound without relying on a sample.

- **AtmosphereSynth.js**:
  - A multi-layered ambient drone limited strictly to 4 oscillator layers for maximum clarity and performance.
  - Creates an organic C Major chord that evolves across the 5 world stages.
  - Replaces the original "choral" concept with a pure, synthesized harmonic resonance.
  - Uses an ultra-slow LFO (0.15Hz) on the octave layer to create a gentle, peaceful shimmer instead of cinematic chaos.

### Architecture decisions

- **Generative over Sampled**: By synthesizing audio in real-time, we maintain the zero-allocation, lightweight footprint of the project. No heavy MP3 downloads. The audio is literally generated by the math of the universe (trust and logic).
- **Subtlety over Spectacle**: The audio layers fade in slowly (over 4 seconds per stage) to ensure the visitor feels the atmosphere settle rather than "hearing a soundtrack start". 

### Future notes

- M7: Memory system will persist trust across sessions. Return visitors will jump back into higher audio/visual stages instantly, making the experience feel truly alive and aware.

---

## Milestone 7 — Memory Engine

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **SessionData.js**:
  - Replaced basic average tracking with a full `RhythmFingerprint` schema.
  - Now stores `avgTempoMs`, `varianceMs`, and interaction counts to build a behavioral profile.

- **MemorySystem.js**:
  - Implemented real-world time decay (`calculateReturningTrust`). A visitor returning after 1 hour retains ~90% trust. After 24 hours, ~40%. After 7 days, ~10%. Trust never starts above 40 (must re-earn higher stages).
  - Implemented recognition mechanics (`getFamiliarityMultiplier`). If a visitor interacts with a timing that matches their historical variance, trust gains are multiplied (up to 1.3x) because the entity "recognizes" them.

- **BehaviorEngine.js & main.js**:
  - Wired to use the real-world decay upon startup.
  - Wired to apply the familiarity multiplier during `COMMUNICATION_MATCH` events.

### Architecture decisions

- **Zero UI Recognition**: The most important rule for M7 was "never tell the visitor they are recognized." There is no "Welcome Back" text. The recognition is purely behavioral—they build trust slightly faster if they act like themselves, and they start slightly warmer depending on how long they were gone.
- **Math over Mechanics**: Rather than adding new features for returning users, we simply modulate the existing FSM using statistical variance against their historical rhythm footprint.

### Future notes

- M8: The Signature Moment is complete. Next, M9 (Polish) and M10 (Launch).

---

## Milestone 8 — The Signature Moment

**Status**: ✅ Complete
**Date**: 2026-07-08

### What was built

- **CustomCursor.js**:
  - Implemented a very subtle, faint ring that lerps to the user's mouse position. 
  - This was required because the OS cursor is natively hidden via CSS. We needed an organic visual element that we could fade out and manipulate during the climax.

- **SignatureMoment.js**:
  - Wired into `main.js` and orchestrated the entire sequence upon hitting Stage 5 (GLIMPSE).
  - Uses `SessionData` to ensure this moment only happens *once per user lifetime*. 
  - The sequence:
    1. Softly fades out the custom cursor.
    2. Draws a gentle light trail connecting the cursor's last position to the entity's core.
    3. Applies a very subtle `_exposureLift` to the entire canvas (soft bloom/vignette relaxation) without resorting to cliché chromatic aberration.
    4. Triggers 3 seconds of perfect stillness (managed by AudioEngine).
    5. Triggers one final pulse from the entity.
    6. Returns the cursor.
    7. No ending text. No UI. The website just continues existing.

- **AudioEngine & AtmosphereSynth**:
  - Implemented a `calm()` method that dramatically reduces the audio complexity during the 3-second absorption. High octave shimmer drops, leaving mostly the warm C Major third and sub bass.
  - Heartbeat pulsing is explicitly halted during these 3 seconds.

- **Permanent Behavioral Shift (EntityAnimator & PulseGenerator)**:
  - Added the optional detail: once the Signature Moment ends, a global `_calmMultiplier` is applied permanently.
  - The entity's visual breathing slows down significantly.
  - The entity's heartbeat interval increases (slower pacing).
  - This creates the feeling that both the visitor and the entity have changed because of the encounter.

### Architecture decisions
- **Organic Easing**: Refused to snap the cursor or use rigid keyframes. The fading and the light trail use a custom `_animateProperty` loop with sine easing to feel like a natural fluid motion.
- **Zero Celebration**: Adhered strictly to the rule: "Connection = Peace". There are no particle explosions or fireworks. The climax of the website is literally *doing less*.

 
 # #   P h a s e   4 :   S e n t i e n t   F i b e r   R e f a c t o r   ( C h o r e o g r a p h y   o v e r   G e o m e t r y ) 
 
 A s   t h e   p r o j e c t   s h i f t e d   f o c u s   f r o m   a   p r o c e d u r a l   p h y s i c s   d e m o   t o   a n   u n f o r g e t t a b l e   c i n e m a t i c   e n c o u n t e r ,   t h e   r e n d e r i n g   a r c h i t e c t u r e   n a t u r a l l y   e v o l v e d   b e y o n d   t h e   o r i g i n a l   ` G e o m e t r y . j s `   p a r a d i g m . 
 
 # # #   W h y   ` F i b e r S y s t e m `   E x i s t s 
 T h e   o r i g i n a l   ` G e o m e t r y . j s `   r e l i e d   o n   d r a w i n g   s t r i c t   g e o m e t r i c   s h a p e s   ( c i r c l e s ,   t r i a n g l e s )   o n   a   g r i d .   T o   e v o k e   a   t r u l y   l i v i n g ,   n e r v o u s - s y s t e m - l i k e   e n t i t y ,   w e   n e e d e d   o r g a n i c   s t r a n d s   t h a t   c o u l d   s n a p ,   r e a c h ,   a n d   t w i s t   i n d e p e n d e n t l y .   ` F i b e r S y s t e m `   w a s   b u i l t   t o   h a n d l e   h i g h l y   o p t i m i z e d ,   p h y s i c s - d r i v e n   q u a d r a t i c   b e z i e r   c u r v e s   w i t h   i n d e p e n d e n t   a n c h o r   p o i n t s .   T h i s   a l l o w e d   u s   t o   i n t r o d u c e   d i s t i n c t   v i s u a l   h i e r a r c h y   ( A r t e r i a l   v s   C a p i l l a r y   f i b e r s )   a n d   h o o k   t h e i r   t e n s i o n   d i r e c t l y   i n t o   t h e   ` B e h a v i o r E n g i n e ` ,   g i v i n g   t h e   e n t i t y   a   p h y s i c a l   r e a c t i o n   t o   t r u s t . 
 
 # # #   W h y   ` S i g n a t u r e M o m e n t `   E x i s t s 
 A   c o n t i n u o u s   p h y s i c s   s i m u l a t i o n ,   n o   m a t t e r   h o w   b e a u t i f u l ,   l a c k s   e m o t i o n a l   p a c i n g .   ` S i g n a t u r e M o m e n t `   w a s   i n t r o d u c e d   a s   a   s c r i p t e d   s e q u e n c e   c o n d u c t o r   t o   o v e r r i d e   t h e   p h y s i c s   e n g i n e   f o r   t h e   e x p e r i e n c e ` s   c l i m a x .   B y   s e i z i n g   c o n t r o l   o f   t h e   c a n v a s   ( r e n d e r i n g   a   p u r e   b l a c k o u t   o v e r l a y   a n d   a   s i n g l e   g l o w i n g   f i b e r ) ,   i t   p r o v i d e s   t h e   n e c e s s a r y   a n t i c i p a t i o n   a n d   " H a u n t i n g   R e s e t "   b e f o r e   s n a p p i n g   b a c k   t o   t h e   n o r m a l   s i m u l a t i o n   l o o p .   I t   e x i s t s   t o   g u a r a n t e e   c i n e m a t i c   t i m i n g   ( a n t i c i p a t i o n ,   h e s i t a t i o n ,   r e l e a s e )   t h a t   a   p u r e l y   s y s t e m i c   s i m u l a t i o n   c a n n o t   g u a r a n t e e . 
 
 # # #   T h e   R e n d e r i n g   E v o l u t i o n 
 1 .   * * G r i d * *   - >   ` C o o r d i n a t e S y s t e m `   m a p s   w o r l d   t o   s c r e e n . 
 2 .   * * S a c r e d   G e o m e t r y * *   - >   ` G e o m e t r y . j s `   d r e w   s t r i c t   l i n e s ,   r o t a t e d   b a s e d   o n   t r u s t . 
 3 .   * * S e n t i e n t   E n t i t y * *   - >   ` F i b e r S y s t e m . j s `   d r a w s   i n d e p e n d e n t   s t r a n d s ,   t e n s i o n   m a p s   t o   t r u s t . 
 4 .   * * C i n e m a t i c   M o m e n t s * *   - >   ` S i g n a t u r e M o m e n t . j s `   o v e r r i d e s   t h e   c a n v a s   e n t i r e l y   f o r   e m o t i o n a l   b e a t s . 
  
 