/**
 * SPECIMEN — Geometry
 *
 * The ONE iconic impossible geometry.
 * A singular, unforgettable symbol — not infinitely random shapes.
 * Inspired by sacred geometry / Escher / Interstellar tessaract.
 *
 * Design Decisions:
 *   - A nested set of counter-rotating geometric rings with
 *     mathematically impossible intersections.
 *   - The inner form appears to fold through itself in 3D
 *     while staying on a 2D canvas.
 *   - Built from a combination of:
 *       * Interlocking equilateral triangles (Star of David base)
 *       * Subdivided into a 3D-projected octahedron silhouette
 *       * With inner 'impossible' connecting lines
 *   - This specific symbol should be drawable from memory.
 *
 * ⚠️  Stub: Full procedural generation in Milestone 2.
 */

export class Geometry {
  /**
   * @param {number} cx — center x in CSS pixels
   * @param {number} cy — center y in CSS pixels
   * @param {number} radius — outer radius in CSS pixels
   */
  constructor(cx, cy, radius) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;

    /** @type {Array<{points: number[][], opacity: number, width: number}>} */
    this._layers = [];

    this._build();
  }

  /**
   * Render the geometry to a canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} rotation — outer ring rotation in radians
   * @param {number} innerRotation — inner ring rotation in radians (counter)
   * @param {number} opacity — master opacity [0, 1]
   */
  render(ctx, rotation, innerRotation, opacity) {
    // Milestone 2: full render implementation
  }

  /**
   * Update center and radius (on resize or entity movement).
   * @param {number} cx
   * @param {number} cy
   * @param {number} radius
   */
  update(cx, cy, radius) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
    this._build();
  }

  /** @private */
  _build() {
    // Milestone 2: procedurally build all geometry layers
    this._layers = [];
  }
}
