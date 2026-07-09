/**
 * SPECIMEN — EntityAnimator
 *
 * Drives all continuous animations on the entity.
 * This is the behavioral heartbeat of the presence.
 *
 * Animation Language Rules (hardcoded, never negotiated):
 *   ❌ No bounce. No elastic. No ease-in-out cubic. No linear.
 *   ✅ Slow. Organic. Hesitant. Alive.
 *   ✅ Everything uses MathUtils: organicSine, hesitationCurve, expDecay, valueNoise
 *
 * Manages:
 *   - Breathing cycle (scale oscillation, asymmetric)
 *   - Outer/inner triangle counter-rotation
 *   - Idle drift (slow 2D position wander in world space)
 *   - Behavioral state modulation (speed, amplitude change per state)
 *   - Intentional imperfections (random hesitation moments)
 *
 * All values are written onto the Entity's state object each frame.
 * The animator owns time — Entity owns state — Geometry owns rendering.
 */

import { BEHAVIOR_STATES, EVENTS } from '../constants.js';
import { EventBus } from '../utils/EventBus.js';
import {
  organicSine,
  hesitationCurve,
  expDecay,
  valueNoise2D,
  lerp,
  clamp,
  randomFloat,
} from '../utils/MathUtils.js';

// Pre-computed — avoids Math.PI * 2 in the render hot path
const TWO_PI = Math.PI * 2;

// ─── Behavioral animation parameters per state ────────────────────────────────
const STATE_ANIM_PARAMS = {
  [BEHAVIOR_STATES.CURIOUS]: {
    breathSpeed:      0.38,
    breathAmplitude:  0.028,
    rotationSpeed:    0.006,
    driftScale:       0.012,
    hesitationChance: 0.0004,
  },
  [BEHAVIOR_STATES.CALM]: {
    breathSpeed:      0.22,
    breathAmplitude:  0.018,
    rotationSpeed:    0.003,
    driftScale:       0.007,
    hesitationChance: 0.0002,
  },
  [BEHAVIOR_STATES.DEFENSIVE]: {
    breathSpeed:      0.12,
    breathAmplitude:  0.008,
    rotationSpeed:    0.001,
    driftScale:       0.002,
    hesitationChance: 0.0,
  },
  [BEHAVIOR_STATES.HESITANT]: {
    breathSpeed:      0.28,
    breathAmplitude:  0.022,
    rotationSpeed:    0.004,
    driftScale:       0.009,
    hesitationChance: 0.0015, // Much higher — trembling
  },
  [BEHAVIOR_STATES.TRUSTING]: {
    breathSpeed:      0.35,
    breathAmplitude:  0.032,
    rotationSpeed:    0.007,
    driftScale:       0.014,
    hesitationChance: 0.0001,
  },
  [BEHAVIOR_STATES.OBSERVING]: {
    breathSpeed:      0.08,   // Barely moves — entity is completely still
    breathAmplitude:  0.004,
    rotationSpeed:    0.0005,
    driftScale:       0.001,
    hesitationChance: 0.0,
  },
};

