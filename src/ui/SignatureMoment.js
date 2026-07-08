/**
 * SPECIMEN — SignatureMoment
 *
 * The climax of the experience (Milestone 8).
 * "The boundary between the visitor and the entity briefly disappears."
 *
 * Sequence:
 * 1. World reaches Stage 5 (Contact).
 * 2. Custom cursor fades out organically.
 * 3. Soft light trail connects the cursor to the entity.
 * 4. Entity absorbs the light.
 * 5. 3 seconds of perfect stillness (audio becomes calmer, heartbeat slows).
 * 6. One final pulse.
 * 7. Cursor gently returns.
 * 8. Entity breathing remains permanently calmer.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, WORLD_STAGES } from '../constants.js';
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

    // Absorption trail state
    this._trailProgress = 0; // 0 to 1
    this._cursorFreezePos = { x: 0, y: 0 };
    
    // Global visual effect state (exposure lift / bloom)
    this._exposureLift = 0; // 0 to 1

    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stage }) => {
      if (stage === WORLD_STAGES.GLIMPSE) {
        if (!this._memory._data.signatureMomentSeen) {
          this._triggerSequence();
        }
      }
    });

    EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
      this._renderEffects(tickData);
    });
  }

  _triggerSequence() {
    this._memory._data.signatureMomentSeen = true;
    this._memory.save();
    
    this._isActive = true;

    // 1. Freeze cursor position
    this._cursorFreezePos.x = this._cursor._vx;
    this._cursorFreezePos.y = this._cursor._vy;

    // Broadcast audio/behavior change
    EventBus.emit(EVENTS.SIGNATURE_MOMENT_START);

    // Timeline using pure setTimeout (since this is a one-off scripted sequence)
    
    // 0ms: Start fading cursor, lift exposure slightly
    this._animateProperty(this._cursor, 'opacity', 1, 0, 1000);
    this._animateProperty(this, '_exposureLift', 0, 0.15, 2000);

    // 500ms: Start light trail from cursor to entity
    setTimeout(() => {
      this._animateProperty(this, '_trailProgress', 0, 1, 2000);
    }, 500);

    // 3000ms: Absorption complete. 3 seconds of perfect silence/stillness begins.
    // The AudioEngine is listening to SIGNATURE_MOMENT_START to reduce shimmer and slow heartbeat.
    setTimeout(() => {
      this._exposureLift = 0; // Reset exposure lift
      this._trailProgress = 0; // Hide trail
    }, 3000);

    // 6000ms: The final, single pulse, then return the cursor.
    setTimeout(() => {
      EventBus.emit(EVENTS.ENTITY_PULSE_EMITTED, { timestamp: performance.now() });
      EventBus.emit(EVENTS.AUDIO_PULSE_TRIGGER);
      
      this._animateProperty(this._cursor, 'opacity', 0, 1, 1500);
      
      setTimeout(() => {
        this._isActive = false;
        EventBus.emit(EVENTS.SIGNATURE_MOMENT_END);
      }, 1500);

    }, 6000);
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
   * Renders the soft light trail and the subtle exposure lift
   * @param {import('../engine/Renderer.js').RenderTickData} tick 
   */
  _renderEffects(tick) {
    if (!this._isActive) return;

    const { ctx, cssWidth, cssHeight } = tick;
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;

    ctx.save();

    // 1. Render light trail (soft gradient line from cursor to entity)
    if (this._trailProgress > 0 && this._trailProgress < 1) {
      // Calculate current head of the trail
      const headX = lerp(this._cursorFreezePos.x, cx, this._trailProgress);
      const headY = lerp(this._cursorFreezePos.y, cy, this._trailProgress);

      const grad = ctx.createLinearGradient(this._cursorFreezePos.x, this._cursorFreezePos.y, headX, headY);
      grad.addColorStop(0, 'rgba(245, 240, 232, 0)');
      grad.addColorStop(1, 'rgba(245, 240, 232, 0.4)');

      ctx.beginPath();
      ctx.moveTo(this._cursorFreezePos.x, this._cursorFreezePos.y);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Soft bloom at the head
      ctx.beginPath();
      ctx.arc(headX, headY, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 240, 232, 0.1)';
      ctx.fill();
    }

    // 2. Render subtle exposure lift / vignette relaxation
    if (this._exposureLift > 0) {
      ctx.fillStyle = `rgba(245, 240, 232, ${this._exposureLift})`;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }

    ctx.restore();
  }
}
