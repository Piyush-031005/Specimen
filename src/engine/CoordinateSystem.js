/**
 * SPECIMEN — CoordinateSystem
 *
 * Maps between canvas CSS pixel space and normalized [-1, 1] space.
 * Keeps a consistent coordinate system regardless of screen size.
 *
 * Normalized space:
 *   Center = (0, 0)
 *   Right   = +1 on the X axis (based on shorter dimension)
 *   Up      = -1 on the Y axis
 *
 * This ensures entity geometry is screen-size-agnostic.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class CoordinateSystem {
  constructor() {
    /** @type {number} */
    this.cssWidth = window.innerWidth;
    /** @type {number} */
    this.cssHeight = window.innerHeight;
    /** @type {number} Shorter of width/height — used as the unit scale */
    this.unit = Math.min(this.cssWidth, this.cssHeight);

    EventBus.on(EVENTS.RESIZE, ({ cssWidth, cssHeight }) => {
      this.cssWidth = cssWidth;
      this.cssHeight = cssHeight;
      this.unit = Math.min(cssWidth, cssHeight);
    });
  }

  /**
   * Convert normalized [-1, 1] coordinates to CSS pixel coordinates.
   * @param {number} nx — normalized x
   * @param {number} ny — normalized y
   * @returns {{ x: number, y: number }}
   */
  toPixel(nx, ny) {
    return {
      x: this.cssWidth / 2 + nx * (this.unit / 2),
      y: this.cssHeight / 2 + ny * (this.unit / 2),
    };
  }

  /**
   * Convert CSS pixel coordinates to normalized [-1, 1] coordinates.
   * @param {number} px — pixel x
   * @param {number} py — pixel y
   * @returns {{ nx: number, ny: number }}
   */
  toNormalized(px, py) {
    return {
      nx: (px - this.cssWidth / 2) / (this.unit / 2),
      ny: (py - this.cssHeight / 2) / (this.unit / 2),
    };
  }

  /**
   * Scale a normalized size value to CSS pixels.
   * @param {number} normalizedSize
   * @returns {number}
   */
  toPixelSize(normalizedSize) {
    return normalizedSize * (this.unit / 2);
  }

  /**
   * @returns {{ cx: number, cy: number }} Canvas center in CSS pixels.
   */
  get center() {
    return { cx: this.cssWidth / 2, cy: this.cssHeight / 2 };
  }
}
