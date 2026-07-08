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
      this._stageDef   = stageDef;
    });

    EventBus.on(EVENTS.RENDER_TICK, ({ ctx, deltaSeconds }) => {
      this.update(deltaSeconds, ctx);
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Spawn a particle from the pool.
   * Finds the first inactive slot — O(n) worst case, fast in practice.
   * If no slot is available or limits are exceeded, silently skips.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {number} radius
   * @param {number} maxAge
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  spawn(x, y, vx, vy, radius, maxAge, r, g, b) {
    if (this._activeCount >= this._stageLimit) return;
    if (this._activeCount >= this._hardLimit) return;

    const pool = this._pool;
    const len  = pool.length;

    for (let i = 0; i < len; i++) {
      const p = pool[i];
      if (!p.active) {
        // Reset to defaults, then apply props — no new object
        p.active  = true;
        p.x       = x;
        p.y       = y;
        p.vx      = vx;
        p.vy      = vy;
        p.radius  = radius;
        p.opacity = 1;
        p.age     = 0;
        p.maxAge  = maxAge;
        p.r       = r;
        p.g       = g;
        p.b       = b;
        return;
      }
    }
  }

  /**
   * Update all active particles and maintain pool density.
   * @param {number} deltaSeconds
   * @param {CanvasRenderingContext2D} ctx - to get canvas dimensions
   */
  update(deltaSeconds, ctx) {
    if (!this._stageDef) return;

    // Spawn new particles to maintain stage limit
    const spawnRate = this._stageDef.particleCount > 50 ? 3 : 1;
    for (let i = 0; i < spawnRate; i++) {
      if (this._activeCount < this._stageLimit && this._activeCount < this._hardLimit) {
        this._spawnForCurrentStage(ctx.canvas.width, ctx.canvas.height);
        this._activeCount++;
      }
    }

    let count = 0;
    const pool = this._pool;
    const len  = pool.length;
    const motion = this._stageDef.particleMotion;
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    for (let i = 0; i < len; i++) {
      const p = pool[i];
      if (!p.active) continue;

      p.age += deltaSeconds;

      if (p.age >= p.maxAge) {
        p.active = false;
        continue;
      }

      // Apply stage-specific motion
      if (motion === 'inward') {
        // Slowly drift toward center
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (dx / dist) * this._stageDef.particleSpeed * 50;
        p.vy = (dy / dist) * this._stageDef.particleSpeed * 50;
      } else if (motion === 'orbital') {
        // Spiral inward + rotate
        const dx = cx - p.x;
        const dy = cy - p.y;
        const angle = Math.atan2(dy, dx);
        p.vx = Math.cos(angle + 1.2) * this._stageDef.particleSpeed * 80;
        p.vy = Math.sin(angle + 1.2) * this._stageDef.particleSpeed * 80;
      } else if (motion === 'resonance') {
        // Faster, erratic orbital
        const dx = cx - p.x;
        const dy = cy - p.y;
        const angle = Math.atan2(dy, dx);
        p.vx = Math.cos(angle + 1.4) * this._stageDef.particleSpeed * 120 + (Math.random() - 0.5) * 20;
        p.vy = Math.sin(angle + 1.4) * this._stageDef.particleSpeed * 120 + (Math.random() - 0.5) * 20;
      }

      // Apply velocity
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;

      // Opacity fade-out (sine curve for smooth in/out)
      const lifeProgress = p.age / p.maxAge;
      p.opacity = Math.sin(lifeProgress * Math.PI) * this._stageDef.particleOpacityMax;

      count++;
    }

    this._activeCount = count;
    this.render(ctx);
  }

  /**
   * Helper to spawn a particle matching the current stage's visual profile.
   * @private
   */
  _spawnForCurrentStage(w, h) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const speed = this._stageDef.particleSpeed * (Math.random() * 20 + 5);
    const angle = Math.random() * Math.PI * 2;
    
    // Parse hex color string to rgb
    const hex = this._stageDef.particleColor;
    const r = parseInt(hex.slice(1, 3), 16) || 255;
    const g = parseInt(hex.slice(3, 5), 16) || 255;
    const b = parseInt(hex.slice(5, 7), 16) || 255;

    this.spawn(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      Math.random() * 1.5 + 0.5,
      Math.random() * 4 + 2,
      r, g, b
    );
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
