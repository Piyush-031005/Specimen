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

    // ── Stage 0: The Core (Rigid Geometric Shards in Darkness) ─────────────────────────────
    if (stage >= 0) {
      if (drawProgress > 0) {
        // Draw sharp shards that counter-rotate
        this._drawTriangle(ctx, cx, cy, midR, innerRotation, 0.8, COLORS.WARM_WHITE, drawProgress);
        this._drawTriangle(ctx, cx, cy, midR * 0.7, outerRotation + Math.PI, 0.6, COLORS.ELECTRIC_BLUE, drawProgress);
      }
      // Core singularity
      if (timeSinceBirth > 0.2) {
        ctx.shadowColor = COLORS.SOFT_VIOLET;
        ctx.globalAlpha = masterOpacity * (stage === 4 ? 0.4 : 0.9);
        ctx.fillStyle   = COLORS.SOFT_VIOLET;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 0.2, 0, TWO_PI);
        ctx.fill();
        ctx.shadowColor = COLORS.ELECTRIC_BLUE;
      }
    }

    // ── Stage 1: The Body (Liquid Glass Membrane begins pulsing) ──────────────────
    if (stage >= 1 && drawProgress > 0) {
      // Fluid, undulating membrane that encapsulates the rigid core
      this._drawMembrane(ctx, cx, cy, outerR, timeSinceBirth, 0.5, COLORS.WARM_WHITE, drawProgress);
      // Faint secondary membrane for glass refraction effect
      this._drawMembrane(ctx, cx, cy, outerR * 1.05, timeSinceBirth * 1.2, 0.2, COLORS.ELECTRIC_BLUE, drawProgress);
    }

    // ── Stage 2: The Structure (Internal Confinement) ────────────────────────────────────
    if (stage >= 2 && drawProgress > 0) {
      // An impossible outer geometric cage holding the fluid membrane
      this._drawRing(ctx, cx, cy, outerR * 1.15, 0.3, COLORS.WARM_WHITE, drawProgress);
    }

    // ── Stage 3 & 4: The Nervous System (Neural Flashes) ──────────────────────────────
    if (stage >= 3 && drawProgress > 0) {
      // Flashes of light connecting the core to the membrane (communication)
      // Faster when curious, calmer when accepting
      const flashSpeed = behaviorState === 'CURIOUS' ? 4.0 : 1.5;
      this._drawNeuralFlashes(ctx, cx, cy, coreR, outerR, timeSinceBirth * flashSpeed, 0.6, drawProgress);
    }

    // ── Stage 4 (Max): Acceptance (Stillness) ────────────────────────────────────
    // Emotion is conveyed through reduced breathing and stillness in EntityAnimator.
    
    ctx.restore();
  }

  // ─── Private drawing primitives ───────────────────────────────────────────

  /**
   * Draw a circular ring (stroke only).
   * @private
   */
  _drawRing(ctx, cx, cy, radius, opacity, color, drawProgress = 1) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + TWO_PI * drawProgress);
    ctx.stroke();
  }

  /**
   * Draw an equilateral triangle centered at (cx, cy) with given radius.
   * @private
   */
  _drawTriangle(ctx, cx, cy, radius, rotation, opacity, color, drawProgress = 1) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();

    const totalLength = 3;
    const drawAmount = drawProgress * totalLength;

    for (let i = 0; i < 3; i++) {
      if (drawAmount <= i) break;
      
      const angle1 = rotation + i * (TWO_PI / 3);
      const angle2 = rotation + (i + 1) * (TWO_PI / 3);
      
      const px1 = cx + Math.cos(angle1) * radius;
      const py1 = cy + Math.sin(angle1) * radius;
      
      const px2 = cx + Math.cos(angle2) * radius;
      const py2 = cy + Math.sin(angle2) * radius;

      if (i === 0) ctx.moveTo(px1, py1);

      if (drawAmount >= i + 1) {
        ctx.lineTo(px2, py2);
      } else {
        const segProgress = drawAmount - i;
        ctx.lineTo(
          px1 + (px2 - px1) * segProgress,
          py1 + (py2 - py1) * segProgress
        );
      }
    }

    ctx.stroke();
  }

  /**
   * Draw the liquid glass membrane (a continuous, undulating fluid spline).
   * @private
   */
  _drawMembrane(ctx, cx, cy, radius, time, opacity, color, drawProgress = 1) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.6;
    
    // Additive blending for a glass-like refractive overlap
    ctx.globalCompositeOperation = 'screen';
    
    ctx.beginPath();
    const segments = 24;
    const maxDrawPoints = Math.max(1, Math.floor(segments * drawProgress));
    
    let firstPx = 0, firstPy = 0;
    
    for (let i = 0; i <= maxDrawPoints; i++) {
      const angle = (i / segments) * TWO_PI;
      // Fluid undulation using sine waves of different frequencies
      const noise = Math.sin(angle * 3 + time * 1.2) * 0.04 + 
                    Math.cos(angle * 5 - time * 0.8) * 0.02;
      
      const r = radius * (1 + noise);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(px, py);
        firstPx = px;
        firstPy = py;
      } else {
        // Control point for smooth bezier (pulling slightly outward to round the curve)
        const prevAngle = ((i - 0.5) / segments) * TWO_PI;
        const prevNoise = Math.sin(prevAngle * 3 + time * 1.2) * 0.04 + 
                          Math.cos(prevAngle * 5 - time * 0.8) * 0.02;
        const cpR = radius * (1 + prevNoise) * 1.05;
        const cpx = cx + Math.cos(prevAngle) * cpR;
        const cpy = cy + Math.sin(prevAngle) * cpR;
        
        ctx.quadraticCurveTo(cpx, cpy, px, py);
      }
    }
    
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; // reset
  }

  /**
   * Draw neural flashes bridging the core and membrane.
   * @private
   */
  _drawNeuralFlashes(ctx, cx, cy, coreRadius, membraneRadius, time, opacity, drawProgress = 1) {
    ctx.globalAlpha = this._clampedOpacity(opacity);
    ctx.strokeStyle = COLORS.ELECTRIC_BLUE;
    ctx.lineWidth   = 0.4;
    
    const numFlashes = 5;
    for (let i = 0; i < numFlashes; i++) {
      // Create sporadic firing using a high-frequency sine threshold
      const firePhase = Math.sin(time * 3 + i * 2.1);
      if (firePhase > 0.95) {
        const angle = (time * 0.5 + i * PI_OVER_3) % TWO_PI;
        
        const x1 = cx + Math.cos(angle) * coreRadius;
        const y1 = cy + Math.sin(angle) * coreRadius;
        const x2 = cx + Math.cos(angle) * membraneRadius * drawProgress;
        const y2 = cy + Math.sin(angle) * membraneRadius * drawProgress;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        
        // Add a lightning-like mid-point zigzag
        const mx = cx + Math.cos(angle + 0.1) * (coreRadius + membraneRadius) * 0.5;
        const my = cy + Math.sin(angle + 0.1) * (coreRadius + membraneRadius) * 0.5;
        
        ctx.lineTo(mx, my);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
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
    // Entity occupies ~45% of the shorter screen dimension
    const baseRadius = this._coords.worldSizeToPixels(0.45);
    this._radii.outer = baseRadius;
    this._radii.mid   = baseRadius * 0.52;
    this._radii.core  = baseRadius * 0.18;
    this._center      = this._coords.center;
  }
}
