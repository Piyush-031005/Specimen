/**
 * SPECIMEN — BehaviorEngine
 *
 * The Finite State Machine that gives the entity personality.
 *
 * Manages:
 *   - Current state + transitions
 *   - Trust accumulation and decay
 *   - Recent interaction history (for match rate calculation)
 *   - Observing state timer
 *   - Emitting BEHAVIOR_STATE_CHANGED and BEHAVIOR_TRUST_UPDATED events
 *
 * ⚠️  Stub: Full FSM implementation in Milestone 4.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, BEHAVIOR_STATES, TRUST, TIMING } from '../constants.js';
import { evaluateTransition } from './TransitionRules.js';
import { clamp } from '../utils/MathUtils.js';

const EVALUATION_INTERVAL_MS = 5000;  // How often to run transition checks
const HISTORY_LENGTH = 10;            // Last N interactions for match rate

export class BehaviorEngine {
  constructor() {
    /** @type {string} */
    this._state = BEHAVIOR_STATES.CALM;

    /** @type {number} [0, 100] */
    this._trust = TRUST.INITIAL;

    /** @type {boolean[]} Last N match results */
    this._history = [];

    /** @type {number} Seconds since last user input */
    this._idleSeconds = 0;

    /** @type {number|null} Timestamp when current state was entered */
    this._stateEnteredAt = null;

    /** @type {number|null} Observing timeout handle */
    this._observingTimer = null;

    /** @type {string|null} State before Observing — to resume afterward */
    this._preObservingState = null;

    this._setupListeners();
  }

  /**
   * Initialize. Call after all systems are wired.
   */
  init() {
    this._stateEnteredAt = performance.now();
    this._startEvaluationLoop();
    this._startIdleTracking();
  }

  /** @returns {string} Current behavior state */
  get state() { return this._state; }

  /** @returns {number} Current trust [0, 100] */
  get trust() { return this._trust; }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** @private */
  _setupListeners() {
    EventBus.on(EVENTS.COMMUNICATION_MATCH, () => {
      this._recordInteraction(true);
      this._adjustTrust(TRUST.MATCH_GAIN);
    });

    EventBus.on(EVENTS.COMMUNICATION_MISS, () => {
      this._recordInteraction(false);
      this._adjustTrust(-TRUST.MISS_PENALTY);
    });

    EventBus.on(EVENTS.USER_INPUT, () => {
      this._idleSeconds = 0;
    });
  }

  /** @private */
  _recordInteraction(wasMatch) {
    this._history.push(wasMatch);
    if (this._history.length > HISTORY_LENGTH) {
      this._history.shift();
    }
  }

  /** @private */
  _adjustTrust(delta) {
    this._trust = clamp(this._trust + delta, TRUST.MIN, TRUST.MAX);
    EventBus.emit(EVENTS.BEHAVIOR_TRUST_UPDATED, { trust: this._trust });
  }

  /** @private */
  _getRecentMatchRate() {
    if (this._history.length === 0) return 0.5;
    return this._history.filter(Boolean).length / this._history.length;
  }

  /** @private */
  _startEvaluationLoop() {
    setInterval(() => {
      if (this._state === BEHAVIOR_STATES.OBSERVING) return; // Never interrupt Observing

      const newState = evaluateTransition({
        currentState: this._state,
        trust: this._trust,
        recentMatchRate: this._getRecentMatchRate(),
        idleSeconds: this._idleSeconds,
      });

      if (newState && newState !== this._state) {
        this._transition(newState);
      }
    }, EVALUATION_INTERVAL_MS);
  }

  /** @private */
  _startIdleTracking() {
    // Decay trust and increment idle counter each second
    setInterval(() => {
      this._idleSeconds += 1;
      this._adjustTrust(-TRUST.IDLE_DECAY_RATE);
    }, 1000);
  }

  /**
   * @private
   * @param {string} newState
   */
  _transition(newState) {
    const previous = this._state;
    this._state = newState;
    this._stateEnteredAt = performance.now();

    if (newState === BEHAVIOR_STATES.OBSERVING) {
      this._preObservingState = previous;
      EventBus.emit(EVENTS.AUDIO_OBSERVING_START);
      this._observingTimer = setTimeout(() => {
        this._observingTimer = null;
        EventBus.emit(EVENTS.AUDIO_OBSERVING_END);
        // Resume from previous state (adjusted for trust level)
        const resumeState = this._preObservingState ?? BEHAVIOR_STATES.CALM;
        this._transition(resumeState);
      }, TIMING.OBSERVING_DURATION_MS);
    }

    EventBus.emit(EVENTS.BEHAVIOR_STATE_CHANGED, {
      state: newState,
      previous,
      trust: this._trust,
    });
  }
}
