/**
 * SPECIMEN — PulseGenerator
 *
 * The entity tries to communicate.
 * Emits pulses at deliberately non-deterministic intervals.
 *
 * Core Design Philosophy:
 *   This is NOT a metronome. The entity is not a machine.
 *   It thinks before it speaks. Sometimes it hesitates longer.
 *   Sometimes it reaches out sooner. It has a rhythm, but not a schedule.
 *
 * Non-Determinism (how it works):
 *   Each state has a [min, max] interval range.
 *   After emitting a pulse, the next interval is chosen randomly within that range.
 *   Additionally: a small "hesitation variance" is applied — the entity can
 *   decide at the last moment to wait an extra 150–900ms before actually pulsing.
 *   This creates the feeling of a presence that deliberates.
 *
 * State behavior:
 *   CURIOUS   → pulses frequently, eager to communicate
 *   CALM      → slow, patient, waits for the visitor to be ready
 *   DEFENSIVE → silent entirely
 *   HESITANT  → long pauses, uncertain
 *   TRUSTING  → most frequent, fluid, aligned
 *   OBSERVING → completely silent
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, BEHAVIOR_STATES, TIMING } from '../constants.js';
import { randomFloat } from '../utils/MathUtils.js';

/**
 * Base pulse interval ranges (ms) per behavior state.
 * [min, max] — actual interval is random within range + hesitation variance.
 * [0, 0] means completely silent.
 */
const PULSE_INTERVALS = {
  [BEHAVIOR_STATES.CURIOUS]:   { min: 1400, max: 2200 },
  [BEHAVIOR_STATES.CALM]:      { min: 2800, max: 4500 },
  [BEHAVIOR_STATES.DEFENSIVE]: { min: 0,    max: 0    }, // Silent
  [BEHAVIOR_STATES.HESITANT]:  { min: 3500, max: 6500 },
  [BEHAVIOR_STATES.TRUSTING]:  { min: 1100, max: 1900 },
  [BEHAVIOR_STATES.OBSERVING]: { min: 0,    max: 0    }, // Silent
};

export class PulseGenerator {
  constructor() {
    /** @type {string} */
    this._state = BEHAVIOR_STATES.CALM;

    /** @type {number|null} Current scheduled timer ID */
    this._timer = null;

    /** @type {boolean} */
    this._active = false;

    /** @type {number} Timestamp of the most recently emitted pulse */
    this._lastPulseTime = 0;

    /** @type {number} Global modifier for intervals (M8 calm effect) */
    this._calmMultiplier = 1.0;

    // Listen for behavior state changes
    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
      const wasSilent = this._isSilentState(this._state);
      const willBeSilent = this._isSilentState(state);
      this._state = state;

      if (wasSilent && !willBeSilent && this._active) {
        // Was silent, now can pulse — reschedule immediately
        this._scheduleNext(randomFloat(500, 1200));
      }
      // If transitioning TO a silent state, the existing scheduled pulse
      // will be caught by the _isSilentState check in _emit()
    });

    EventBus.on(EVENTS.SIGNATURE_MOMENT_START, () => {
      this.stop(); // Stop pulsing during the absorption
    });

    EventBus.on(EVENTS.SIGNATURE_MOMENT_END, () => {
      this._calmMultiplier = 1.4; // Permanently slow down all heartbeat intervals
      this.start();
    });
  }

  /**
   * Start the pulse generator.
   * First pulse is delayed — let silence establish the room.
   */
  start() {
    if (this._active) return;
    this._active = true;
    this._scheduleNext(TIMING.FIRST_PULSE_DELAY_MS);
  }

  /**
   * Stop all pulse generation immediately.
   */
  stop() {
    this._active = false;
    this._clearTimer();
  }

  /** @returns {number} Timestamp of the last pulse (performance.now()) */
  get lastPulseTime() { return this._lastPulseTime; }

  // ─── Private ──────────────────────────────────────────────────────────────

  /** @private */
  _emit() {
    if (!this._active) return;

    // If in a silent state at the moment of firing, skip and poll again later
    if (this._isSilentState(this._state)) {
      this._scheduleNext(800);
      return;
    }

    this._lastPulseTime = performance.now();

    EventBus.emit(EVENTS.ENTITY_PULSE_EMITTED, {
      timestamp:     this._lastPulseTime,
      behaviorState: this._state,
    });

    EventBus.emit(EVENTS.AUDIO_PULSE_TRIGGER, {
      behaviorState: this._state,
    });

    // Schedule next pulse with non-deterministic interval
    const interval = this._getNextInterval();
    this._scheduleNext(interval);
  }

  /**
   * Calculate the next pulse interval.
   * Base range from state config + a deliberation variance.
   * The entity sometimes decides to wait longer at the last moment.
   * @private
   * @returns {number} Milliseconds until next pulse
   */
  _getNextInterval() {
    const range = PULSE_INTERVALS[this._state] ?? PULSE_INTERVALS[BEHAVIOR_STATES.CALM];
    const base  = randomFloat(range.min, range.max);

    // Hesitation variance — 30% chance the entity waits a bit extra
    const hesitates = Math.random() < 0.3;
    const extra     = hesitates ? randomFloat(
      TIMING.RESPONSE_VARIATION_MIN_MS,
      TIMING.RESPONSE_VARIATION_MAX_MS,
    ) : 0;

    return (base + extra) * this._calmMultiplier;
  }

  /**
   * @private
   * @param {number} delayMs
   */
  _scheduleNext(delayMs) {
    this._clearTimer();
    this._timer = setTimeout(() => {
      this._timer = null;
      this._emit();
    }, delayMs);
  }

  /** @private */
  _clearTimer() {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * @private
   * @param {string} state
   * @returns {boolean}
   */
  _isSilentState(state) {
    const range = PULSE_INTERVALS[state];
    return !range || (range.min === 0 && range.max === 0);
  }
}
