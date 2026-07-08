/**
 * SPECIMEN — Entity
 *
 * The unknown presence.
 * Owns position, scale, rotation, opacity, and behavioral state visual mapping.
 * Delegates geometry rendering to Geometry.js and animation to EntityAnimator.js.
 *
 * ⚠️  Stub: Full implementation in Milestone 2 (Entity Foundation).
 *          Only the interface and data schema are defined here.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, BEHAVIOR_STATES } from '../constants.js';

export class Entity {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   */
  constructor(coords) {
    this._coords = coords;

    // ─── State ──────────────────────────────────────────────────────────────
    /** @type {number} Normalized x position [-1, 1] */
    this.nx = 0;
    /** @type {number} Normalized y position [-1, 1] */
    this.ny = 0;
    /** @type {number} Scale multiplier [0, 1+] */
    this.scale = 1;
    /** @type {number} Rotation in radians */
    this.rotation = 0;
    /** @type {number} Master opacity [0, 1] */
    this.opacity = 0;
    /** @type {string} Current behavior state */
    this.behaviorState = BEHAVIOR_STATES.CALM;

    // ─── Subscriptions ──────────────────────────────────────────────────────
    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
      this.behaviorState = state;
    });

    EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
      this._render(tickData);
    });
  }

  /**
   * Initialize the entity and begin its intro.
   * Called once after all systems are wired.
   */
  init() {
    // Milestone 2: fade in, begin idle animation
  }

  /**
   * @private
   * @param {import('../engine/Renderer.js').RenderTickData} tickData
   */
  _render(tickData) {
    // Milestone 2: draw geometry on ctx
  }
}
