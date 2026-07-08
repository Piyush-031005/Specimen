/**
 * SPECIMEN — ToleranceSystem
 *
 * Manages the response window for rhythm matching.
 * Starts forgiving. Tightens as trust grows.
 *
 * Window at trust=0:   ±600ms — very forgiving
 * Window at trust=100: ±150ms — tight but not cruel
 *
 * ⚠️  Stub: Full implementation in Milestone 3.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';
import { mapRange } from '../utils/MathUtils.js';

const MIN_WINDOW_MS = 150;
const MAX_WINDOW_MS = 600;

export class ToleranceSystem {
  constructor() {
    /** @type {number} Current trust [0, 100] */
    this._trust = 0;

    EventBus.on(EVENTS.BEHAVIOR_TRUST_UPDATED, ({ trust }) => {
      this._trust = trust;
    });
  }

  /**
   * The current acceptable response window in milliseconds.
   * @returns {number}
   */
  get maxWindowMs() {
    return mapRange(this._trust, 0, 100, MAX_WINDOW_MS, MIN_WINDOW_MS);
  }

  /**
   * Evaluate a response time against the current tolerance window.
   * @param {number} responseTimeMs — ms since entity pulse
   * @returns {boolean} true = match
   */
  evaluate(responseTimeMs) {
    return responseTimeMs >= 0 && responseTimeMs <= this.maxWindowMs;
  }
}
