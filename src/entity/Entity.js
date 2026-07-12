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
import { EVENTS, BEHAVIOR_STATES, TIMING, REALITY_LAWS } from '../constants.js';
import { Geometry } from './Geometry.js';
import { EntityAnimator } from './EntityAnimator.js';
import { FiberSystem } from './FiberSystem.js';
import { lerp, smootherstep } from '../utils/MathUtils.js';

export class Entity {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   * @param {import('../engine/AnimationScheduler.js').AnimationScheduler} scheduler
   * @param {import('../memory/MemorySystem.js').MemorySystem} memory
   */
  constructor(coords, scheduler, memory) {
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
      pluckPhase:     'idle', // idle -> tension -> freeze -> exploded
      standoffIntensity: 0,
      standoffContext: null,
      isGrappling:    false,
      pursuitX:       0,
      pursuitY:       0,
      evolutionLevel: 1
    };

    /** @type {number} Current world stage (0-5) */
    this._worldStage = 0; // Starts in DARKNESS

    /** @type {number|null} Timestamp when entity was born */
    this._birthTime = null;

    /** @type {boolean} True if returning visitor */
    this._isReturningVisitor = false;

    // Cinematic reveal offsets (Removed for Sentient Fiber)
    this._cinematicOffsetX = 0;
    this._cinematicOffsetY = 0;

    // ─── Systems ──────────────────────────────────────────────────────────
    this._geometry = new Geometry(coords);
    this._fiberSystem = new FiberSystem(coords, memory);
    this._animator = new EntityAnimator(this._state, this._fiberSystem);

    // ─── Cursor tracking (for Curious state lean) ─────────────────────────
    /** @type {{ wx: number, wy: number }} Cursor in world space */
    this._cursorWorld = { wx: 0, wy: 0 };

    /** @type {{ wx: number, wy: number }} Smoothed cursor lean */
    this._cursorLean  = { wx: 0, wy: 0 };
    
    /** @type {{ wx: number, wy: number }} Intent focus (very slow) */
    this._intentFocus = { wx: 0, wy: 0 };

    this._lastInputTime = null;

