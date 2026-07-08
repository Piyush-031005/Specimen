/**
 * SPECIMEN — ParticleManager
 *
 * Manages a pre-allocated particle pool. Zero heap allocations during update/render.
 *
 * Pool design:
 *   - Fixed-size typed pool allocated once at construction
 *   - Particles are never created or destroyed — only activated/deactivated
 *   - `spawn()` finds the first inactive slot and configures it
 *   - `update()` advances all active particles, deactivates expired ones
 *   - `render()` draws all active particles (basic circles — visual behavior in M5)
 *   - Pool size is capped by quality level (512 full / 128 reduced)
 *   - Stage limit: max particles per world stage (from StageDefinitions)
 *
 * RENDER INVARIANT:
 *   No `new` keyword inside update() or render().
 *   No array push/splice/filter inside update() or render().
 *
 * Visual behavior (color, opacity curves, direction, size evolution)
 * is implemented in Milestone 5 (World Progression).
 * This milestone implements infrastructure only.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, PERFORMANCE } from '../constants.js';

/**
 * @typedef {Object} Particle
 * @property {boolean} active
 * @property {number} x         — CSS pixels
 * @property {number} y         — CSS pixels
 * @property {number} vx        — Velocity X (px/s)
 * @property {number} vy        — Velocity Y (px/s)
 * @property {number} radius    — CSS pixels
 * @property {number} opacity   — [0, 1]
 * @property {number} age       — Seconds since spawn
 * @property {number} maxAge    — Seconds until particle expires
 * @property {number} r         — Color R [0, 255]
 * @property {number} g         — Color G [0, 255]
 * @property {number} b         — Color B [0, 255]
 */

export class ParticleManager {
  constructor() {
    // ─── Pool ────────────────────────────────────────────────────────────────
    const poolSize = PERFORMANCE.PARTICLE_POOL_SIZE;

    /**
     * Pre-allocated flat pool. Particle objects are plain data — no methods.
     * @type {Particle[]}
     */
    this._pool = new Array(poolSize);
    for (let i = 0; i < poolSize; i++) {
      this._pool[i] = {
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        radius: 1,
        opacity: 0,
        age: 0,
        maxAge: 1,
        r: 255, g: 255, b: 255,
      };
    }

    /**
     * Maximum particles allowed. Enforced in spawn().
     * Capped by quality and by the current stage's particle count.
     * @type {number}
     */
    this._hardLimit = PERFORMANCE.PARTICLE_POOL_SIZE;

    /**
     * Stage-specified target particle count.
     * Particles won't be spawned beyond this.
     * @type {number}
     */
    this._stageLimit = 0;

    /**
     * Running count of active particles. Updated in update().
     * @type {number}
     */
    this._activeCount = 0;

    // ─── Event subscriptions ─────────────────────────────────────────────────

    EventBus.on(EVENTS.PERF_QUALITY_CHANGED, ({ quality }) => {
      this._hardLimit = quality === 'full'
        ? PERFORMANCE.PARTICLE_POOL_SIZE
        : PERFORMANCE.PARTICLE_REDUCED_POOL_SIZE;
    });

    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stageDef }) => {
      this._stageLimit = stageDef.particleCount;
    });

    EventBus.on(EVENTS.RENDER_TICK, ({ ctx, deltaSeconds }) => {
      this.update(deltaSeconds);
      this.render(ctx);
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Spawn a particle from the pool.
   * Finds the first inactive slot — O(n) worst case, fast in practice.
   * If no slot is available or limits are exceeded, silently skips.
   *
   * @param {Partial<Particle>} props — Override default particle properties.
   */
  spawn(props) {
    if (this._activeCount >= this._stageLimit) return;
    if (this._activeCount >= this._hardLimit) return;

    const pool = this._pool;
    const len  = pool.length;

    for (let i = 0; i < len; i++) {
      const p = pool[i];
      if (!p.active) {
        // Reset to defaults, then apply props — no new object
        p.active  = true;
        p.x       = props.x       ?? 0;
        p.y       = props.y       ?? 0;
        p.vx      = props.vx      ?? 0;
        p.vy      = props.vy      ?? 0;
        p.radius  = props.radius  ?? 2;
        p.opacity = props.opacity ?? 1;
        p.age     = 0;
        p.maxAge  = props.maxAge  ?? 2;
        p.r       = props.r       ?? 255;
        p.g       = props.g       ?? 240;
        p.b       = props.b       ?? 232;
        return;
      }
    }
    // Pool exhausted — skip gracefully
  }

  /**
   * Update all active particles.
   * Advances age, applies velocity, deactivates expired.
   * No allocations.
   *
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    let count = 0;
    const pool = this._pool;
    const len  = pool.length;

    for (let i = 0; i < len; i++) {
      const p = pool[i];
      if (!p.active) continue;

      p.age += deltaSeconds;

      if (p.age >= p.maxAge) {
        p.active = false;
        continue;
      }

      // Apply velocity
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;

      // Opacity fade-out over lifetime (linear base — M5 will add curves)
      const lifeProgress = p.age / p.maxAge;
      p.opacity = 1 - lifeProgress;

      count++;
    }

    this._activeCount = count;
  }

  /**
   * Render all active particles to the canvas.
   * Draws basic filled circles — no glow, no bloom (M5 adds stage-specific visuals).
   * No allocations.
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const pool = this._pool;
    const len  = pool.length;

    ctx.save();

    for (let i = 0; i < len; i++) {
      const p = pool[i];
      if (!p.active || p.opacity <= 0.001) continue;

      ctx.globalAlpha = p.opacity;
      ctx.fillStyle   = `rgb(${p.r},${p.g},${p.b})`;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, 6.283185307); // 2π — no Math.PI * 2 per call
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Deactivate all particles immediately.
   * Use on stage transitions if needed.
   */
  clear() {
    const pool = this._pool;
    const len  = pool.length;
    for (let i = 0; i < len; i++) {
      pool[i].active = false;
    }
    this._activeCount = 0;
  }

  // ─── Diagnostics ──────────────────────────────────────────────────────────

  /** @returns {number} Number of currently active particles */
  get activeCount() { return this._activeCount; }

  /** @returns {number} Total pool size */
  get poolSize() { return this._pool.length; }

  /** @returns {number} Effective hard limit for current quality */
  get hardLimit() { return this._hardLimit; }
}