export class EntityAnimator {
  /**
   * @param {import('./Entity.js').EntityState} state — Shared mutable state object
   */
  constructor(state) {
    /** @type {import('./Entity.js').EntityState} */
    this._state = state;

    /** @type {number} Accumulated time in seconds */
    this._time = 0;

    /**
     * Phase offsets — unique per session, prevents all instances looking identical.
     * @type {number}
     */
    this._breathPhase = randomFloat(0, Math.PI * 2);
    this._driftPhaseX = randomFloat(0, Math.PI * 2);
    this._driftPhaseY = randomFloat(0, Math.PI * 2);

    /** @type {string} Current behavior state */
    this._behaviorState = BEHAVIOR_STATES.CALM;

    /** @type {number} Global modifier for M8 calmness */
    this._calmMultiplier = 1.0;

    /** @type {object} Current animation params (interpolated toward target) */
    this._currentParams = { ...STATE_ANIM_PARAMS[BEHAVIOR_STATES.CALM] };

    /** @type {object} Target animation params (set from behavior state) */
    this._targetParams = { ...STATE_ANIM_PARAMS[BEHAVIOR_STATES.CALM] };

    /**
     * Hesitation flag — when true, rotation slows dramatically for a moment.
     * @type {boolean}
     */
    this._isHesitating = false;

    /** @type {number} Hesitation timer in seconds */
    this._hesitationTimer = 0;

    /** @type {number} Hesitation duration in seconds */
    this._hesitationDuration = 0;

    /** @type {number} Expansion modifier for micro-interactions (match) */
    this._interactionExpansion = 0;

    // Listen for behavior state changes
    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
      this._behaviorState = state;
      // When behavior state naturally changes, we reset the target params
      // Initiative actions can override these temporarily.
      this._targetParams = { ...STATE_ANIM_PARAMS[state] ?? STATE_ANIM_PARAMS[BEHAVIOR_STATES.CALM] };
    });

    /** @type {string|null} Current autonomous action (e.g. 'reach', 'observe', 'freeze') */
    this._currentInitiative = null;
    this._initiativeTimer = 0;
    
    // For Memory access to calculate habitat safety
    this._memoryData = null;

    EventBus.on(EVENTS.SIGNATURE_MOMENT_END, () => {
      this._calmMultiplier = 0.6; // Permanently calm the entity down after M8
    });

    EventBus.on(EVENTS.AUDIO_MATCH_TRIGGER, () => {
      // Subtle heartbeat expansion (max 2-5%)
      this._interactionExpansion = randomFloat(0.02, 0.05);
    });

    // ─── Intro Sequence State ────────────────────────────────────────────────
    this._introState = 'hiding'; // 'hiding' -> 'revealed'
    this._timeSinceLoad = 0;
    this._stillnessTimer = 0;
    this._introRevealed = false;
    
    // ─── Interaction Style Tracking ──────────────────────────────────────────
    this._recentVelocities = [];
    this._lastStyleEvalTime = 0;
    this._temperament = 0.0; // [-1.0, 1.0] Guarded -> Curious

    EventBus.on(EVENTS.MEMORY_LOADED, ({ data }) => {
      this._temperament = data.temperament || 0.0;
      this._memoryData = data;
    });

    EventBus.on(EVENTS.INTRO_REVEALED, () => {
      this._introRevealed = true;
      this._introState = 'revealed';
    });
    
    /** @type {{x: number, y: number, time: number}} Last recorded cursor state */
    this._lastCursor = { x: -1, y: -1, time: 0 };

    EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
      const now = performance.now();
      if (this._lastCursor.x !== -1) {
        const dx = x - this._lastCursor.x;
        const dy = y - this._lastCursor.y;
        const distSq = dx * dx + dy * dy;
        const dt = now - this._lastCursor.time;
        
        // Detect Pluck: Cursor crossing the vertical center line
        const cx = window.innerWidth / 2;
        if ((this._lastCursor.x <= cx && x > cx) || (this._lastCursor.x >= cx && x < cx)) {
          // If the movement was deliberate enough (not just a jitter)
          if (Math.abs(dx) > 5) {
            EventBus.emit(EVENTS.FIBER_PLUCK, { velocityX: dx / Math.max(1, dt), yPos: y });
          }
        }

        if (dt > 0) {
          const velocity = Math.sqrt(distSq) / dt; // pixels per ms
          this._recentVelocities.push(velocity);
          
          if (now - this._lastStyleEvalTime > 1000) {
             let sum = 0;
             for (let v of this._recentVelocities) sum += v;
             const avgV = sum / this._recentVelocities.length;
             
             // Evaluate temperament shift based on interaction style
             let delta = 0;
             if (avgV > 2.5) {
               // Frantic, aggressive movement
               delta = -0.1;
             } else if (avgV > 0.1 && avgV <= 1.0) {
               // Slow, deliberate, gentle movement
               delta = 0.05;
             } else if (this._recentVelocities.length < 15) {
               // Very few movements over the second = patience
               delta = 0.02;
             }

             if (delta !== 0) {
               this._temperament = Math.max(-1.0, Math.min(1.0, this._temperament + delta));
               EventBus.emit(EVENTS.USER_INTERACTION_STYLE, { delta });
             }
             
             this._recentVelocities = [];
             this._lastStyleEvalTime = now;
          }
        }

        // If cursor moves very fast (e.g. > 1000 pixels per second squared roughly)
        if (dt > 0 && (distSq / dt) > 1500) {
          // Entity gets startled / hesitates intentionally
          if (!this._isHesitating && this._behaviorState !== BEHAVIOR_STATES.DEFENSIVE) {
            this._isHesitating = true;
            this._hesitationDuration = randomFloat(0.4, 0.8);
            this._hesitationTimer = this._hesitationDuration;
          }
        }
      }
      this._lastCursor.x = x;
      this._lastCursor.y = y;
      this._lastCursor.time = now;
      this._stillnessTimer = 0; // Reset stillness on movement
    });

    // Accessibility check
    this._prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Update all animations. Called every frame.
   * Writes directly onto the shared EntityState object.
   *
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    this._time += deltaSeconds;
    this._timeSinceLoad += deltaSeconds;

    // ── Intro Reveal Logic ──────────────────────────────────────────────
    if (!this._introRevealed) {
      this._stillnessTimer += deltaSeconds;
      
      // If user is perfectly still for 1.0s, OR they have been moving non-stop for 3.0s (inevitability)
      if (this._stillnessTimer > 1.0 || this._timeSinceLoad > 3.0) {
        EventBus.emit(EVENTS.INTRO_REVEALED, {});
      }
    }

    // ── Smoothly interpolate animation params toward target ────────────────
    // This creates natural transition feel when behavior state changes.
    this._lerpParams(deltaSeconds);

    const p = this._currentParams;

    // ── Intentional imperfection — reaction to startling movement ──────────────
    this._tickHesitation(deltaSeconds);
    
    // ── Probabilistic Initiative & Habitat Safety ─────────────────────────────
    this._evaluateInitiative(deltaSeconds);

    const hesitationMod = this._isHesitating ? 0.15 : 1.0;

    // ── Breathing (scale oscillation) ─────────────────────────────────────
    // Uses organicSine — has subtle asymmetry, feels like a real breath.
    
    // Temperament modifier
    // Guarded (-1): fast, shallow breath. Playful (+1): slow, deep breath.
    let speedMod = 1.0;
    let ampMod = 1.0;
    if (this._temperament < 0) {
      speedMod = 1.0 + (Math.abs(this._temperament) * 0.5); // Up to 50% faster
      ampMod = 1.0 - (Math.abs(this._temperament) * 0.3); // Up to 30% shallower
    } else {
      speedMod = 1.0 - (this._temperament * 0.3); // Up to 30% slower
      ampMod = 1.0 + (this._temperament * 0.4); // Up to 40% deeper
    }

    const currentBreathSpeed = p.breathSpeed * this._calmMultiplier * speedMod;
    const breathRaw = organicSine(this._time, currentBreathSpeed, this._breathPhase);
    const breathValue = breathRaw * (p.breathAmplitude * ampMod);
    
    // Decay the interaction expansion quickly (120-180ms feel)
    this._interactionExpansion = expDecay(this._interactionExpansion, 0, 15, deltaSeconds);
    
    this._state.breathScale = 1.0 + breathValue + this._interactionExpansion;

    // ── Counter-rotation ──────────────────────────────────────────────────
    // Outer rotates clockwise, inner counter-clockwise.
    // Small perturbation from valueNoise gives organic feel to the rotation rate.
    const noiseT = this._time * 0.15;
    const rotationNoise = valueNoise2D(noiseT, noiseT * 0.7) * 0.3 + 0.85;

    const rotSpeed = p.rotationSpeed * this._calmMultiplier * rotationNoise * hesitationMod;
    this._state.outerRotation += rotSpeed * deltaSeconds;
    this._state.innerRotation -= rotSpeed * deltaSeconds * 0.73; // Not same speed — offset rhythm

    // Keep rotations bounded to avoid float overflow over very long sessions
    if (this._state.outerRotation > TWO_PI)  this._state.outerRotation -= TWO_PI;
    if (this._state.innerRotation < -TWO_PI) this._state.innerRotation += TWO_PI;

    // ── Idle drift (slow 2D wander in world space) ─────────────────────────
    // Uses two independent organicSines on different phases for Lissajous-like paths.
    let driftX = organicSine(this._time, 0.07, this._driftPhaseX) * p.driftScale;
    let driftY = organicSine(this._time, 0.05, this._driftPhaseY) * p.driftScale;

    if (this._prefersReducedMotion) {
      driftX = 0;
      driftY = 0;
    }

    // Smoothly approach drift target (expDecay prevents snapping)
    this._state.driftX = expDecay(this._state.driftX, driftX, 2.5, deltaSeconds);
    this._state.driftY = expDecay(this._state.driftY, driftY, 2.5, deltaSeconds);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * Smoothly interpolate current animation params toward target params.
   * Makes behavior state transitions feel gradual, not instant.
   * @private
   */
  _lerpParams(deltaSeconds) {
    const speed = 1.5 * deltaSeconds; // Interpolation speed
    const p     = this._currentParams;
    const t     = this._targetParams;

    p.breathSpeed      = lerp(p.breathSpeed,      t.breathSpeed,      speed);
    p.breathAmplitude  = lerp(p.breathAmplitude,  t.breathAmplitude,  speed);
    p.rotationSpeed    = lerp(p.rotationSpeed,    t.rotationSpeed,    speed);
    p.driftScale       = lerp(p.driftScale,       t.driftScale,       speed);
    p.hesitationChance = lerp(p.hesitationChance, t.hesitationChance, speed);
  }

  /**
   * Manage intentional hesitation moments — entity pauses when startled.
   * @private
   */
  _tickHesitation(deltaSeconds) {
    if (this._isHesitating) {
      this._hesitationTimer -= deltaSeconds;
      if (this._hesitationTimer <= 0) {
        this._isHesitating = false;
      }
    }
  }

  /**
   * Evaluates if the organism should take autonomous action.
   * Driven by intrinsic motivation (safety, trust, stillness, temperament).
   * @private
   */
  _evaluateInitiative(deltaSeconds) {
    if (!this._introRevealed || !this._memoryData) return;
    
    // 1. Calculate Habitat Safety
    // The safe zone is the spatial bias (where the user usually interacts).
    // The organism is at (0.5, 0.5) roughly.
    const orgX = 0.5;
    const orgY = 0.5;
    const biasX = this._memoryData.spatialBiasX || 0.5;
    const biasY = this._memoryData.spatialBiasY || 0.5;
    
    const dx = orgX - biasX;
    const dy = orgY - biasY;
    const distToSafeZone = Math.sqrt(dx * dx + dy * dy);
    // max distance is ~0.707. Normalize to 0 (unsafe) to 1 (safe).
    const habitatSafety = 1.0 - Math.min(1.0, distToSafeZone / 0.7);

    // Deep Habitat Influence: 
    // If unsafe, it freezes (movement decreases, observes cautiously)
    if (habitatSafety < 0.3) {
       this._targetParams.driftScale = STATE_ANIM_PARAMS[this._behaviorState].driftScale * 0.2;
    } else {
       this._targetParams.driftScale = STATE_ANIM_PARAMS[this._behaviorState].driftScale;
    }

    // 2. Tick current initiative action if active
    if (this._currentInitiative) {
      this._initiativeTimer -= deltaSeconds;
      if (this._initiativeTimer <= 0) {
        this._currentInitiative = null;
        // Restore normal params
        this._targetParams = { ...STATE_ANIM_PARAMS[this._behaviorState] };
      }
      
      // Apply initiative overrides
      if (this._currentInitiative === 'reach') {
         // Subtly reach out: higher drift, deeper breath
         this._targetParams.driftScale = STATE_ANIM_PARAMS[this._behaviorState].driftScale * 2.5;
         this._targetParams.breathAmplitude = STATE_ANIM_PARAMS[this._behaviorState].breathAmplitude * 1.5;
      } else if (this._currentInitiative === 'observe') {
         // Pause breathing, slight rotation spike to 'look', no drift
         this._targetParams.breathSpeed = 0.05;
         this._targetParams.driftScale = 0;
         this._targetParams.rotationSpeed = STATE_ANIM_PARAMS[this._behaviorState].rotationSpeed * 3.0;
      }
      return; // Already taking action
    }

    // 3. Probabilistic Evaluation
    // Only evaluate if completely still for > 4 seconds
    if (this._stillnessTimer > 4.0) {
       // Evaluate sporadically (~45% chance per second to make a decision check)
       if (Math.random() < 0.01) { 
         // Why did the organism decide to do this now?
         // Motivation = 50% Trust + 30% Temperament + 20% Habitat Safety
         const motivationScore = (this._memoryData.trust / 100) * 0.5 + 
                                 ((this._temperament + 1) / 2) * 0.3 + 
                                 habitatSafety * 0.2;

         if (motivationScore > 0.7) {
           // Motivation: The organism feels completely safe and trusted. It wants contact.
           if (Math.random() < 0.6) {
             this._currentInitiative = 'reach';
             this._initiativeTimer = randomFloat(2.0, 4.0);
           } else {
             // Sometimes it just watches you peacefully
             this._currentInitiative = 'observe';
             this._initiativeTimer = randomFloat(1.5, 3.0);
           }
         } else if (motivationScore < 0.3) {
           // Motivation: The organism feels unsafe or traumatized. It is deeply suspicious of the stillness.
           if (Math.random() < 0.6) {
             // It flinches, expecting a sudden movement
             this._isHesitating = true;
             this._hesitationDuration = randomFloat(0.3, 0.7);
             this._hesitationTimer = this._hesitationDuration;
           } else {
             // It freezes to observe the threat
             this._currentInitiative = 'observe';
             this._initiativeTimer = randomFloat(2.0, 4.0);
           }
         } else {
           // Motivation: Neutral. It's unsure what to do, so it just observes cautiously.
           if (Math.random() < 0.4) {
             this._currentInitiative = 'observe';
             this._initiativeTimer = randomFloat(1.0, 2.5);
           }
         }
       }
    }
  }
}
