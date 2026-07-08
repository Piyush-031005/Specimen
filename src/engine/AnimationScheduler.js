/**
 * SPECIMEN — AnimationScheduler
 *
 * Timeline-based animation system driven entirely by RENDER_TICK.
 *
 * Rules (non-negotiable):
 *   ❌ No setTimeout
 *   ❌ No setInterval
 *   ❌ No Date.now()
 *   ✅ All timing derived from `now` passed via RENDER_TICK
 *   ✅ Zero allocations in the tick hot path
 *
 * Usage:
 *   const id = scheduler.schedule({
 *     duration: 1200,
 *     easing: hesitationCurve,
 *     onUpdate: (t) => { entity.scale = lerp(0.8, 1.0, t); },
 *     onComplete: () => { ... },
 *     delay: 500,
 *   });
 *   scheduler.cancel(id); // Cancel before completion
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';
import { clamp } from '../utils/MathUtils.js';

let _nextId = 1;

/**
 * @typedef {Object} AnimationEntry
 * @property {number} id
 * @property {string} name           — For debugging
 * @property {number} startTime      — Absolute rAF timestamp when animation begins
 * @property {number} duration       — Duration in milliseconds
 * @property {function(number): number} easing  — t [0,1] → eased t [0,1]
 * @property {function(number): void}  onUpdate — Called each frame with eased progress
 * @property {function(): void} [onComplete]    — Called once on completion
 */

export class AnimationScheduler {
  constructor() {
    /**
     * Active animations keyed by ID.
     * @type {Map<number, AnimationEntry>}
     */
    this._animations = new Map();

    /**
     * IDs marked for removal after the current tick's iteration.
     * Avoids modifying the Map during iteration.
     * @type {number[]}
     */
    this._toRemove = [];

    // Bind once — never bind inside the tick
    this._onTick = this._onTick.bind(this);
    EventBus.on(EVENTS.RENDER_TICK, this._onTick);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Schedule an animation.
   *
   * @param {Object} options
   * @param {number} options.duration          — Duration in milliseconds.
   * @param {function(number): number} options.easing  — Easing fn (t → t).
   * @param {function(number): void}  options.onUpdate — Called each frame.
   * @param {function(): void} [options.onComplete]    — Called on completion.
   * @param {number} [options.delay=0]         — Delay in ms before start.
   * @param {string} [options.name]            — Debug identifier.
   * @returns {number} Animation ID (pass to cancel()).
   */
  schedule({ duration, easing, onUpdate, onComplete, delay = 0, name }) {
    const id = _nextId++;

    /** @type {AnimationEntry} */
    this._animations.set(id, {
      id,
      name:      name ?? `anim_${id}`,
      startTime: performance.now() + delay,
      duration,
      easing,
      onUpdate,
      onComplete,
    });

    return id;
  }

  /**
   * Cancel an animation by ID.
   * Safe to call even if the ID no longer exists.
   * @param {number} id
   */
  cancel(id) {
    this._animations.delete(id);
  }

  /**
   * Cancel all running animations immediately.
   */
  cancelAll() {
    this._animations.clear();
    this._toRemove.length = 0;
  }

  /** @returns {number} Number of active animations */
  get count() { return this._animations.size; }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * Tick handler — drives all animations.
   * Called every frame via RENDER_TICK.
   *
   * Hot path rules:
   *   - No allocations
   *   - Collect completions in _toRemove, remove after iteration
   *
   * @private
   * @param {import('./Renderer.js').RenderTickData} tickData
   */
  _onTick(tickData) {
    const { now } = tickData;

    if (this._animations.size === 0) return;

    for (const [id, anim] of this._animations) {
      // Not started yet — wait
      if (now < anim.startTime) continue;

      const elapsed = now - anim.startTime;
      const rawT    = clamp(elapsed / anim.duration, 0, 1);
      const easedT  = anim.easing(rawT);

      anim.onUpdate(easedT);

      if (rawT >= 1) {
        // Mark for removal — do NOT delete during iteration
        this._toRemove.push(id);
        if (anim.onComplete) anim.onComplete();
      }
    }

    // Safe removal after iteration completes
    if (this._toRemove.length > 0) {
      for (let i = 0; i < this._toRemove.length; i++) {
        this._animations.delete(this._toRemove[i]);
      }
      this._toRemove.length = 0; // Reset without reallocating
    }
  }
}
