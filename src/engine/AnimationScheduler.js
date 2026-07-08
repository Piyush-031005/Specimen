/**
 * SPECIMEN — AnimationScheduler
 *
 * A timeline-based animation system. Allows scheduling named animations
 * with precise start times, durations, and custom easing curves.
 *
 * All animations are driven by the RENDER_TICK event — no setTimeouts.
 *
 * Features:
 *   - Schedule animations with delay, duration, easing
 *   - Cancel animations by ID
 *   - Chainable: onComplete callback for sequencing
 *   - Zero external dependencies
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';
import { clamp } from '../utils/MathUtils.js';

let _nextId = 1;

/**
 * @typedef {Object} AnimationEntry
 * @property {number} id
 * @property {string} [name]
 * @property {number} startTime       — performance.now() when animation should begin
 * @property {number} duration        — milliseconds
 * @property {function(number): number} easing — t [0,1] → eased t [0,1]
 * @property {function(number): void} onUpdate — called with eased t each frame
 * @property {function(): void} [onComplete]
 * @property {boolean} complete
 */

export class AnimationScheduler {
  constructor() {
    /** @type {Map<number, AnimationEntry>} */
    this._animations = new Map();

    this._onTick = this._onTick.bind(this);
    EventBus.on(EVENTS.RENDER_TICK, this._onTick);
  }

  /**
   * Schedule an animation.
   *
   * @param {Object} options
   * @param {number} options.duration — Duration in milliseconds.
   * @param {function(number): number} options.easing — Easing function (t → t).
   * @param {function(number): void} options.onUpdate — Called each frame with eased progress [0, 1].
   * @param {function(): void} [options.onComplete] — Called when animation ends.
   * @param {number} [options.delay=0] — Delay in ms before animation starts.
   * @param {string} [options.name] — Optional identifier for debugging.
   * @returns {number} Animation ID. Use to cancel.
   */
  schedule({ duration, easing, onUpdate, onComplete, delay = 0, name }) {
    const id = _nextId++;
    const startTime = performance.now() + delay;

    /** @type {AnimationEntry} */
    const entry = {
      id,
      name: name ?? `anim_${id}`,
      startTime,
      duration,
      easing,
      onUpdate,
      onComplete,
      complete: false,
    };

    this._animations.set(id, entry);
    return id;
  }

  /**
   * Cancel an animation by ID.
   * @param {number} id
   */
  cancel(id) {
    this._animations.delete(id);
  }

  /**
   * Cancel all running animations.
   */
  cancelAll() {
    this._animations.clear();
  }

  /**
   * @returns {number} Number of currently running animations.
   */
  get count() {
    return this._animations.size;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * @private
   * @param {{ now: number }} tickData
   */
  _onTick({ now }) {
    if (this._animations.size === 0) return;

    for (const [id, anim] of this._animations) {
      if (anim.complete) {
        this._animations.delete(id);
        continue;
      }

      if (now < anim.startTime) continue; // Not started yet

      const elapsed = now - anim.startTime;
      const rawT = clamp(elapsed / anim.duration, 0, 1);
      const easedT = anim.easing(rawT);

      anim.onUpdate(easedT);

      if (rawT >= 1) {
        anim.complete = true;
        this._animations.delete(id);
        if (anim.onComplete) anim.onComplete();
      }
    }
  }
}
