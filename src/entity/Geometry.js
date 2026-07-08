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
   */
  render(ctx, outerRotation, innerRotation, masterOpacity, breathScale, behaviorState) {
    if (masterOpacity <= 0.001) return;

    const cx  = this._center.x;
    const cy  = this._center.y;
    const s   = breathScale;

    const outerR = this._radii.outer * s;
    const midR   = this._radii.mid   * s;
    const coreR  = this._radii.core  * s;

    ctx.save();
    ctx.globalAlpha = masterOpacity;

    // ── Outer ring ────────────────────────────────────────────────────────
    this._drawRing(ctx, cx, cy, outerR, 0.6, COLORS.WARM_WHITE);

    // ── Outer triangle (rotates clockwise) ────────────────────────────────
    this._drawTriangle(ctx, cx, cy, outerR * 0.92, outerRotation, 0.7, COLORS.WARM_WHITE);

    // ── Inner triangle (rotates counter-clockwise) ────────────────────────
    this._drawTriangle(ctx, cx, cy, outerR * 0.92, innerRotation + Math.PI, 0.7, COLORS.WARM_WHITE);

    // ── Mid ring ──────────────────────────────────────────────────────────
    this._drawRing(ctx, cx, cy, midR, 0.4, COLORS.ELECTRIC_BLUE);

    // ── Inner spokes — 6 lines from midR to coreR ─────────────────────────
    // These create the 'impossible intersection' effect
    this._drawSpokes(ctx, cx, cy, midR, coreR, outerRotation, 0.35);

    // ── Core ring ─────────────────────────────────────────────────────────
    this._drawRing(ctx, cx, cy, coreR, 0.8, COLORS.SOFT_VIOLET);

    // ── Core dot ─────────────────────────────────────────────────────────
    ctx.globalAlpha = masterOpacity * 0.9;
    ctx.fillStyle   = COLORS.SOFT_VIOLET;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 0.35, 0, TWO_PI);
    ctx.fill();

    ctx.restore();
  }

  // ─── Private drawing primitives ───────────────────────────────────────────

  /**
   * Draw a circular ring (stroke only).
   * @private
   */
  _drawRing(ctx, cx, cy, radius, opacity, color) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TWO_PI);
    ctx.stroke();
  }

  /**
   * Draw an equilateral triangle centered at (cx, cy) with given radius.
   * @private
   */
  _drawTriangle(ctx, cx, cy, radius, rotation, opacity, color) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();

    for (let i = 0; i < 3; i++) {
      const angle = rotation + i * (TWO_PI / 3);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();
    ctx.stroke();
  }

  /**
   * Draw 6 spoke lines from midRadius to coreRadius, rotated with outerRotation.
   * These create the impossible intersection visual at the symbol's heart.
   * @private
   */
  _drawSpokes(ctx, cx, cy, fromRadius, toRadius, rotation, opacity) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = COLORS.ELECTRIC_BLUE;
    ctx.lineWidth   = 0.5;

    for (let i = 0; i < 6; i++) {
      const angle = rotation + i * PI_OVER_3;
      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(angle) * fromRadius,
        cy + Math.sin(angle) * fromRadius,
      );
      ctx.lineTo(
        cx + Math.cos(angle) * toRadius,
        cy + Math.sin(angle) * toRadius,
      );
      ctx.stroke();
    }
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
    // Entity occupies ~28% of the shorter screen dimension
    const baseRadius = this._coords.worldSizeToPixels(0.28);
    this._radii.outer = baseRadius;
    this._radii.mid   = baseRadius * 0.52;
    this._radii.core  = baseRadius * 0.18;
    this._center      = this._coords.center;
  }
}