    // ─── Subscriptions ────────────────────────────────────────────────────
    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
      this._state.behaviorState = state;
    });
    
    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stageDef }) => {
      this._worldStage = stageDef.stage;
    });

    EventBus.on(EVENTS.MEMORY_LOADED, ({ data }) => {
      if (data.sessionCount > 1) {
        this._isReturningVisitor = true;
        this._state.isUnraveled = true; // Start unraveled
      }
    });

    EventBus.on(EVENTS.RESIZE, () => {
      this._geometry.rebuildCache();
    });

    EventBus.on(EVENTS.USER_INPUT, ({ x, y, type }) => {
      const { wx, wy } = coords.screenToWorld(x, y);
      this._cursorWorld.wx = wx;
      this._cursorWorld.wy = wy;
      this._lastInputTime = performance.now();
      
      if (type === 'pointerdown' || type === 'keydown') {
        this._state.isGrappling = true;
      } else if (type === 'pointerup' || type === 'keyup') {
        this._state.isGrappling = false;
      }
    });

    EventBus.on(EVENTS.FIBER_PLUCK, ({ velocityX, yPos }) => {
      if (!REALITY_LAWS.ENABLE_FIBER_PLUCK) return;
      // Only trigger if we are idle
      if (this._state.pluckPhase === 'idle') {
        this._state.pluckPhase = 'tension';
        EventBus.emit(EVENTS.BEHAVIOR_STATE_CHANGED, { state: BEHAVIOR_STATES.HESITANT }); // Build tension

        // 400ms tension vibration
        setTimeout(() => {
          if (this._state.pluckPhase !== 'tension') return;
          this._state.pluckPhase = 'freeze';
          
          // 150ms dead freeze
          setTimeout(() => {
            if (this._state.pluckPhase !== 'freeze') return;
            this._state.pluckPhase = 'exploded';
            this._state.isUnraveled = true;
            EventBus.emit(EVENTS.BEHAVIOR_STATE_CHANGED, { state: BEHAVIOR_STATES.DEFENSIVE }); // The release
          }, 150);
        }, 400);
      }
    });

    EventBus.on('FORCE_RESET_FIBERS', () => {
      this._state.isUnraveled = false;
      this._state.pluckPhase = 'idle';
      this._fiberSystem.resetUnravel();
    });
    
    // Add eat delay to prevent multiple triggers in one frame
    this._eatCooldown = 0;

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
    
    // 0.0s -> Darkness (opacity 0)
    this._state.masterOpacity = 0;

    // 0.8s -> Tiny neural pulse
    setTimeout(() => {
      EventBus.emit(EVENTS.ENTITY_PULSE_EMITTED, { timestamp: performance.now(), type: 'auto' });
    }, 800);

    // 1.5s -> Living structure slowly appears over 2.5 seconds
    this._scheduler.schedule({
      name:     'entity-birth',
      duration: 2500,
      delay:    1500,
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
    
    // HMR / State Recovery Failsafe: Nuke all NaNs!
    const sanitize = (val) => (val === undefined || isNaN(val) || !isFinite(val)) ? 0 : val;
    this._state.pursuitX = sanitize(this._state.pursuitX);
    this._state.pursuitY = sanitize(this._state.pursuitY);
    this._state.driftX = sanitize(this._state.driftX);
    this._state.driftY = sanitize(this._state.driftY);
    this._cursorLean.wx = sanitize(this._cursorLean.wx);
    this._cursorLean.wy = sanitize(this._cursorLean.wy);
    this._cursorWorld.wx = sanitize(this._cursorWorld.wx);
    this._cursorWorld.wy = sanitize(this._cursorWorld.wy);
    this._cinematicOffsetX = sanitize(this._cinematicOffsetX);
    this._cinematicOffsetY = sanitize(this._cinematicOffsetY);
    
    if (this._state.evolutionLevel === undefined) this._state.evolutionLevel = 1;
    
    // THE APEX PREDATOR: Pursuit Logic
    // Organism actively hunts the cursor
    if (this._eatCooldown > 0) {
       this._eatCooldown -= deltaSeconds;
    } else {
       const pdx = this._cursorWorld.wx - this._state.pursuitX;
       const pdy = this._cursorWorld.wy - this._state.pursuitY;
       const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
       
       if (pDist > 0.01) {
           // Speed increases with evolution level (World Units per second, not pixels!)
           const speed = this._state.evolutionLevel === 1 ? 0.2 : (this._state.evolutionLevel === 2 ? 0.5 : 0.85);
           this._state.pursuitX += (pdx / pDist) * speed * deltaSeconds;
           this._state.pursuitY += (pdy / pDist) * speed * deltaSeconds;
       }
       
       // Collision Detection (EATEN)
       // Core size scales with evolution level (World units radius)
       const hitRadius = this._state.evolutionLevel === 1 ? 0.05 : (this._state.evolutionLevel === 2 ? 0.1 : 0.15);
       // Only eat if the user is actively clicking (grappling) the cursor
       if (pDist < hitRadius && this._state.masterOpacity > 0.8 && this._state.isGrappling) {
           this._eatCursor();
       }
    }
    
    // Force absolute visibility to bypass any intro animation bugs
    this._state.masterOpacity = 1.0;
    this._state.isUnraveled = true;
    this._animator._introState = 'revealed';
    this._animator._introRevealed = true;

    if (this._state.masterOpacity <= 0) return;

    // Convert world position to screen, incorporating the cinematic reveal offset and pursuit offset
    const worldX = this._state.pursuitX + this._state.driftX + this._cursorLean.wx + this._cinematicOffsetX;
    const worldY = this._state.pursuitY + this._state.driftY + this._cursorLean.wy + this._cinematicOffsetY;
    
    // Use worldToScreen but clamp to keep organism visible on screen
    const rawScreen = this._coords.worldToScreen(worldX, worldY);
    const margin = 100;
    const screen = {
      x: Math.max(margin, Math.min(this._coords.cssWidth - margin, rawScreen.x)),
      y: Math.max(margin, Math.min(this._coords.cssHeight - margin, rawScreen.y))
    };

    // Also get the target control point for fibers in screen space
    const targetWorldCpX = this._cursorWorld.wx + this._state.driftX; // fibers reach slightly past the body drift
    const targetWorldCpY = this._cursorWorld.wy + this._state.driftY;
    const targetScreenCp = this._coords.worldToScreen(targetWorldCpX, targetWorldCpY);

    const idleMs = this._lastInputTime ? (performance.now() - this._lastInputTime) : 0;
    const isCursorStill = (idleMs > 2000 && this._lastInputTime !== null);

    // Update fiber physics
    this._fiberSystem.update(
      deltaSeconds, this._state.isUnraveled, targetScreenCp.x, targetScreenCp.y, 
      this._state.behaviorState, isCursorStill, this._isReturningVisitor, 
      this._state.pluckPhase, this._animator._introState, this._animator._temperament,
      this._state.isGrappling
    );

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

    // DRAW THE ORGANISM (Sentient Fibers)
    this._fiberSystem.render(
      ctx,
      this._state.masterOpacity,
      baseCx,
      baseCy,
      this._animator._introState,
      this._animator._temperament,
      this._state.standoffIntensity,
      this._state.standoffContext
    );

    // RESTORE CONTEXT
    if (offsetX !== 0 || offsetY !== 0) {
      ctx.restore();
    }

    const timeSinceBirth = this._birthTime ? (performance.now() - this._birthTime) / 1000 : 0;

    // Draw rigid geometry (Disabled by default in constants)
    if (REALITY_LAWS.IS_ORGANISM_VISIBLE) {
      this._geometry.render(
        ctx,
        this._state.outerRotation,
        this._state.innerRotation,
        this._state.masterOpacity,
        this._state.breathScale,
        this._state.behaviorState,
        this._worldStage,
        timeSinceBirth,
        this._fiberSystem,
        this._animator._introState,
        this._animator._temperament,
        this._state.standoffIntensity,
        this._state.standoffContext
      );
    }

    if (offsetX !== 0 || offsetY !== 0) {
      ctx.restore();
    }
  }
  
  /**
   * The organism catches the cursor.
   * Triggers evolution, massive glitch effects, and UI alerts.
   */
  _eatCursor() {
      this._eatCooldown = 2.0; // Wait 2 seconds before it can eat again
      
      if (this._state.evolutionLevel < 3) {
          this._state.evolutionLevel++;
          EventBus.emit('ORGANISM_EVOLVED', { level: this._state.evolutionLevel });
      } else {
          EventBus.emit('ORGANISM_APEX_FEEDING', {}); // Just feed and shake screen if maxed out
      }
      
      // Tell FiberSystem to mutate and grow
      this._fiberSystem.triggerMutation(this._state.evolutionLevel);
  }

  /**
   * Lean toward cursor and react subtly to proximity.
   * @private
   */
  _updateCursorLean(deltaSeconds) {
    if (!REALITY_LAWS.ENABLE_CURIOUS_LEAN) {
      this._cursorLean.wx = 0;
      this._cursorLean.wy = 0;
      return;
    }

    const isCurious = this._state.behaviorState === BEHAVIOR_STATES.CURIOUS;
    
    // Calculate cursor speed/volatility
    const dx = this._cursorWorld.wx - this._intentFocus.wx;
    const dy = this._cursorWorld.wy - this._intentFocus.wy;
    const distToIntent = Math.sqrt(dx * dx + dy * dy);
    
    // Intent shifts very slowly towards the cursor, but only if cursor is relatively still.
    // If they whip the mouse around (high distToIntent), intent drops back to center (withdraws).
    if (distToIntent < 0.2) {
      // Comfortably close, entity focuses on it slowly
      this._intentFocus.wx = lerp(this._intentFocus.wx, this._cursorWorld.wx, 0.5 * deltaSeconds);
      this._intentFocus.wy = lerp(this._intentFocus.wy, this._cursorWorld.wy, 0.5 * deltaSeconds);
    } else {
      // Moving too fast or too far away. Entity loses interest/focus.
      this._intentFocus.wx = lerp(this._intentFocus.wx, 0, 1.0 * deltaSeconds);
      this._intentFocus.wy = lerp(this._intentFocus.wy, 0, 1.0 * deltaSeconds);
    }

    const leanStrength = isCurious ? 0.05 : 0.01; 

    // Target lean is now based purely on the slow, filtered intent, not the raw pixel coords.
    const targetLeanX = Math.max(-0.06, Math.min(0.06, this._intentFocus.wx * leanStrength));
    const targetLeanY = Math.max(-0.06, Math.min(0.06, this._intentFocus.wy * leanStrength));

    // Smoothly approach target lean
    const speed = isCurious ? 0.8 : 1.5; 
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
