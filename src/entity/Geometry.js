/**
 * SPECIMEN — Geometry
 *
 * The ONE iconic impossible geometry. The entity's visual identity.
 *
 * Symbol Design: The Merkaba Form
 * ─────────────────────────────────
 * Inspired by sacred geometry / Metatron's Cube.
 * Two counter-rotating equilateral triangles (Star of David basis)
 * encased in three concentric circles, with inner connecting lines
 * creating apparent 3D impossible intersections on a 2D plane.
 *
 * Why this symbol:
 *   - Immediately recognizable after one viewing
 *   - Drawable from memory (two triangles + three circles)
 *   - The counter-rotation gives it perpetual life without changing its form
 *   - The 'impossible' inner lines suggest depth that isn't there
 *   - Sacred geometry heritage = appropriate gravitas
 *
 * Structure (from outermost to innermost):
 *   Layer 0: Outer ring (thin circle)
 *   Layer 1: Outer triangle (pointing up) — rotates clockwise
 *   Layer 2: Inner triangle (pointing down) — rotates counter-clockwise
 *   Layer 3: Mid ring (thin circle)
 *   Layer 4: Inner connecting lines (6 lines to center — 'impossible' spokes)
 *   Layer 5: Core ring (small circle at center)
 *
 * All geometry is computed in CSS pixel space.
 * The Geometry class is pure data + rendering — no state, no animation logic.
 * Animation is the responsibility of EntityAnimator.
 */

import { COLORS } from '../constants.js';

// Pre-allocated constants to avoid Math.PI * 2 per frame
const TWO_PI   = Math.PI * 2;
const PI_OVER_3 = Math.PI / 3;

export class Geometry {
  /**
   * @param {import('../engine/CoordinateSystem.js').CoordinateSystem} coords
   */
  constructor(coords) {
    this._coords = coords;

    /**
     * Cached geometry points — recalculated only on resize.
     * @type {{ outerRadius: number, midRadius: number, coreRadius: number }}
     */
    this._radii = { outer: 0, mid: 0, core: 0 };

    /** @type {{ x: number, y: number }} Cached center */
    this._center = { x: 0, y: 0 };

    this._rebuildCache();
  }

  /**
   * Call on resize to recompute cached pixel values.
   */
  rebuildCache() {
    this._rebuildCache();
  }

  /**
   * Render the complete geometry to the canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} outerRotation       — Outer triangle rotation (radians)
   * @param {number} innerRotation       — Inner triangle rotation (radians, opposite)
   * @param {number} masterOpacity       — [0, 1] Master opacity
   * @param {number} breathScale         — [0.95, 1.05] Breathing scale multiplier
   * @param {string} behaviorState       — Current behavior state (affects color tint)
   * @param {number} stage               — World stage (1 to 5)
   * @param {number} timeSinceBirth      — Seconds since entity was initialized
   */
  render(ctx, outerRotation, innerRotation, masterOpacity, breathScale, behaviorState, stage = 1, timeSinceBirth = 100) {
    if (masterOpacity <= 0.001) return;

    const cx  = this._center.x;
    const cy  = this._center.y;
    const s   = breathScale;

    const outerR = this._radii.outer * s;
    const midR   = this._radii.mid   * s;
    const coreR  = this._radii.core  * s;

    ctx.save();
    ctx.globalAlpha = masterOpacity;
    
    // Add soft glow
    ctx.shadowBlur = stage === 5 ? 10 : 25; // Reduce spectacle at stage 5
    ctx.shadowColor = COLORS.ELECTRIC_BLUE;

    // Time-based construction logic
    // 0.0s - 0.2s: Nothing
    // 0.2s - 1.0s: Core dot only
    // 1.0s - 2.0s: Geometry draws in
    const drawProgress = Math.max(0, Math.min(1, timeSinceBirth - 1.0));

    // ── The Sentient Fiber Foundation ─────────────────────────────
    // Stage 0: A single 1-pixel vertical line spanning the screen.
    // It looks like a UI mistake, until it breathes.
    
    ctx.strokeStyle = COLORS.WARM_WHITE;
    ctx.lineWidth = 1.0;
    
    // Additive blending for pure light
    ctx.globalCompositeOperation = 'screen';
    
    // The line spans the entire height of the viewport
    const height = this._coords._height; // Need access to screen height, assuming coords has it or we use fixed large number
    const lineLength = 2000; 
    
    // Subtle breathing/vibration (The Unease)
    const vibration = Math.sin(timeSinceBirth * 30) * (breathScale - 1.0) * 10;
    
    ctx.beginPath();
    ctx.moveTo(cx + vibration, cy - lineLength / 2);
    ctx.lineTo(cx - vibration, cy + lineLength / 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }



  /**
   * Apply master opacity as a multiplier.
   * @private
   */
  _clampedOpacity(localOpacity) {
    // Master opacity is set via ctx.globalAlpha at the outer save/restore level.
    // Local opacity multiplies the current master.
    return Math.max(0, Math.min(1, localOpacity));
  }

  /**
   * Rebuild pixel-space radius cache from world-space units.
   * Called once on construction and once per resize.
   * @private
   */
  _rebuildCache() {
    // Entity occupies ~45% of the shorter screen dimension
    const baseRadius = this._coords.worldSizeToPixels(0.45);
    this._radii.outer = baseRadius;
    this._radii.mid   = baseRadius * 0.52;
    this._radii.core  = baseRadius * 0.18;
    this._center      = this._coords.center;
  }
}
