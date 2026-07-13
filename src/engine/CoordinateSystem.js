/**
 * SPECIMEN — CoordinateSystem
 *
 * Maps between two coordinate spaces:
 *
 *   World Space (normalized):
 *     Center = (0, 0)
 *     Horizontal range: -1 (left) to +1 (right)
 *     Vertical range: -1 (top) to +1 (bottom)
 *     Scale unit: based on the shorter screen dimension
 *
 *   Screen Space (CSS pixels):
 *     Origin: top-left of the viewport
 *     Units: CSS pixels (DPR scaling handled by Renderer)
 *
 * All entity geometry is authored in world space.
 * The Renderer provides CSS pixel dimensions.
 * This class handles all conversion — no raw pixel math anywhere else.
 *
 * Listens to EVENTS.RESIZE to stay current without polling.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, REALITY_LAWS } from '../constants.js';

export class CoordinateSystem {
  constructor() {
    /** @type {number} CSS pixel width */
    this._cssWidth = window.innerWidth;

    /** @type {number} CSS pixel height */
    this._cssHeight = window.innerHeight;

    /**
     * The "unit" size in CSS pixels — half the shorter screen dimension.
     * A world coordinate of 1.0 = this many pixels from center.
     * @type {number}
     */
    this._halfUnit = Math.min(this._cssWidth, this._cssHeight) * 0.5;

    /** @type {number} Pre-computed center X in CSS pixels */
    this._centerX = this._cssWidth * 0.5;

    /** @type {number} Pre-computed center Y in CSS pixels */
    this._centerY = this._cssHeight * 0.5;

    EventBus.on(EVENTS.RESIZE, ({ cssWidth, cssHeight }) => {
      this._cssWidth  = cssWidth;
      this._cssHeight = cssHeight;
      this._halfUnit  = Math.min(cssWidth, cssHeight) * 0.5;
      this._centerX   = cssWidth * 0.5;
      this._centerY   = cssHeight * 0.5;
    });

    this._tension = 0;
    this._contrastMultiplier = 0.1;
    this._threatPoint = { x: this._centerX, y: this._centerY };

    EventBus.on('WORLD_PHYSICS_UPDATED', ({ tension, threatPoint, contrastMultiplier }) => {
      this._tension = tension;
      this._threatPoint = threatPoint;
      this._contrastMultiplier = contrastMultiplier || 0.1;
    });
  }
  
  get cssWidth() { return this._cssWidth; }
  get cssHeight() { return this._cssHeight; }

  // ─── Core Conversions ─────────────────────────────────────────────────────

  /**
   * Convert world (normalized) coordinates to screen (CSS pixel) coordinates.
   *
   * @param {number} wx — World X [-1, 1]
   * @param {number} wy — World Y [-1, 1]
   * @returns {{ x: number, y: number }} Screen position in CSS pixels
   */
  worldToScreen(wx, wy) {
    let sx = this._centerX + wx * this._halfUnit;
    let sy = this._centerY + wy * this._halfUnit;

    if (REALITY_LAWS.HEAVY_SPACE && this._tension > 0) {
      // Anisotropic compression: compress along the vector towards the threat
      const dx = sx - this._threatPoint.x;
      const dy = sy - this._threatPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0.01) {
        // Tension causes space to shrink inwards towards the threat (max 8% compression)
        // Contrast principle: only full compression when contrastMultiplier is high
        const compressionRange = this._halfUnit * 2.0; 
        const influence = Math.max(0, 1.0 - (dist / compressionRange));
        const effectiveTension = this._tension * this._contrastMultiplier;
        const squeeze = 1.0 - (effectiveTension * influence * 0.08);

        sx = this._threatPoint.x + dx * squeeze;
        sy = this._threatPoint.y + dy * squeeze;
      }
    }

    return { x: sx, y: sy };
  }

  /**
   * Convert screen (CSS pixel) coordinates to world (normalized) coordinates.
   *
   * @param {number} sx — Screen X in CSS pixels
   * @param {number} sy — Screen Y in CSS pixels
   * @returns {{ wx: number, wy: number }} World position in [-1, 1] range
   */
  screenToWorld(sx, sy) {
    let uncompressedX = sx;
    let uncompressedY = sy;

    if (REALITY_LAWS.HEAVY_SPACE && this._tension > 0) {
      // Inverse anisotropic compression
      const dx = sx - this._threatPoint.x;
      const dy = sy - this._threatPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0.01) {
        const compressionRange = this._halfUnit * 2.0; 
        const influence = Math.max(0, 1.0 - (dist / compressionRange));
        const effectiveTension = this._tension * this._contrastMultiplier;
        const squeeze = 1.0 - (effectiveTension * influence * 0.08);
        
        // This is an approximation of the inverse, sufficient for hit testing/interaction
        uncompressedX = this._threatPoint.x + dx / squeeze;
        uncompressedY = this._threatPoint.y + dy / squeeze;
      }
    }

    return {
      wx: (uncompressedX - this._centerX) / this._halfUnit,
      wy: (uncompressedY - this._centerY) / this._halfUnit,
    };
  }

  /**
   * Convert a scalar size from world units to CSS pixels.
   * Useful for radius values, line widths, etc.
   *
   * @param {number} worldSize — Size in world units
   * @returns {number} Size in CSS pixels
   */
  worldSizeToPixels(worldSize) {
    return worldSize * this._halfUnit;
  }

  /**
   * Convert a scalar size from CSS pixels to world units.
   *
   * @param {number} pixelSize — Size in CSS pixels
   * @returns {number} Size in world units
   */
  pixelSizeToWorld(pixelSize) {
    return pixelSize / this._halfUnit;
  }

  // ─── Convenience ──────────────────────────────────────────────────────────

  /**
   * The canvas center in CSS pixel space.
   * @returns {{ x: number, y: number }}
   */
  get center() {
    return { x: this._centerX, y: this._centerY };
  }

  /** @returns {number} CSS pixel width */
  get cssWidth() { return this._cssWidth; }

  /** @returns {number} CSS pixel height */
  get cssHeight() { return this._cssHeight; }

  /** @returns {number} World unit size in CSS pixels */
  get halfUnit() { return this._halfUnit; }

  // ─── Deprecated aliases (kept for stub compatibility) ─────────────────────

  /**
   * @deprecated Use worldToScreen(wx, wy) instead.
   * @param {number} nx
   * @param {number} ny
   */
  toPixel(nx, ny) { return this.worldToScreen(nx, ny); }

  /**
   * @deprecated Use screenToWorld(sx, sy) instead.
   * @param {number} px
   * @param {number} py
   */
  toNormalized(px, py) {
    const { wx, wy } = this.screenToWorld(px, py);
    return { nx: wx, ny: wy };
  }

  /**
   * @deprecated Use worldSizeToPixels(size) instead.
   * @param {number} normalizedSize
   */
  toPixelSize(normalizedSize) { return this.worldSizeToPixels(normalizedSize); }
}
