/**
 * SPECIMEN — EntityAnimator
 *
 * Drives the entity's breathing, idle drift, and behavioral animations.
 *
 * Animation Language Rules (never violate):
 *   ❌ No bounce. No elastic. No ease-in-out cubic.
 *   ✅ Slow. Organic. Hesitant. Alive.
 *   ✅ Use organicSine, hesitationCurve, expDecay from MathUtils.
 *   ✅ The entity sometimes "misses" its own rhythm (intentional imperfection).
 *
 * ⚠️  Stub: Full implementation in Milestone 2.
 */

export class EntityAnimator {
  /**
   * @param {import('./Entity.js').Entity} entity
   */
  constructor(entity) {
    this._entity = entity;

    /** @type {number} Accumulated time in seconds */
    this._time = 0;

    /** @type {number} Breathing phase offset — unique per session */
    this._breathPhase = Math.random() * Math.PI * 2;
  }

  /**
   * Called every frame. Updates all continuous animations.
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    this._time += deltaSeconds;
    this._updateBreathing();
    this._updateIdleDrift();
  }

  /** @private */
  _updateBreathing() {
    // Milestone 2: organic breathing cycle
  }

  /** @private */
  _updateIdleDrift() {
    // Milestone 2: subtle 2D drift in normalized space
  }
}
