# ARCHITECTURE AUDIT

## 1. Original Core Loop
**User Action** (Pointer Down / Spacebar)
↓
**System A:** `CommunicationWindow.js` (Calculates response time delta against active pulse)
↓
**System B:** `BehaviorEngine.js` (Updates Trust score and FSM state)
↓
**System C:** `WorldEngine.js` (Evaluates Trust thresholds to advance Stage)
↓
**Visible Output:** `Entity.js` / `AudioEngine.js` (Fibers untangle, colors shift, audio changes)

## 2. Pattern Matching
**YES.**
It is implemented in `src/pattern/CommunicationWindow.js`.
When `EntityHeartbeat.js` emits a pulse, `CommunicationWindow` records `_windowOpenedAt = performance.now()`. When the user clicks, it measures the delta. If the delta is within `maxWindow` (which shrinks from 700ms to 200ms as Trust increases), it emits a `COMMUNICATION_MATCH` event.

## 3. World Progression
**YES.**
It exists in `src/world/StageDefinitions.js` and `src/world/WorldEngine.js`.
Progression: `DARKNESS` (0) → `PULSE` (1) → `GEOMETRY` (2) → `LIGHT` (3) → `GLIMPSE` (4).
Transitions are triggered strictly by `WorldEngine._evaluateStage(trust)` when the Trust integer crosses defined thresholds [0, 20, 45, 70, 90].

## 4. User Agency
- **Click / Spacebar:** Handled by `CommunicationWindow.js`. Determines MATCH or MISS. This is the only input that increases Trust and advances the game.
- **Mouse Move:** Tracked independently by `WorldEngine.js` to calculate `_tension` and `_certainty` (based on velocity variance), and by `Entity.js` to calculate `_cursorLean`.
- **Mouse Hover (near Entity):** Handled by `FiberSystem.js`. Triggers `FIBER_PLUCK` sequence if moving fast enough.
- **Stillness (no movement):** Tracked by `BehaviorEngine.js` as `_idleSeconds` (decays Trust), and by `WorldEngine.js` as `_cursorStillness` (spikes visual tension).

## 5. World Systems
- **CommunicationWindow:** Determines rhythm matches.
- **BehaviorEngine:** FSM managing behavior state and Trust score.
- **EntityHeartbeat:** Generates pulses at non-deterministic intervals.
- **WorldEngine:** Manages visual Stage progression AND calculates environmental physics (Tension/Certainty). *(OVERLAP: Tracks mouse stillness independently of BehaviorEngine).*
- **Entity (Renderer):** Coordinates geometry and fibers. *(OVERLAP: Tracks mouse stillness independently of WorldEngine).*
- **AudioEngine:** Synthesizes sound.
- **MemorySystem:** Persists trust, stage, and spatial history across sessions.

## 6. Dependency Graph
```
Input (Click)
  ↓
CommunicationWindow
  ↓
BehaviorEngine (Trust / State)
  ↓
WorldEngine (Stage)
  ↓
Entity / AudioEngine
```

*Parallel Shadow Graph (Physics):*
```
Input (Mouse Move)
  ↓
WorldEngine (Tension/Certainty Math)
  ↓
Entity (Fiber Renderer)
```

## 7. Scope Audit
- **Still Exists:** Pulse communication, Trust progression, World Stages, Procedural Audio.
- **Modified:** "Pattern matching" is currently a single-beat rhythm response, not a sequence of patterns.
- **Added:** `FIBER_PLUCK` physics, `OBSERVING` state (random 5-second silences), Memory-based audio anomalies (spatial history).

## 8. Complexity Audit
- **MemorySystem (Spatial audio anomalies):** Would it work if deleted? **YES.** Recommend deleting.
- **OBSERVING state (Random silence):** Would it work if deleted? **YES.** Recommend deleting.
- **FIBER_PLUCK sequence:** Would it work if deleted? **YES.** Recommend deleting.
- **WorldEngine Physics (Tension/Certainty based purely on mouse movement):** Would it work if deleted? **YES.** Recommend deleting.

## 9. Biggest Risk
If a judge has exactly 30 seconds, the SINGLE mechanic they discover is: **"Moving my mouse makes the fibers react."**
*(They will likely completely miss the core pattern-matching mechanic because the visual physics are overpowering the communication loop).*

## 10. Brutal Recommendation
Delete 50% of the project immediately. Remove:
1. `MemorySystem.js` entirely.
2. `WorldEngine.js` tension/certainty math (the parallel shadow graph).
3. `FIBER_PLUCK` mechanics.
4. `OBSERVING` state.

**Why:** Right now, a user is rewarded visually just for moving their mouse. This masks the core mechanic (Pulse Matching). We must strip away the ambient physics so the user is forced to realize that clicking the pulse is the ONLY way to make the organism react.
