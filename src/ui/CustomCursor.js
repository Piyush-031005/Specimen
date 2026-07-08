/**
 * SPECIMEN — CustomCursor
 *
 * A very subtle, organic cursor replacement. 
 * Necessary because the OS cursor is hidden, and we need to organically fade
 * and absorb the cursor during the Signature Moment.
 */

import { lerp } from '../utils/MathUtils.js';

export class CustomCursor {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   */
  constructor(coords) {
    this._coords = coords;

    // We lerp the visual position to trail the actual pointer slightly for an organic feel
    this._vx = coords.pointer.x;
    this._vy = coords.pointer.y;

    this.opacity = 1.0;
    this.visible = true;
  }

  /**
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    if (!this.visible) return;

    const px = this._coords.pointer.x;
    const py = this._coords.pointer.y;

    // Only lerp if the mouse has moved on screen
    if (px !== 0 || py !== 0) {
      this._vx = lerp(this._vx, px, 20 * deltaSeconds);
      this._vy = lerp(this._vy, py, 20 * deltaSeconds);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.visible || this.opacity <= 0) return;
    if (this._vx === 0 && this._vy === 0) return; // Not initialized yet

    ctx.save();
    ctx.globalAlpha = this.opacity * 0.4; // Very faint
    
    // Draw a tiny, delicate ring
    ctx.beginPath();
    ctx.arc(this._vx, this._vy, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#F5F0E8';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }
}
