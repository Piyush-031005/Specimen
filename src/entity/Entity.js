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
      masterOpacity:  0,   // Starts at 0
      behaviorState:  BEHAVIOR_STATES.CALM,
      isUnraveled:    false,
    };

    /** @type {number} Current world stage (0-5) */
    this._worldStage = 0; // Starts in DARKNESS

    /** @type {number|null} Timestamp when entity was born */
    this._birthTime = null;

    // Cinematic reveal offsets
    this._cinematicOffsetX = -0.6; // Start significantly off-screen
    this._cinematicOffsetY = -0.3;

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
    
    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stageDef }) => {
      this._worldStage = stageDef.stage;
    });

    EventBus.on(EVENTS.RESIZE, () => {
      this._geometry.rebuildCache();
    });

    EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
      const { wx, wy } = coords.screenToWorld(x, y);
      this._cursorWorld.wx = wx;
      this._cursorWorld.wy = wy;
    });

    EventBus.on(EVENTS.FIBER_PLUCK, ({ velocityX, yPos }) => {
      this._state.isUnraveled = true;
    });

    EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
      this._onTick(tickData);
    });
  }

  /**
   * Initialize the entity.
   * Compresses the birth sequence for immediate impact.
   */
  init() {
    this._birthTime = performance.now();
    
    // 0.2s: Instantly appear (masterOpacity = 1)
    // Geometry logic will handle drawing the core dot first, then the rest.
    this._scheduler.schedule({
      name:     'entity-birth',
      duration: 100,
      delay:    200,
      easing:   smootherstep,
      onUpdate: (t) => {
        this._state.masterOpacity = t;
      },
    });

    // 1.0s to 3.0s: The shadow passes and the membrane pulls into the center
    this._scheduler.schedule({
      name:     'entity-cinematic-pull',
      duration: 2000,
      delay:    1000, // Starts moving at 1.0s
      easing:   smootherstep,
      onUpdate: (t) => {
        this._cinematicOffsetX = -0.6 * (1 - t);
        this._cinematicOffsetY = -0.3 * (1 - t);
      }
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

    // Convert world position to screen, incorporating the cinematic reveal offset
    const worldX = this._state.driftX + this._cursorLean.wx + this._cinematicOffsetX;
    const worldY = this._state.driftY + this._cursorLean.wy + this._cinematicOffsetY;
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

    const timeSinceBirth = this._birthTime ? (performance.now() - this._birthTime) / 1000 : 0;

    // Draw geometry
    this._geometry.render(
      ctx,
      this._state.outerRotation,
      this._state.innerRotation,
      this._state.masterOpacity,
      this._state.breathScale,
      this._state.behaviorState,
      this._worldStage,
      timeSinceBirth
    );

    if (offsetX !== 0 || offsetY !== 0) {
      ctx.restore();
    }
  }

  /**
   * Lean toward cursor and react subtly to proximity.
   * @private
   */
  _updateCursorLean(deltaSeconds) {
    const isCurious = this._state.behaviorState === BEHAVIOR_STATES.CURIOUS;
    const leanStrength = isCurious ? 0.06 : 0.01; // Always slightly aware now

    // Target lean = a fraction of cursor world position
    const targetLeanX = Math.max(-0.08, Math.min(0.08, this._cursorWorld.wx * leanStrength));
    const targetLeanY = Math.max(-0.08, Math.min(0.08, this._cursorWorld.wy * leanStrength));

    // Smoothly approach target lean
    const speed = isCurious ? 1.2 : 2.0; 
    this._cursorLean.wx = lerp(this._cursorLean.wx, targetLeanX, speed * deltaSeconds);
    this._cursorLean.wy = lerp(this._cursorLean.wy, targetLeanY, speed * deltaSeconds);

    // Micro proximity awareness (distance from center)
    const distSq = this._cursorWorld.wx * this._cursorWorld.wx + this._cursorWorld.wy * this._cursorWorld.wy;
    // If very close (within 0.3 world units), add a tiny imperceptible skew/rotation modifier to the animator
    if (distSq < 0.09) {
      // Pass a subtle intention to the animator's interaction expansion
      const intensity = (0.09 - distSq) * 0.05; // very tiny
      this._state.outerRotation += intensity * deltaSeconds;
    }
  }
}
