/**
 * SPECIMEN — TransitionRules
 *
 * Defines when and how the behavior state machine transitions between states.
 *
 * Key Design Principle: Transitions are based on *patterns*, not single events.
 * A single miss should not immediately cause Defensive.
 * A single match should not immediately cause Trusting.
 * The entity watches for trends.
 */

import { BEHAVIOR_STATES, TRUST } from '../constants.js';

/**
 * @typedef {Object} TransitionContext
 * @property {string} currentState — Current behavior state
 * @property {number} trust — Current trust [0, 100]
 * @property {number} recentMatchRate — [0, 1] match rate over last 10 interactions
 * @property {number} idleSeconds — How long since last user input
 * @property {Record<string, number>} stateVisits — Number of times each state was entered
 */

/**
 * Evaluate whether a state transition should occur.
 * @param {TransitionContext} ctx
 * @returns {string|null} New state, or null if no transition.
 */
export function evaluateTransition(ctx) {
  const { currentState, trust, recentMatchRate, idleSeconds, stateVisits = {} } = ctx;

  // ─── Universal: Observing trigger ─────────────────────────────────────────
  // Entity randomly decides to observe — becomes still and silent.
  // Happens only from Calm or Curious.
  if (
    (currentState === BEHAVIOR_STATES.CALM || currentState === BEHAVIOR_STATES.CURIOUS) &&
    Math.random() < 0.05  // 5% chance per evaluation cycle (every 5s) to trigger Observing
  ) {
    return BEHAVIOR_STATES.OBSERVING;
  }

  // ─── State-specific Transition Logic ──────────────────────────────────────
  
  // Permanently alter thresholds based on history.
  // E.g., if we've been Curious before, it takes more effort to make us Curious again.
  const curiousVisits = stateVisits[BEHAVIOR_STATES.CURIOUS] || 0;
  const hesitantVisits = stateVisits[BEHAVIOR_STATES.HESITANT] || 0;
  const trustingVisits = stateVisits[BEHAVIOR_STATES.TRUSTING] || 0;
  
  switch (currentState) {
    case BEHAVIOR_STATES.CALM:
      if (trust >= 75 + (trustingVisits * 10) && recentMatchRate >= 0.7) {
        return BEHAVIOR_STATES.TRUSTING;
      }
      if (idleSeconds < 3 && recentMatchRate >= (0.5 + curiousVisits * 0.1)) {
        // Active interaction but not yet fully trusting (gets harder to impress)
        return BEHAVIOR_STATES.CURIOUS;
      }
      if (idleSeconds > 12 - (hesitantVisits * 2)) {
        return BEHAVIOR_STATES.HESITANT;
      }
      if (recentMatchRate <= 0.3 && trust < 40) {
        return BEHAVIOR_STATES.DEFENSIVE;
      }
      break;

    case BEHAVIOR_STATES.CURIOUS:
      if (trust >= 75 + (trustingVisits * 10) && recentMatchRate >= 0.7) {
        return BEHAVIOR_STATES.TRUSTING;
      }
      if (idleSeconds > 8 - (curiousVisits * 2)) {
        return BEHAVIOR_STATES.CALM; // Gets bored faster if you've done this before
      }
      if (recentMatchRate <= 0.4) {
        return BEHAVIOR_STATES.HESITANT;
      }
      break;

    case BEHAVIOR_STATES.HESITANT:
      if (idleSeconds < 4 && recentMatchRate >= (0.6 + curiousVisits * 0.1)) {
        return BEHAVIOR_STATES.CURIOUS;
      }
      if (idleSeconds > 15 - (hesitantVisits * 3)) {
        return BEHAVIOR_STATES.DEFENSIVE; // Gives up faster and faster
      }
      if (trust < 20 && recentMatchRate <= 0.2) {
        return BEHAVIOR_STATES.DEFENSIVE;
      }
      if (trust >= 40 && idleSeconds > 5 && recentMatchRate >= 0.5) {
        return BEHAVIOR_STATES.CALM;
      }
      break;

    case BEHAVIOR_STATES.DEFENSIVE:
      if (idleSeconds < 3 && recentMatchRate >= 0.5 && trust >= 10) {
        // Starts opening up again when user proves consistency
        return BEHAVIOR_STATES.HESITANT;
      }
      if (trust >= 35 + (hesitantVisits * 5)) {
        return BEHAVIOR_STATES.CALM; // Harder to calm down if you keep scaring it
      }
      break;

    case BEHAVIOR_STATES.TRUSTING:
      if (idleSeconds > 10) {
        return BEHAVIOR_STATES.CALM;
      }
      if (recentMatchRate <= 0.5 && trust < 70) {
        // Trust broken by consistent misses
        return BEHAVIOR_STATES.HESITANT;
      }
      break;

    case BEHAVIOR_STATES.OBSERVING:
      // Observing is handled by a timer in BehaviorEngine, which resumes the pre-observing state.
      // Do not transition out here.
      return null;
  }

  return null; // No transition
}
