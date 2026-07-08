/**
 * SPECIMEN — PulseGenerator
 *
 * The entity tries to communicate through pulses.
 * Emits visual pulses at intentionally irregular intervals.
 *
 * Key Design: NOT deterministic.
 *   - Base interval varies per behavioral state.
 *   - Each interval has a random variation window.
 *   - Entity sometimes "hesitates" — waits longer than expected.
 *   - This creates the feeling of a living, thinking presence.
 *
 * ⚠️  Stub: Full implementation in Milestone 3 (Communication Engine).
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, BEHAVIOR_STATES, TIMING } from '../constants.js';
import { randomFloat } from '../utils/MathUtils.js';

/** Pulse intervals (ms) per behavior state [min, max] */
const PULSE_INTERVALS = {
  [BEHAVIOR_STATES.CURIOUS]:    [1200, 2000],
  [BEHAVIOR_STATES.CALM]:       [2500, 4000],
  [BEHAVIOR_STATES.DEFENSIVE]:  [0, 0],        // No pulses when defensive
  [BEHAVIOR_STATES.HESITANT]:   [3000, 6000],
  [BEHAVIOR_STATES.TRUSTING]:   [1000, 1800],
  [BEHAVIOR_STATES.OBSERVING]:  [0, 0],        // Silence during observation
};

export class PulseGenerator {
  constructor() {
    /** @type {string} Current behavior state */
    this._behaviorState = BEHAVIOR_STATES.CALM;

    /** @type {number|null} setTimeout handle */
    this._nextPulseHandle = null;

    /** @type {boolean} */
    this._active = false;

    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
      this._behaviorState = state;
    });
  }

  /**
   * Start pulse generation.
   * First pulse is delayed by TIMING.FIRST_PULSE_DELAY_MS.
   */
  start() {
    if (this._active) return;
    this._active = true;
    this._scheduleNext(TIMING.FIRST_PULSE_DELAY_MS);
  }

  /**
   * Stop all pulse generation.
   */
  stop() {
    this._active = false;
    if (this._nextPulseHandle !== null) {
      clearTimeout(this._nextPulseHandle);
      this._nextPulseHandle = null;
    }
  }

  /** @private */
  _emit() {
    if (!this._active) return;

    const [min, max] = PULSE_INTERVALS[this._behaviorState] ?? [2000, 3000];
    if (min === 0 && max === 0) {
      // This state suppresses pulses — check again later
      this._scheduleNext(1000);
      return;
    }

    EventBus.emit(EVENTS.ENTITY_PULSE_EMITTED, {
      timestamp: performance.now(),
      behaviorState: this._behaviorState,
    });

    EventBus.emit(EVENTS.AUDIO_PULSE_TRIGGER);

    this._scheduleNext(randomFloat(min, max));
  }

  /**
   * @private
   * @param {number} delayMs
   */
  _scheduleNext(delayMs) {
    this._nextPulseHandle = setTimeout(() => {
      this._nextPulseHandle = null;
      this._emit();
    }, delayMs);
  }
}
