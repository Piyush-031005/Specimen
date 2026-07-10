/**
 * SPECIMEN — CustomCursor
 *
 * A very subtle, organic cursor replacement. 
 * Necessary because the OS cursor is hidden, and we need to organically fade
 * and absorb the cursor during the Signature Moment.
 */

import { lerp } from '../utils/MathUtils.js';
import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class CustomCursor {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   */
  constructor(coords) {
    this._coords = coords;

    // Actual pointer position (updated via EventBus)
    this._targetX = coords.center.x;
    this._targetY = coords.center.y;

    // We use a critically damped spring for position
    this._vx = this._targetX;
    this._vy = this._targetY;
    
    // Velocity for the spring
    this._velX = 0;
    this._velY = 0;

    // Scale for micro-interactions (click)
    this._targetScale = 1.0;
    this._currentScale = 1.0;

    // Device tracking
    this._isTouch = false;

    this._targetOpacity = 0.0;
    this.opacity = 0.0;
    this.visible = true; // Always visible, but opacity 0 initially
    
    // Have we received the first input? (to prevent drawing before mouse moves)
    this._hasInput = false;
    
    // Signature Moment Override
    this._isAbsorbed = false;
    this._absorbTargetX = 0;
    this._absorbTargetY = 0;

    EventBus.on(EVENTS.INTRO_REVEALED, () => {
      this._targetOpacity = 1.0;
      document.body.style.cursor = 'none'; // Seamlessly transition from OS to custom
    });

    EventBus.on(EVENTS.USER_INPUT, ({ x, y, type }) => {
      this._targetX = x;
      this._targetY = y;
      
      // If it's a touch event, hide the cursor. If it's a mouse, show it.
      this._isTouch = type.includes('touch');
      
      // Shrink slightly on click/down
      if (type === 'pointerdown' || type === 'touchstart' || type === 'mousedown') {
        this._currentScale = 0.95;
      }
      
      // Snap to position on first move to prevent lerping from center of screen
      if (!this._hasInput) {
        this._vx = x;
        this._vy = y;
        this._hasInput = true;
      }
      
      // If absorbed, do not allow user to control target position
      if (this._isAbsorbed) {
        this._targetX = this._absorbTargetX;
        this._targetY = this._absorbTargetY;
      }
    });
  }

  /**
   * Visually pulls the cursor into the center and hides it.
   */
  absorb(cx, cy) {
    this._isAbsorbed = true;
    this._absorbTargetX = cx;
    this._absorbTargetY = cy;
    this._targetX = cx;
    this._targetY = cy;
    this._targetOpacity = 0.0;
  }
  
  release() {
    this._isAbsorbed = false;
    this._targetOpacity = 1.0;
  }

  /**
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    if (!this.visible || !this._hasInput || this._isTouch) return;
    
    // Fade in opacity
    this.opacity = lerp(this.opacity, this._targetOpacity, 2.0 * deltaSeconds);

    // 1. Soft Spring Physics for Position
    // Weightless float: low stiffness, moderate damping
    const stiffness = 120;
    const damping = 12;
    
    const forceX = (this._targetX - this._vx) * stiffness;
    const forceY = (this._targetY - this._vy) * stiffness;
    
    this._velX += (forceX - this._velX * damping) * deltaSeconds;
    this._velY += (forceY - this._velY * damping) * deltaSeconds;
    
    this._vx += this._velX * deltaSeconds;
    this._vy += this._velY * deltaSeconds;

    // 2. Click Scale Recovery (fast spring back to 1.0)
    this._currentScale = lerp(this._currentScale, this._targetScale, 15 * deltaSeconds);
    
    // If absorbed, pull incredibly fast to center (gravitational singularity)
    if (this._isAbsorbed) {
       this._vx = lerp(this._vx, this._absorbTargetX, 8.0 * deltaSeconds);
       this._vy = lerp(this._vy, this._absorbTargetY, 8.0 * deltaSeconds);
       // Shrink into nothingness
       this._currentScale = lerp(this._currentScale, 0.0, 5.0 * deltaSeconds);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.visible || this.opacity <= 0 || this._isTouch) return;
    if (this._vx === 0 && this._vy === 0) return; // Not initialized yet

    // Calculate squash and stretch based on velocity (max 5%)
    const speed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);
    const stretch = Math.min(speed * 0.0002, 0.05); // Cap at 5%
    const angle = Math.atan2(this._velY, this._velX);

    ctx.save();
    ctx.globalAlpha = this.opacity * 0.4; // Very faint
    
    ctx.translate(this._vx, this._vy);
    ctx.rotate(angle);
    ctx.scale(this._currentScale * (1.0 + stretch), this._currentScale * (1.0 - stretch));
    
    // Draw a tiny, delicate ring
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#F5F0E8';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }
}
