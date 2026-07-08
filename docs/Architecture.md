# SPECIMEN — System Architecture

## Philosophy

Every module is independent. Every module communicates through the EventBus only.
No module imports another module's instance directly (except constructor injection).
No spaghetti. No coupling. No side effects at import time.

---

## System Communication Flow

```
User Gesture (click / spacebar / touch)
        │
        ▼
   Input Handler (main.js)
        │
        │  emits: EVENTS.USER_INPUT
        ▼
     EventBus  ←──────────────────────────────┐
        │                                      │
        ├──▶  RhythmMatcher                    │
        │         │ emits: COMM_MATCH / MISS   │
        │         ▼                            │
        │     BehaviorEngine (FSM)             │
        │         │ emits: BEHAVIOR_STATE_CHANGED
        │         │        BEHAVIOR_TRUST_UPDATED
        │         ▼                            │
        │     WorldEngine                      │
        │         │ emits: WORLD_STAGE_CHANGED │
        │         ▼                            │
        │     ParticleManager ─────────────────┘
        │
        ├──▶  PulseGenerator
        │         │ emits: ENTITY_PULSE_EMITTED
        │         │        AUDIO_PULSE_TRIGGER
        │         ▼
        │     RhythmMatcher (see above)
        │
        ├──▶  AudioEngine
        │
        ├──▶  MemorySystem
        │
        └──▶  Renderer
                  │
                  │  emits: EVENTS.RENDER_TICK (every frame)
                  ▼
     ┌────────────────────────┐
     │  All draw subscribers  │
     │  - Entity              │
     │  - ParticleManager     │
     │  - (future layers)     │
     └────────────────────────┘
                  │
                  ▼
              <canvas>
```

---

## Module Registry

| Module | Location | Milestone | Responsibility |
|---|---|---|---|
| Renderer | `engine/Renderer.js` | M1 | rAF loop, delta time, canvas sizing |
| CoordinateSystem | `engine/CoordinateSystem.js` | M1 | Normalized ↔ pixel coordinate mapping |
| AnimationScheduler | `engine/AnimationScheduler.js` | M1 | Tick-driven timeline animations |
| PerformanceMonitor | `utils/PerformanceMonitor.js` | M0 | FPS tracking, adaptive quality signals |
| EventBus | `utils/EventBus.js` | M0 | Pub/sub singleton — all inter-module comms |
| MathUtils | `utils/MathUtils.js` | M0 | Easing, noise, lerp, clamp |
| Entity | `entity/Entity.js` | M2 | The unknown presence |
| Geometry | `entity/Geometry.js` | M2 | ONE iconic impossible geometry |
| EntityAnimator | `entity/EntityAnimator.js` | M2 | Breathing, idle, behavioral animations |
| PulseGenerator | `pattern/PulseGenerator.js` | M3 | Non-deterministic pulse timing |
| RhythmMatcher | `pattern/RhythmMatcher.js` | M3 | Response window detection |
| ToleranceSystem | `pattern/ToleranceSystem.js` | M3 | Adaptive difficulty |
| BehaviorEngine | `behavior/BehaviorEngine.js` | M4 | FSM: 6 states |
| StateDefinitions | `behavior/StateDefinitions.js` | M4 | Per-state visual/audio modifiers |
| TransitionRules | `behavior/TransitionRules.js` | M4 | Trend-based FSM transitions |
| WorldEngine | `world/WorldEngine.js` | M5 | Stage progression (0→4) |
| ParticleManager | `world/ParticleManager.js` | M1/M5 | Pool M1; behavior per stage M5 |
| StageDefinitions | `world/StageDefinitions.js` | M5 | Stage atmosphere specs |
| AudioEngine | `audio/AudioEngine.js` | M7 | Procedural Web Audio API |
| MemorySystem | `memory/MemorySystem.js` | M6 | localStorage persistence |
| SessionData | `memory/SessionData.js` | M6 | Schema: trust, rhythm, history |
| HintLayer | `ui/HintLayer.js` | M0 | One hint after 12s idle |

---

## Data Flow Invariants

1. **EventBus is the only communication channel.** No direct method calls between systems.
2. **Renderer owns the canvas.** Only Renderer calls `fillRect`. All other systems receive `ctx` via RENDER_TICK.
3. **PerformanceMonitor is passive.** It reads frame times and emits quality signals. It never throttles anything directly.
4. **BehaviorEngine is the trust authority.** Only BehaviorEngine modifies trust. All other systems read it via events.
5. **MemorySystem is the persistence authority.** Only MemorySystem reads/writes localStorage.

---

## Performance Contract

| Guarantee | Implementation |
|---|---|
| Zero allocations per render frame | Pre-allocated tick data object, mutated in-place |
| No GC pressure from particles | Pre-allocated pool of 512 objects, recycled |
| Adaptive quality | PerformanceMonitor → PERF_QUALITY_CHANGED → ParticleManager |
| No setTimeout in animation system | AnimationScheduler is purely deltaTime driven |
| Resize never causes jank | Resize handler is debounced via rAF |
