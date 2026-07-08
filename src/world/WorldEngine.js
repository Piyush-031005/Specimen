/**
 * SPECIMEN — WorldEngine
 *
 * Manages world stage progression.
 * Listens to trust updates and transitions stages when thresholds are crossed.
 *
 * Stage transitions are smooth — never abrupt.
 *
 * ⚠️  Stub: Full visual transition implementation in Milestone 5.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, WORLD_STAGES, TRUST } from '../constants.js';
import { STAGE_DEFINITIONS } from './StageDefinitions.js';

export class WorldEngine {
  constructor() {
    /** @type {number} Current stage index */
    this._stage = WORLD_STAGES.DARKNESS;

    /** @type {number} [0, 1] Transition progress to next stage */
    this._transitionProgress = 0;

    EventBus.on(EVENTS.BEHAVIOR_TRUST_UPDATED, ({ trust }) => {
      this._evaluateStage(trust);
    });
  }

  /**
   * Initialize and broadcast the starting stage.
   */
  init() {
    this._transition(this._stage);
  }

  /** @returns {number} Current world stage */
  get stage() { return this._stage; }

  /**
   * @private
   * @param {number} trust
   */
  _evaluateStage(trust) {
    const thresholds = TRUST.STAGE_THRESHOLDS;
    let targetStage = WORLD_STAGES.DARKNESS;

    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (trust >= thresholds[i]) {
        targetStage = i;
        break;
      }
    }

    // Only advance — never skip backwards abruptly (trust decay is gradual)
    if (targetStage > this._stage) {
      // Advance exactly one stage at a time, even if trust spiked
      // This ensures the visual progression is experienced sequentially
      this._transition(this._stage + 1);
    }
  }

  /**
   * @private
   * @param {number} newStage
   */
  _transition(newStage) {
    const previous = this._stage;
    this._stage = newStage;

    const stageDef = STAGE_DEFINITIONS[newStage];

    EventBus.emit(EVENTS.WORLD_STAGE_CHANGED, {
      stage: newStage,
      previous,
      stageDef,
    });
  }
}
