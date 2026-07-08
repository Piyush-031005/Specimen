/**
 * SPECIMEN — ParticleManager
 *
 * Pre-allocated particle pool. No garbage collection pressure.
 *
 * Design:
 *   - Pool is pre-allocated at init (PERFORMANCE.PARTICLE_POOL_SIZE)
 *   - Active/inactive tracked with flags — no array splicing
 *   - Responds to PERF_QUALITY_CHANGED to shrink/grow active count
 *   - Particle behavior evolves per world stage
 *
 * ⚠️  Stub: Full particle behavior per stage in Milestone 5.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, PERFORMANCE } from '../constants.js';

/**
 * @typedef {Object} Particle
 * @property {boolean} active
 * @property {number} x        — CSS pixels
 * @property {number} y
 * @property {number} vx       — velocity x
 * @property {number} vy       — velocity y
 * @property {number} opacity  — [0, 1]
 * @property {number} radius
 * @property {number} life     — [0, 1] normalized lifetime
 * @property {number} maxLife  — seconds
 * @property {number} r        — color component
 * @property {number} g
 * @property {number} b
 */

export class ParticleManager {
  constructor() {
    /** @type {Particle[]} Pre-allocated pool */
    this._pool = [];

    /** @type {number} Current active pool limit */
    this._poolLimit = PERFORMANCE.PARTICLE_POOL_SIZE;

    /** @type {number} Max particles allowed in current stage */
    this._stageLimit = 0;

    this._allocatePool(PERFORMANCE.PARTICLE_POOL_SIZE);

    EventBus.on(EVENTS.PERF_QUALITY_CHANGED, ({ quality }) => {
      this._poolLimit = quality === 'full'
        ? PERFORMANCE.PARTICLE_POOL_SIZE
        : PERFORMANCE.PARTICLE_REDUCED_POOL_SIZE;
    });

    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stageDef }) => {
      this._stageLimit = Math.min(stageDef.particleCount, this._poolLimit);
    });
  }

  /**
   * Update all active particles.
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    // Milestone 5: per-stage particle behavior
  }

  /**
   * Draw all active particles.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    // Milestone 5: render each particle
  }

  /**
   * Spawn a particle at a position with given properties.
   * Uses the pool — no new objects created.
   * @param {Partial<Particle>} props
   */
  spawn(props) {
    const particle = this._pool.find(p => !p.active);
    if (!particle) return; // Pool exhausted — graceful skip
    Object.assign(particle, { active: true, life: 0, ...props });
  }

  /** @private */
  _allocatePool(size) {
    for (let i = 0; i < size; i++) {
      this._pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        opacity: 0, radius: 1, life: 0, maxLife: 1,
        r: 255, g: 255, b: 255,
      });
    }
  }
}
