/**
 * SPECIMEN — StateDefinitions
 *
 * Defines what each behavior state means for the entity.
 * Every state specifies:
 *   - Visual modifiers (scale, speed, opacity changes)
 *   - Pulse timing behavior
 *   - Intentional imperfections
 *   - Transition conditions
 */

import { BEHAVIOR_STATES } from '../constants.js';

/**
 * @typedef {Object} StateDefinition
 * @property {string} name
 * @property {string} description — For developers, not users.
 * @property {number} pulseFrequencyMod — Multiplier on base pulse rate.
 * @property {number} scaleTarget — Entity scale target.
 * @property {number} animationSpeedMod — Multiplier on animation speed.
 * @property {number} imperfectionChance — [0, 1] chance of hesitation per action.
 * @property {boolean} suppressesPulses — If true, entity does not pulse.
 * @property {number} minDurationMs — Min time in this state before transitioning.
 */

/** @type {Record<string, StateDefinition>} */
export const STATE_DEFINITIONS = Object.freeze({
  [BEHAVIOR_STATES.CURIOUS]: {
    name: 'Curious',
    description: 'Entity is drawn toward the visitor. Alert. Interested.',
    pulseFrequencyMod: 1.5,
    scaleTarget: 1.05,
    animationSpeedMod: 1.2,
    imperfectionChance: 0.1,
    suppressesPulses: false,
    minDurationMs: 2000,
  },

  [BEHAVIOR_STATES.CALM]: {
    name: 'Calm',
    description: 'Entity is at rest. Slow, rhythmic, patient.',
    pulseFrequencyMod: 1.0,
    scaleTarget: 1.0,
    animationSpeedMod: 1.0,
    imperfectionChance: 0.05,
    suppressesPulses: false,
    minDurationMs: 3000,
  },

  [BEHAVIOR_STATES.DEFENSIVE]: {
    name: 'Defensive',
    description: 'Entity contracts. Withdraws. Pulses stop.',
    pulseFrequencyMod: 0,
    scaleTarget: 0.8,
    animationSpeedMod: 0.5,
    imperfectionChance: 0.0,
    suppressesPulses: true,
    minDurationMs: 4000,
  },

  [BEHAVIOR_STATES.HESITANT]: {
    name: 'Hesitant',
    description: 'Entity is uncertain. Timing irregular. Small tremors.',
    pulseFrequencyMod: 0.6,
    scaleTarget: 0.95,
    animationSpeedMod: 0.8,
    imperfectionChance: 0.4,   // High — often hesitates
    suppressesPulses: false,
    minDurationMs: 2500,
  },

  [BEHAVIOR_STATES.TRUSTING]: {
    name: 'Trusting',
    description: 'Entity is open. Fluid. Resonant. Aligned with visitor.',
    pulseFrequencyMod: 1.4,
    scaleTarget: 1.08,
    animationSpeedMod: 1.1,
    imperfectionChance: 0.02,
    suppressesPulses: false,
    minDurationMs: 3000,
  },

  [BEHAVIOR_STATES.OBSERVING]: {
    name: 'Observing',
    description: 'Transient. Entity goes completely still and silent. Watches.',
    pulseFrequencyMod: 0,
    scaleTarget: 1.0,
    animationSpeedMod: 0.1,    // Almost frozen
    imperfectionChance: 0.0,
    suppressesPulses: true,
    minDurationMs: 5000,       // Exactly 5 seconds
  },
});
