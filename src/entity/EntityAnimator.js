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
      this._targetParams = STATE_ANIM_PARAMS[state] ?? STATE_ANIM_PARAMS[BEHAVIOR_STATES.CALM];
    });

    EventBus.on(EVENTS.SIGNATURE_MOMENT_END, () => {
      this._calmMultiplier = 0.6; // Permanently calm the entity down after M8
    });

    EventBus.on(EVENTS.AUDIO_MATCH_TRIGGER, () => {
      // Subtle heartbeat expansion (max 2-5%)
      this._interactionExpansion = randomFloat(0.02, 0.05);
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

    // ── Smoothly interpolate animation params toward target ────────────────
    // This creates natural transition feel when behavior state changes.
    this._lerpParams(deltaSeconds);

    const p = this._currentParams;

    // ── Intentional imperfection — reaction to startling movement ──────────────
    this._tickHesitation(deltaSeconds);

    const hesitationMod = this._isHesitating ? 0.15 : 1.0;

    // ── Breathing (scale oscillation) ─────────────────────────────────────
    // Uses organicSine — has subtle asymmetry, feels like a real breath.
    const currentBreathSpeed = p.breathSpeed * this._calmMultiplier;
    const breathRaw = organicSine(this._time, currentBreathSpeed, this._breathPhase);
    const breathValue = breathRaw * p.breathAmplitude;
    
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
}
