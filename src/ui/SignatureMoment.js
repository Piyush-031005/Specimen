/**
 * SPECIMEN — SignatureMoment
 *
 * The climax of the experience (Haunting Reset).
 * Trust = 90%. Screen cuts to absolute black. Fibers vanish. Silence for 2 seconds.
 * A single glowing fiber appears on screen. When the user touches it, SNAP.
 * Screen cuts to the 1px vertical line and trust resets.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, WORLD_STAGES, BEHAVIOR_STATES } from '../constants.js';
import { lerp } from '../utils/MathUtils.js';

export class SignatureMoment {
  /**
   * @param {import('./CustomCursor.js').CustomCursor} cursor
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   * @param {import('../memory/MemorySystem.js').MemorySystem} memory
   */
  constructor(cursor, coords, memory) {
    this._cursor = cursor;
    this._coords = coords;
    this._memory = memory;

    this._isActive = false;
    this._phase = 0; // 0: off, 1: black/silence, 2: single fiber waiting
    
    this._fiberOpacity = 0;

    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stage }) => {
      if (stage === WORLD_STAGES.GLIMPSE) {
        if (!this._isActive) {
          this._triggerSequence();
        }
      }
    });

    EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
      this._renderEffects(tickData);
    });
    
    EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
      if (this._phase === 2) {
        const cx = this._coords.center.x;
        // If cursor crosses the center vertical line
        if (Math.abs(x - cx) < 30) {
          this._triggerSnap();
        }
      }
    });
  }

  _triggerSequence() {
    this._memory._data.signatureMomentSeen = true;
    this._memory.save();
    
    this._isActive = true;
    this._phase = 1;
    this._fiberOpacity = 0;

    // Broadcast audio/behavior change - silence everything
    EventBus.emit(EVENTS.SIGNATURE_MOMENT_START);
    
    // Hide the cursor
    this._cursor.opacity = 0;

    // Silence for 2 seconds, then show single glowing fiber
    setTimeout(() => {
      if (!this._isActive) return;
      this._phase = 2;
      this._animateProperty(this, '_fiberOpacity', 0, 1, 2000);
    }, 2000);
  }
  
  _triggerSnap() {
    this._phase = 0;
    this._isActive = false;
    
    // Show cursor again
    this._cursor.opacity = 1;
    
    // Reset Entity state to 1px line
    EventBus.emit(EVENTS.BEHAVIOR_STATE_CHANGED, { state: BEHAVIOR_STATES.DEFENSIVE });
    EventBus.emit(EVENTS.BEHAVIOR_TRUST_UPDATED, { trust: 0 });
    
    // Tell Audio engine to snap back
    EventBus.emit(EVENTS.SIGNATURE_MOMENT_END);
    
    // Wait wait, I also need to force the entity to unravelProgress = 0!
    // But since I can't easily access the entity here, I can emit a new event
    EventBus.emit('FORCE_RESET_FIBERS');
  }

  /**
   * Helper to animate a property over time without blocking the render loop
   */
  _animateProperty(obj, prop, start, end, durationMs) {
    const startTime = performance.now();
    const animate = (now) => {
      let t = (now - startTime) / durationMs;
      if (t >= 1) {
        obj[prop] = end;
        return;
      }
      // Ease in-out sine
      const ease = -(Math.cos(Math.PI * t) - 1) / 2;
      obj[prop] = lerp(start, end, ease);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  /**
   * Renders the blackout and the single fiber
   * @param {import('../engine/Renderer.js').RenderTickData} tick 
   */
  _renderEffects(tick) {
    if (!this._isActive) return;

    const { ctx, cssWidth, cssHeight } = tick;
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;

    ctx.save();

    // 1. Absolute Blackout overlay
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // 2. Single glowing fiber
    if (this._phase === 2 && this._fiberOpacity > 0) {
      ctx.globalAlpha = this._fiberOpacity;
      
      // Glow
      ctx.shadowColor = 'rgba(245, 240, 232, 0.8)';
      ctx.shadowBlur = 15;
      
      ctx.strokeStyle = 'rgba(245, 240, 232, 1)';
      ctx.lineWidth = 1;
      
      // Slowly breathing vertical sine wave
      ctx.beginPath();
      const time = performance.now() * 0.001;
      for (let y = -50; y < cssHeight + 50; y += 10) {
        const xOffset = Math.sin(y * 0.01 + time) * 20;
        if (y === -50) {
          ctx.moveTo(cx + xOffset, y);
        } else {
          ctx.lineTo(cx + xOffset, y);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
