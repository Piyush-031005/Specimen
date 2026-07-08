/**
 * SPECIMEN — RhythmMatcher
 *
 * Detects whether the visitor's response falls within the communication window.
 * This is the core of the encounter mechanic.
 *
 * Design Intent:
 *   The visitor is not solving a puzzle. They are trying to respond to a presence.
 *   The entity reaches out (pulse). The visitor responds (click/tap/space).
 *   If the response comes within a reasonable time window — communication happens.
 *
 * Window management (NO setTimeout — spec requirement):
 *   When a pulse is emitted, we record _windowOpenedAt = performance.now().
 *   On any user input, we check if (now - _windowOpenedAt) <= tolerance.maxWindowMs.
 *   If yes → match. If no → miss (only if there was an open window attempt).
 *   The window naturally expires — no timers needed.
 *
 * First success tracking:
 *   COMMUNICATION_FIRST_SUCCESS is emitted once, the first time a match occurs.
 *   This triggers subtle world changes (handled in BehaviorEngine / WorldEngine).
 *
 * Response time recording:
 *   Every match response time is emitted so MemorySystem can build the
 *   visitor's rhythm fingerprint (fast / moderate / slow).
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class RhythmMatcher {
  /**
   * @param {import('./ToleranceSystem.js').ToleranceSystem} tolerance
   */
  constructor(tolerance) {
    this._tolerance = tolerance;

    // ─── Window state ─────────────────────────────────────────────────────
    /** @type {number|null} performance.now() when last pulse was emitted */
    this._windowOpenedAt  = null;

    /** @type {number} Timestamp of the last entity pulse */
    this._lastPulseTime   = null;

    /** @type {boolean} Whether we are waiting for a user response */
    this._windowOpen      = false;

    /** @type {boolean} Whether the first success has been achieved */
    this._firstSuccess    = false;

    /** @type {number} Count of consecutive misses (affects hesitation feel) */
    this._consecutiveMisses = 0;

    // ─── Subscriptions ────────────────────────────────────────────────────
    EventBus.on(EVENTS.ENTITY_PULSE_EMITTED, ({ timestamp }) => {
      this._onPulseEmitted(timestamp);
    });

    EventBus.on(EVENTS.USER_INPUT, (inputData) => {
      this._onUserInput(inputData);
    });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * A pulse was emitted — open the response window.
   * Any previous open window is discarded (one window at a time).
   * @private
   * @param {number} timestamp
   */
  _onPulseEmitted(timestamp) {
    this._windowOpenedAt = performance.now();
    this._lastPulseTime  = timestamp;
    this._windowOpen     = true;
  }

  /**
   * User provided input — evaluate against open window.
   * @private
   * @param {{ timestamp: number, x: number, y: number }} inputData
   */
  _onUserInput(inputData) {
    const now = performance.now();

    // No active window — this click is not a rhythm response
    if (!this._windowOpen || this._windowOpenedAt === null) return;

    const responseTimeMs = now - this._windowOpenedAt;
    const maxWindow      = this._tolerance.maxWindowMs;

    // Window has expired — late response, not a match
    if (responseTimeMs > maxWindow) {
      // Only penalize if user actually tried to respond (within 2x window)
      if (responseTimeMs < maxWindow * 2) {
        this._recordMiss(responseTimeMs);
      }
      // After 2x window, we silently ignore — they weren't trying
      this._windowOpen = false;
      return;
    }

    // ── Match! ─────────────────────────────────────────────────────────────
    this._windowOpen        = false;
    this._consecutiveMisses = 0;

    EventBus.emit(EVENTS.COMMUNICATION_MATCH, {
      responseTimeMs,
      timestamp: now,
    });

    // Record response time for memory / rhythm fingerprint
    EventBus.emit(EVENTS.USER_PULSE_RESPONSE, {
      success: true,
      responseTimeMs,
      timestamp: now,
    });

    // First success — emit once only
    if (!this._firstSuccess) {
      this._firstSuccess = true;
      // Small delay — let the match settle before the world reacts
      setTimeout(() => {
        EventBus.emit(EVENTS.COMMUNICATION_FIRST_SUCCESS, {
          responseTimeMs,
        });
      }, 200);
    }
  }

  /**
   * Record a miss — visitor responded but outside the tolerance window.
   * @private
   * @param {number} responseTimeMs
   */
  _recordMiss(responseTimeMs) {
    this._consecutiveMisses++;
    const now = performance.now();
    
    EventBus.emit(EVENTS.COMMUNICATION_MISS, {
      consecutiveMisses: this._consecutiveMisses,
      timestamp:         now,
    });

    EventBus.emit(EVENTS.USER_PULSE_RESPONSE, {
      success: false,
      responseTimeMs,
      timestamp: now,
    });
  }
}
