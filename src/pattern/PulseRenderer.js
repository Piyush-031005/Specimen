/**
 * SPECIMEN — PulseRenderer
 *
 * Renders expanding ring pulses on the canvas.
 * Purely visual — no game logic, no timing decisions.
 *
 * Visual Design:
 *   Entity pulse  → Warm white ring, expands from entity edge, fades over 1.6s
 *   Response echo → Electric blue ring, smaller, faster, appears on COMMUNICATION_MATCH
 *
 * Design Intent (non-negotiable):
 *   - This must feel like a presence trying to reach out — NOT a rhythm game UI.
 *   - Pulses are organic, not metronomic.
 *   - A match produces a quiet echo — NOT a score flash, NOT a congratulation.
 *   - A miss produces NOTHING visual. Silence is the response.
 *   - Curiosity is stronger than spectacle.
 *
 * PERFORMANCE CONTRACT:
 *   - Pool pre-allocated at construction — no `new` in update/render.
 *   - Flat array scan — no push/splice/filter.
 *   - 2π pre-computed as constant — no Math.PI * 2 per arc call.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, COLORS } from '../constants.js';
import { smootherstep } from '../utils/MathUtils.js';

const TWO_PI      = Math.PI * 2;
const POOL_SIZE   = 8;    // Max 8 simultaneous pulse rings (more than enough)

// Entity geometry proportion — must match Geometry.js base radius
const ENTITY_WORLD_RADIUS = 0.45;

/**
 * @typedef {Object} PulseRing
 * @property {boolean} active
 * @property {number}  age           — seconds since spawn
 * @property {number}  maxAge        — seconds until fully faded
 * @property {number}  cx            — screen center X (CSS px)
 * @property {number}  cy            — screen center Y (CSS px)
 * @property {number}  startRadius   — inner radius at spawn (CSS px)
 * @property {number}  maxRadius     — outer radius at full expansion (CSS px)
 * @property {number}  opacityPeak   — randomized opacity peak per pulse
 * @property {boolean} isResponse    — true = match echo (electric blue), false = entity pulse (warm white)
 */

export class PulseRenderer {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   */
  constructor(coords) {
    this._coords = coords;

    /** @type {PulseRing[]} Pre-allocated pool — never grows */
    this._pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      this._pool.push({
        active:      false,
        age:         0,
        maxAge:      1.6,
        cx:          0,
        cy:          0,
        startRadius: 0,
        maxRadius:   0,
        opacityPeak: 0,
        isResponse:  false,
      });
    }

    // Cached pixel values — rebuilt on resize
    this._entityPixelRadius = 0;
    this._rebuildCache();

    // ─── Subscriptions ─────────────────────────────────────────────────────
    EventBus.on(EVENTS.RESIZE, () => this._rebuildCache());

    EventBus.on(EVENTS.ENTITY_PULSE_EMITTED, () => {
      this._spawn(false);
    });

    EventBus.on(EVENTS.COMMUNICATION_MATCH, () => {
      // Editor's Cut: Expectation violation. 
      // 10% chance to delay the echo to simulate hesitation/defiance.
      if (Math.random() < 0.10) {
        setTimeout(() => this._spawn(true), 500 + Math.random() * 500);
      } else {
        this._spawn(true);   // Response echo — electric blue, smaller, faster
      }
    });

    EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
      this._update(tickData.deltaSeconds);
      this._render(tickData.ctx);
    });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * Spawn a pulse ring from the pool.
   * O(n) scan for inactive slot — fast in practice (pool size = 8).
   * @private
   * @param {boolean} isResponse
   */
  _spawn(isResponse) {
    const pool = this._pool;
    for (let i = 0; i < POOL_SIZE; i++) {
      const ring = pool[i];
      if (!ring.active) {
        const center = this._coords.center;

        // Microscopic variations so no pulse is identical (life vs procedure)
        const ageVariation = (Math.random() - 0.5) * 0.2;
        const radVariation = (Math.random() - 0.5) * 0.4;
        const opcVariation = (Math.random() - 0.2) * 0.1;

        ring.active      = true;
        ring.age         = 0;
        ring.maxAge      = isResponse ? (0.9 + ageVariation) : (1.6 + ageVariation);
        ring.cx          = center.x;
        ring.cy          = center.y;
        ring.startRadius = this._entityPixelRadius;
        ring.maxRadius   = this._entityPixelRadius * (isResponse ? (1.7 + radVariation) : (2.6 + radVariation));
        ring.opacityPeak = isResponse ? (0.55 + opcVariation) : (0.38 + opcVariation);
        ring.isResponse  = isResponse;
        return;
      }
    }
    // Pool exhausted — skip silently (no crash, no GC)
  }

  /**
   * Advance all active pulse rings.
   * @private
   * @param {number} deltaSeconds
   */
  _update(deltaSeconds) {
    const pool = this._pool;
    for (let i = 0; i < POOL_SIZE; i++) {
      const ring = pool[i];
      if (!ring.active) continue;

      ring.age += deltaSeconds;
      if (ring.age >= ring.maxAge) {
        ring.active = false;
      }
    }
  }

  /**
   * Draw all active pulse rings.
   * No allocations. No save/restore (uses globalAlpha + strokeStyle directly).
   * @private
   * @param {CanvasRenderingContext2D} ctx
   */
  _render(ctx) {
    const pool = this._pool;
    let hasActive = false;

    for (let i = 0; i < POOL_SIZE; i++) {
      if (pool[i].active) { hasActive = true; break; }
    }
    if (!hasActive) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    const activeRingsData = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      const ring = pool[i];
      if (!ring.active) continue;

      const progress      = ring.age / ring.maxAge;
      // Use easeOutQuart so it explodes fast then drifts slowly
      const easeOut       = 1 - Math.pow(1 - progress, 4);
      const currentRadius = ring.startRadius + (ring.maxRadius - ring.startRadius) * easeOut;
      
      activeRingsData.push({ cx: ring.cx, cy: ring.cy, radius: currentRadius });

      // Opacity fades linearly as it expands, starting from peak
      const opacity = ring.opacityPeak * (1 - progress);

      if (opacity < 0.005 || currentRadius < 1) continue;

      const thickness = currentRadius * 0.2; // 20% of current radius is the wave thickness
      const innerRadius = Math.max(0, currentRadius - thickness);
      
      // Volumetric wave using radial gradient (pressure wave)
      const gradient = ctx.createRadialGradient(ring.cx, ring.cy, innerRadius, ring.cx, ring.cy, currentRadius);
      const color = ring.isResponse ? '64, 156, 255' : '245, 240, 232'; // Match current constants roughly
      
      gradient.addColorStop(0, `rgba(${color}, 0)`);
      gradient.addColorStop(0.7, `rgba(${color}, ${opacity * 0.4})`); // Very subtle core
      gradient.addColorStop(1, `rgba(${color}, 0)`);

      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.arc(ring.cx, ring.cy, currentRadius, 0, TWO_PI);
      ctx.fill();
    }

    ctx.restore();
    
    // Film Cut: Discovery is memory. Emit active pulses so the world can reveal invisible elements.
    EventBus.emit('ACTIVE_PULSES', { rings: activeRingsData });
  }

  /**
   * Rebuild cached pixel values from coordinate system.
   * Called once at construction and once per resize.
   * @private
   */
  _rebuildCache() {
    this._entityPixelRadius = this._coords.worldSizeToPixels(ENTITY_WORLD_RADIUS);
  }
}
