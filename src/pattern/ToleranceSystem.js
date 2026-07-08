/**
 * SPECIMEN — ToleranceSystem
 *
 * Manages the response window for communication matching.
 *
 * Philosophy:
 *   Communication should feel natural, not demanding.
 *   At low trust, the window is generous — the entity is patient.
 *   At high trust, the window tightens — the relationship deepens,
 *   precision starts to matter, but it's never cruel.
 *
 * Window range:
 *   Trust = 0   → 700ms window (very forgiving)
 *   Trust = 100 → 200ms window (tight but fair)
 *
 * Adaptive: responds to BEHAVIOR_TRUST_UPDATED events.
 * Trust is the single source of truth for difficulty.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, TRUST } from '../constants.js';
import { mapRange } from '../utils/MathUtils.js';

const MAX_WINDOW_MS = 700;  // Most forgiving — trust = 0
const MIN_WINDOW_MS = 200;  // Tightest — trust = 100

export class ToleranceSystem {
  constructor() {
    /** @type {number} Current trust level [0, 100] */
    this._trust = TRUST.INITIAL;

    EventBus.on(EVENTS.BEHAVIOR_TRUST_UPDATED, ({ trust }) => {
      this._trust = trust;
    });
  }

  /**
   * Current response window in milliseconds.
   * Larger window = easier, smaller = tighter.
   * @returns {number}
   */
  get maxWindowMs() {
    return mapRange(this._trust, TRUST.MIN, TRUST.MAX, MAX_WINDOW_MS, MIN_WINDOW_MS);
  }

  /**
   * Evaluate a response time against the current tolerance window.
   * @param {number} responseTimeMs — ms elapsed since entity pulse
   * @returns {boolean}
   */
  evaluate(responseTimeMs) {
    return responseTimeMs >= 0 && responseTimeMs <= this.maxWindowMs;
  }

  /**
   * Diagnostic: current window in ms (for DevLog/debug purposes only).
   * Never displayed to user.
   * @returns {number}
   */
  get currentWindowMs() { return this.maxWindowMs; }
}
