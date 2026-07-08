/**
 * SPECIMEN — Entity
 *
 * The unknown presence.
 *
 * The Entity is a coordinator:
 *   - Owns the mutable EntityState object
 *   - Delegates animation to EntityAnimator
 *   - Delegates geometry rendering to Geometry
 *   - Subscribes to RENDER_TICK and orchestrates the draw call
 *   - Manages fade-in intro and cursor tracking (for Curious state)
 *
 * DESIGN RULE: Identity comes from behavior, not appearance.
 * The entity exists at canvas center ± idle drift.
 * It breathes. It hesitates. It watches.
 * It does NOT have eyes, a face, or a fixed expression.
 *
 * @typedef {Object} EntityState
 * @property {number} breathScale    — [0.95, 1.05] current breathing scale
 * @property {number} outerRotation  — Outer triangle rotation (radians)
 * @property {number} innerRotation  — Inner triangle rotation (radians)
 * @property {number} driftX         — World-space X drift [-0.05, 0.05]
 * @property {number} driftY         — World-space Y drift [-0.05, 0.05]
 * @property {number} masterOpacity  — [0, 1] fade-in / fade-out
 * @property {string} behaviorState  — Current behavior state name
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, BEHAVIOR_STATES, TIMING } from '../constants.js';
import { Geometry } from './Geometry.js';
import { EntityAnimator } from './EntityAnimator.js';
import { lerp, smootherstep } from '../utils/MathUtils.js';

export class Entity {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   * @param {import('../engine/AnimationScheduler.js').AnimationScheduler} scheduler
   */
  constructor(coords, scheduler) {
    this._coords    = coords;
    this._scheduler = scheduler;

    // ─── Shared mutable state ─────────────────────────────────────────────
    // This object is passed to EntityAnimator so both share the same reference.
    // The Geometry renderer reads from it at draw time.
    /** @type {EntityState} */
    this._state = {
      breathScale:    1.0,
      outerRotation:  0,
      innerRotation:  0,
      driftX:         0,
      driftY:         0,
      masterOpacity:  0,   // Starts at 0 — fades in on init()
      behaviorState:  BEHAVIOR_STATES.CALM,
    };

    // ─── Systems ──────────────────────────────────────────────────────────
    this._geometry = new Geometry(coords);
    this._animator = new EntityAnimator(this._state);

    // ─── Cursor tracking (for Curious state lean) ─────────────────────────
    /** @type {{ wx: number, wy: number }} Cursor in world space */
    this._cursorWorld = { wx: 0, wy: 0 };

    /** @type {{ wx: number, wy: number }} Smoothed cursor lean */
    this._cursorLean  = { wx: 0, wy: 0 };

    // ─── Subscriptions ────────────────────────────────────────────────────
    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
      this._state.behaviorState = state;
    });

    EventBus.on(EVENTS.RESIZE, () => {
      this._geometry.rebuildCache();
    });

    EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
      const { wx, wy } = coords.screenToWorld(x, y);
      this._cursorWorld.wx = wx;
      this._cursorWorld.wy = wy;
    });

    EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
      this._onTick(tickData);
    });
  }

  /**
   * Initialize the entity.
   * Triggers the fade-in intro via AnimationScheduler.
   * Call after all systems are wired.
   */
  init() {
    // Fade entity in from opacity 0 → 1 over 2.4s using smootherstep easing.
    // Delayed by 600ms — let the black canvas establish the room first.
    this._scheduler.schedule({
      name:     'entity-fade-in',
      duration: 2400,
      delay:    600,
      easing:   smootherstep,
      onUpdate: (t) => {
        this._state.masterOpacity = t;
      },
    });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * Main render callback — called every frame by RENDER_TICK.
   * @private
   * @param {import('../engine/Renderer.js').RenderTickData} tickData
   */
  _onTick(tickData) {
    const { ctx, deltaSeconds } = tickData;

    // Update animations
    this._animator.update(deltaSeconds);

    // Cursor lean: in Curious state, entity drifts slightly toward cursor
    this._updateCursorLean(deltaSeconds);

    // Convert world position to screen
    const worldX = this._state.driftX + this._cursorLean.wx;
    const worldY = this._state.driftY + this._cursorLean.wy;
    const screen = this._coords.worldToScreen(worldX, worldY);

    // Temporarily translate context to entity's current screen position.
    // Geometry renders relative to the center it was given, so we offset it.
    const baseCx = this._coords.center.x;
    const baseCy = this._coords.center.y;
    const offsetX = screen.x - baseCx;
    const offsetY = screen.y - baseCy;

    if (offsetX !== 0 || offsetY !== 0) {
      ctx.save();
      ctx.translate(offsetX, offsetY);
    }

    // Draw geometry
    this._geometry.render(
      ctx,
      this._state.outerRotation,
      this._state.innerRotation,
      this._state.masterOpacity,
      this._state.breathScale,
      this._state.behaviorState,
    );

    if (offsetX !== 0 || offsetY !== 0) {
      ctx.restore();
    }
  }

  /**
   * Lean toward cursor in Curious state, return to neutral otherwise.
   * @private
   */
  _updateCursorLean(deltaSeconds) {
    const isCurious = this._state.behaviorState === BEHAVIOR_STATES.CURIOUS;
    const leanStrength = isCurious ? 0.06 : 0;

    // Target lean = a fraction of cursor world position (clamped to avoid large offset)
    const targetLeanX = Math.max(-0.08, Math.min(0.08, this._cursorWorld.wx * leanStrength));
    const targetLeanY = Math.max(-0.08, Math.min(0.08, this._cursorWorld.wy * leanStrength));

    // Smoothly approach target lean (expDecay for organic feel)
    const speed = isCurious ? 1.2 : 2.5; // Faster return to center when not curious
    this._cursorLean.wx = lerp(this._cursorLean.wx, targetLeanX, speed * deltaSeconds);
    this._cursorLean.wy = lerp(this._cursorLean.wy, targetLeanY, speed * deltaSeconds);
  }
}
