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
import { EVENTS, WORLD_STAGES, TRUST, REALITY_LAWS } from '../constants.js';
import { STAGE_DEFINITIONS } from './StageDefinitions.js';
import { clamp, expDecay } from '../utils/MathUtils.js';

export class WorldEngine {
  constructor() {
    /** @type {number} Current stage index */
    this._stage = WORLD_STAGES.DARKNESS;

    /** @type {number} [0, 1] Transition progress to next stage */
    this._transitionProgress = 0;

    /** @type {number} Global environmental tension [0, 1] */
    this._tension = 0;

    /** @type {number} Global environmental certainty [0, 1] */
    this._certainty = 1.0;

    this._cursorStillness = 0;
    this._recentVelocities = [];
    this._lastCursor = { x: -1, y: -1, time: 0 };
    this._threatPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this._cumulativeDistance = 0;

    EventBus.on(EVENTS.USER_INPUT, ({ x, y, timestamp }) => {
      if (this._lastCursor.x !== -1) {
        const dx = x - this._lastCursor.x;
        const dy = y - this._lastCursor.y;
        const distSq = dx * dx + dy * dy;
        const dt = timestamp - this._lastCursor.time;

        if (dt > 0) {
          const dist = Math.sqrt(distSq);
          this._cumulativeDistance += dist;
          const velocity = dist / dt;
          this._recentVelocities.push(velocity);
          if (this._recentVelocities.length > 20) this._recentVelocities.shift();
        }
      }
      
      this._lastCursor.x = x;
      this._lastCursor.y = y;
      this._lastCursor.time = timestamp;
      this._cursorStillness = 0;
      this._threatPoint.x = x;
      this._threatPoint.y = y;
    });

    EventBus.on(EVENTS.RENDER_TICK, ({ deltaSeconds }) => {
      this._tickPhysics(deltaSeconds);
    });

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
   * Evaluates world physics independently of the organism.
   * "The world moves first."
   * @private
   */
  _tickPhysics(deltaSeconds) {
    this._cursorStillness += deltaSeconds;

    let avgV = 0;
    let variance = 0;
    if (this._recentVelocities.length > 0) {
      let sum = 0;
      for (let v of this._recentVelocities) sum += v;
      avgV = sum / this._recentVelocities.length;
      
      for (let v of this._recentVelocities) {
        variance += (v - avgV) * (v - avgV);
      }
      variance /= this._recentVelocities.length;
    }

    // Film Cut: Standoff triggers on intention, not just a timer. 
    // Intention = They were moving, and now they are deliberately still.
    // Tension builds non-linearly: Nothing... Nothing... Everything. (Math.pow 3)
    if (this._cursorStillness > 0.5 && avgV < 0.2) {
      let rawTension = clamp((this._cursorStillness - 0.5) / 3.0, 0, 1.0);
      this._tension = Math.pow(rawTension, 3); 
    } else {
      // Film Cut: Release = Relief. Tension should decay slowly ("Maybe I was wrong") instead of dropping instantly.
      this._tension = expDecay(this._tension, 0, 2.0, deltaSeconds);
    }

    // Certainty drops when movement is highly erratic/unpredictable
    // Film Cut: Add hesitation. Darkness makes a decision.
    let isErratic = variance > 1.0 || avgV > 3.0;
    if (isErratic) {
      this._timeErratic = (this._timeErratic || 0) + deltaSeconds;
    } else {
      this._timeErratic = 0;
    }

    let targetCertainty = 1.0;
    if (this._timeErratic > 0.5) {
      // It hesitated for 0.5s, now it decides they are a threat
      targetCertainty = 0.0;
    } else if (avgV > 0.5) {
      targetCertainty = 0.5;
    }
    
    // Certainty recovers slowly, and breaks deliberately (decay was 8.0, now 1.5)
    const decay = targetCertainty < this._certainty ? 1.5 : 0.5;
    this._certainty = expDecay(this._certainty, targetCertainty, decay, deltaSeconds);

    // Contrast Principle: First movement is normal (0.1x tension), builds up to full (1.0x) after ~2000px of movement
    const contrastMultiplier = clamp((this._cumulativeDistance - 100) / 2000.0, 0.1, 1.0);

    EventBus.emit('WORLD_PHYSICS_UPDATED', {
      tension: this._tension,
      certainty: this._certainty,
      threatPoint: this._threatPoint,
      contrastMultiplier: contrastMultiplier
    });
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
