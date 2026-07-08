/**
 * SPECIMEN — TransitionRules
 *
 * Defines when and how the behavior state machine transitions between states.
 *
 * Key Design Principle: Transitions are based on *patterns*, not single events.
 * A single miss should not immediately cause Defensive.
 * A single match should not immediately cause Trusting.
 * The entity watches for trends.
 *
 * ⚠️  Stub: Full logic implemented in Milestone 4 (Behavior Engine).
 */

import { BEHAVIOR_STATES, TRUST } from '../constants.js';

/**
 * @typedef {Object} TransitionContext
 * @property {string} currentState — Current behavior state
 * @property {number} trust — Current trust [0, 100]
 * @property {number} recentMatchRate — [0, 1] match rate over last 10 interactions
 * @property {number} idleSeconds — How long since last user input
 * @property {number} sessionCount — How many times this visitor has returned
 */

/**
 * Evaluate whether a state transition should occur.
 * @param {TransitionContext} ctx
 * @returns {string|null} New state, or null if no transition.
 */
export function evaluateTransition(ctx) {
  const { currentState, trust, recentMatchRate, idleSeconds } = ctx;

  // ─── Universal: Observing trigger ─────────────────────────────────────────
  // Entity randomly decides to observe — becomes still and silent.
  // Happens only from Calm or Curious.
  if (
    (currentState === BEHAVIOR_STATES.CALM || currentState === BEHAVIOR_STATES.CURIOUS) &&
    Math.random() < 0.003  // ~0.3% chance per evaluation cycle (~every 5s)
  ) {
    return BEHAVIOR_STATES.OBSERVING;
  }

  // ─── Observing → Resume based on original trust level ─────────────────────
  // Observing is always transient — handled by BehaviorEngine timer.

  // ─── Trust-based transitions ──────────────────────────────────────────────
  if (trust >= 70 && recentMatchRate > 0.7) {
    return BEHAVIOR_STATES.TRUSTING;
  }

  if (trust >= 30 && recentMatchRate >= 0.5) {
    return BEHAVIOR_STATES.CALM;
  }

  if (recentMatchRate < 0.2 && trust < 40) {
    return BEHAVIOR_STATES.DEFENSIVE;
  }

  if (idleSeconds > 8 && currentState !== BEHAVIOR_STATES.DEFENSIVE) {
    return BEHAVIOR_STATES.HESITANT;
  }

  if (trust < 20 && currentState === BEHAVIOR_STATES.HESITANT) {
    return BEHAVIOR_STATES.DEFENSIVE;
  }

  if (currentState === BEHAVIOR_STATES.DEFENSIVE && trust > 25) {
    return BEHAVIOR_STATES.HESITANT; // Slowly opens again
  }

  if (idleSeconds < 3 && currentState === BEHAVIOR_STATES.HESITANT && recentMatchRate > 0.5) {
    return BEHAVIOR_STATES.CURIOUS;
  }

  return null; // No transition
}
