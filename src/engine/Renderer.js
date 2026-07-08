/**
 * SPECIMEN — Renderer
 *
 * The canvas engine. Owns the requestAnimationFrame loop.
 * Responsibilities:
 *   - Initialize and size the canvas (with devicePixelRatio support)
 *   - Run the render loop with accurate delta time
 *   - Handle resize events cleanly
 *   - Emit RENDER_TICK on every frame for all systems to consume
 *   - Feed frame data to PerformanceMonitor
 *
 * Nothing is drawn here. Drawing is done by systems that
 * subscribe to RENDER_TICK and receive the canvas context.
 */

import { EventBus } from '../utils/EventBus.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { EVENTS } from '../constants.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this._canvas = canvas;

    /** @type {CanvasRenderingContext2D} */
    this._ctx = canvas.getContext('2d', { alpha: false });

    /** @type {PerformanceMonitor} */
    this._perf = new PerformanceMonitor();

    /** @type {number|null} requestAnimationFrame handle */
    this._rafHandle = null;

    /** @type {number} Timestamp of previous frame */
    this._lastTime = 0;

    /** @type {boolean} */
    this._running = false;

    /** @type {number} Physical pixel width */
    this.width = 0;

    /** @type {number} Physical pixel height */
    this.height = 0;

    /** @type {number} CSS pixel width */
    this.cssWidth = 0;

    /** @type {number} CSS pixel height */
    this.cssHeight = 0;

    /** @type {number} Device pixel ratio */
    this.dpr = window.devicePixelRatio || 1;

    this._onResize = this._onResize.bind(this);
    this._tick = this._tick.bind(this);
  }

  /**
   * Initialize canvas sizing and start observing resize.
   */
  init() {
    this._resize();
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  /**
   * Start the render loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._rafHandle = requestAnimationFrame(this._tick);
  }

  /**
   * Stop the render loop.
   */
  stop() {
    this._running = false;
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  /**
   * Tear down. Remove listeners. Stop loop.
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * @private
   * @param {number} now — DOMHighResTimeStamp from rAF
   */
  _tick(now) {
    if (!this._running) return;

    const deltaMs = now - this._lastTime;
    this._lastTime = now;

    // Update performance monitor
    this._perf.update(deltaMs, now);

    // Clear canvas to background color
    this._ctx.fillStyle = '#050505';
    this._ctx.fillRect(0, 0, this.width, this.height);

    // Emit tick — all render subscribers draw here
    EventBus.emit(EVENTS.RENDER_TICK, {
      ctx: this._ctx,
      deltaMs,
      deltaSeconds: deltaMs / 1000,
      now,
      width: this.width,
      height: this.height,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
      dpr: this.dpr,
      fps: this._perf.fps,
      quality: this._perf.quality,
    });

    this._rafHandle = requestAnimationFrame(this._tick);
  }

  /** @private */
  _onResize() {
    this._resize();
  }

  /** @private */
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.cssWidth = window.innerWidth;
    this.cssHeight = window.innerHeight;
    this.width = Math.round(this.cssWidth * dpr);
    this.height = Math.round(this.cssHeight * dpr);

    this._canvas.width = this.width;
    this._canvas.height = this.height;
    this._canvas.style.width = `${this.cssWidth}px`;
    this._canvas.style.height = `${this.cssHeight}px`;

    // Scale context to match DPR — all drawing code uses CSS pixels
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    EventBus.emit(EVENTS.RESIZE, {
      width: this.width,
      height: this.height,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
      dpr,
    });
  }
}
