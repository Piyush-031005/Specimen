/**
 * SPECIMEN — HintLayer
 *
 * The absolute minimum UI.
 *
 * Rules:
 *   - Only ONE hint ever shown: "..."
 *   - Shown only after 12 seconds of complete idle
 *   - Disappears after the visitor interacts
 *   - Never shows again in the same session
 *   - No percentages. No diagnostics. No instructions.
 *
 * Silence does more work than any hint could.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, TIMING } from '../constants.js';

export class HintLayer {
  /**
   * @param {HTMLElement} hintEl — The #hint-layer DOM element
   */
  constructor(hintEl) {
    this._el = hintEl;

    /** @type {number|null} */
    this._idleTimer = null;

    /** @type {boolean} */
    this._shown = false;

    /** @type {boolean} */
    this._used = false; // Never show again once used

    EventBus.on(EVENTS.USER_INPUT, () => {
      this._resetIdleTimer();
      this._hideHint();
    });
  }

  /**
   * Start the idle timer.
   */
  start() {
    this._scheduleHint();
  }

  /** @private */
  _scheduleHint() {
    if (this._used) return;
    this._clearTimer();
    this._idleTimer = setTimeout(() => {
      this._showHint();
    }, TIMING.HINT_IDLE_DELAY_MS);
  }

  /** @private */
  _resetIdleTimer() {
    if (this._shown) return;
    this._scheduleHint();
  }

  /** @private */
  _showHint() {
    if (this._shown || this._used) return;
    this._shown = true;
    this._el.textContent = '...';
    this._el.classList.add('visible');
  }

  /** @private */
  _hideHint() {
    if (!this._shown) return;
    this._shown = false;
    this._used = true; // Never show again
    this._el.classList.remove('visible');
    this._clearTimer();
  }

  /** @private */
  _clearTimer() {
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }
}
