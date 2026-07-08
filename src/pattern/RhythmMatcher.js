/**
 * SPECIMEN — RhythmMatcher
 *
 * Detects whether the visitor's response falls within
 * the acceptable timing window after an entity pulse.
 *
 * This is the core of the communication mechanic.
 * Input: click, spacebar, or tap — nothing else.
 *
 * ⚠️  Stub: Full implementation in Milestone 3.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class RhythmMatcher {
  /**
   * @param {import('./ToleranceSystem.js').ToleranceSystem} tolerance
   */
  constructor(tolerance) {
    this._tolerance = tolerance;

    /** @type {number|null} Timestamp of last pulse from entity */
    this._lastPulseTime = null;

    /** @type {boolean} Whether a response window is currently open */
    this._windowOpen = false;

    EventBus.on(EVENTS.ENTITY_PULSE_EMITTED, ({ timestamp }) => {
      this._onPulse(timestamp);
    });

    EventBus.on(EVENTS.USER_INPUT, (inputData) => {
      this._onUserInput(inputData);
    });
  }

  /** @private */
  _onPulse(timestamp) {
    this._lastPulseTime = timestamp;
    this._windowOpen = true;

    // Window closes after tolerance maximum
    setTimeout(() => {
      if (this._windowOpen) {
        this._windowOpen = false;
        // User did not respond in time — not a miss unless they respond late
      }
    }, this._tolerance.maxWindowMs);
  }

  /** @private */
  _onUserInput(inputData) {
    if (!this._windowOpen || this._lastPulseTime === null) return;

    const responseTime = inputData.timestamp - this._lastPulseTime;
    const isMatch = this._tolerance.evaluate(responseTime);

    this._windowOpen = false;

    if (isMatch) {
      EventBus.emit(EVENTS.COMMUNICATION_MATCH, {
        responseTime,
        timestamp: inputData.timestamp,
      });
      EventBus.emit(EVENTS.AUDIO_MATCH_TRIGGER);
    } else {
      EventBus.emit(EVENTS.COMMUNICATION_MISS, {
        responseTime,
        timestamp: inputData.timestamp,
      });
    }
  }
}
