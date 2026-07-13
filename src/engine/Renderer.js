/**
 * SPECIMEN — Renderer
 *
 * The canvas engine. Owns the requestAnimationFrame loop.
 *
 * Responsibilities:
 *   - Initialize and size the canvas (DPR-aware — retina support)
 *   - Run the render loop with high-precision delta time
 *   - Handle resize events without jank (rAF-debounced)
 *   - Clear the canvas each frame
 *   - Emit RENDER_TICK every frame for all systems to draw
 *   - Feed frame data to PerformanceMonitor
 *
 * PERFORMANCE CONTRACT:
 *   Zero heap allocations inside the render loop.
 *   The tick data object is pre-allocated at construction and mutated in-place.
 *   Subscribers of RENDER_TICK MUST NOT mutate the tick data object.
 *
 * Nothing is drawn here. All drawing happens in RENDER_TICK subscribers.
 */

import { EventBus } from '../utils/EventBus.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { EVENTS, REALITY_LAWS } from '../constants.js';

/** Maximum delta time spike to clamp (ms). Prevents jank after tab switches. */
const MAX_DELTA_MS = 100;

/**
 * @typedef {Object} RenderTickData
 * @property {CanvasRenderingContext2D} ctx
 * @property {number} deltaMs
 * @property {number} deltaSeconds
 * @property {number} now
 * @property {number} width      — Physical pixels
 * @property {number} height     — Physical pixels
 * @property {number} cssWidth   — CSS pixels (use for drawing)
 * @property {number} cssHeight  — CSS pixels (use for drawing)
 * @property {number} dpr
 * @property {number} fps
 * @property {string} quality    — 'full' | 'reduced'
 */

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this._canvas = canvas;

    /** @type {CanvasRenderingContext2D} */
    this._ctx = canvas.getContext('2d', {
      alpha: false,         // Opaque canvas — no compositing cost
      desynchronized: true, // Hint to browser: reduce latency where supported
    });

    /** @type {PerformanceMonitor} */
    this._perf = new PerformanceMonitor();

    /** @type {CanvasPattern|null} */
    this._noisePattern = null;

    /** @type {number|null} requestAnimationFrame handle */
    this._rafHandle = null;

    /** @type {number} Timestamp of previous frame */
    this._lastTime = 0;

    /** @type {boolean} */
    this._running = false;

    /** @type {boolean} Resize pending flag — rAF debounce */
    this._resizePending = false;

    // ─── Pre-allocated tick data — NEVER reassigned, only mutated ───────────
    // This is the core zero-allocation guarantee of the render loop.
    /** @type {RenderTickData} */
    this._tickData = {
      ctx: this._ctx,
      deltaMs: 0,
      deltaSeconds: 0,
      now: 0,
      width: 0,
      height: 0,
      cssWidth: 0,
      cssHeight: 0,
      dpr: 1,
      fps: 60,
      quality: 'full',
    };

    // Bind once — never bind in the loop
    this._tick = this._tick.bind(this);
    this._onWindowResize = this._onWindowResize.bind(this);

    /** @type {number} Current background luminosity [0, 1] */
    this._bgLuminosity = 0;

    this._mouseX = window.innerWidth / 2;
    this._mouseY = window.innerHeight / 2;

    this._worldCertainty = 1.0;
    this._darknessRadius = 100; // Starts small (closed in)

    EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
      this._mouseX = x;
      this._mouseY = y;
    });

    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stageDef }) => {
      this._bgLuminosity = stageDef.backgroundLuminosity;
    });

    EventBus.on('WORLD_PHYSICS_UPDATED', ({ certainty }) => {
      this._worldCertainty = certainty;
    });
    
    // EVOLUTION EFFECTS
    this._shakeTime = 0;
    this._evolutionLevel = 1;
    this._stars = [];
    
    EventBus.on('ORGANISM_EVOLVED', ({ level }) => {
        this._evolutionLevel = level;
        this._shakeTime = 0.5;
        if (level === 3) this._generateStars(); // Apex predator reaches cosmic scale
    });
    
    EventBus.on('ORGANISM_APEX_FEEDING', () => {
        this._shakeTime = 0.3; // Shake every time it feeds at max level
    });
  }

  _generateStars() {
      for (let i = 0; i < 200; i++) {
          this._stars.push({
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              z: Math.random() * 2 + 0.1, // depth
              alpha: Math.random() * 0.5 + 0.1
          });
      }
  }

  /**
   * Initialize canvas sizing and start listening for resize.
   * Must be called before start().
   */
  init() {
    this._applyResize();
    window.addEventListener('resize', this._onWindowResize, { passive: true });
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
   * Stop the render loop. Does not destroy the canvas.
   */
  stop() {
    this._running = false;
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  /**
   * Full teardown. Removes listeners. Safe to call multiple times.
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onWindowResize);
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  /** @returns {number} Current CSS width */
  get cssWidth() { return this._tickData.cssWidth; }

  /** @returns {number} Current CSS height */
  get cssHeight() { return this._tickData.cssHeight; }

  /** @returns {number} Device pixel ratio */
  get dpr() { return this._tickData.dpr; }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * Core render loop callback.
   * @private
   * @param {number} now — DOMHighResTimeStamp from requestAnimationFrame
   */
  _tick(now) {
    if (!this._running) return;

    // ── Delta time ────────────────────────────────────────────────────────
    // Clamp to MAX_DELTA_MS to prevent massive deltas after tab switch / focus loss
    const rawDelta = now - this._lastTime;
    const deltaMs = rawDelta > MAX_DELTA_MS ? MAX_DELTA_MS : rawDelta;
    this._lastTime = now;

    // ── Performance sampling ──────────────────────────────────────────────
    this._perf.update(deltaMs, now);

    // ── Deferred resize ───────────────────────────────────────────────────
    if (this._resizePending) {
      this._resizePending = false;
      this._applyResize();
    }

    // ── Mutate pre-allocated tick data (zero allocation) ─────────────────
    this._tickData.deltaMs      = deltaMs;
    this._tickData.deltaSeconds = deltaMs * 0.001; // Avoid division
    this._tickData.now          = now;
    this._tickData.fps          = this._perf.fps;
    this._tickData.quality      = this._perf.quality;

    // ── Clear canvas & draw background distortion ───────────────────────────
    const cx = this._tickData.cssWidth / 2;
    const cy = this._tickData.cssHeight / 2;

    // Base background (Microscopically noisy floor instead of dead #000000)
    if (this._noisePattern) {
      this._ctx.fillStyle = this._noisePattern;
    } else {
      this._ctx.fillStyle = '#050505'; // Fallback slightly above 0
    }
    this._ctx.fillRect(0, 0, this._tickData.cssWidth, this._tickData.cssHeight);
    
    // Screen Shake Effect
    if (this._shakeTime > 0) {
        this._shakeTime -= deltaMs * 0.001;
        const intensity = (this._shakeTime / 0.5) * 15; // Max 15px shake
        const rx = (Math.random() - 0.5) * intensity;
        const ry = (Math.random() - 0.5) * intensity;
        this._canvas.style.transform = `translate(${rx}px, ${ry}px)`;
        if (this._shakeTime <= 0) {
            this._canvas.style.transform = `translate(0px, 0px)`;
        }
    }
    
    // Cosmic Scale Background (Level 3)
    if (this._evolutionLevel === 3 && this._stars) {
        this._ctx.fillStyle = '#ffffff';
        const t = now * 0.0005;
        for (let i = 0; i < this._stars.length; i++) {
            const s = this._stars[i];
            const px = (s.x - (this._mouseX - cx) * 0.1 / s.z); // Mouse parallax
            const py = (s.y - (this._mouseY - cy) * 0.1 / s.z);
            // Twinkle
            const alpha = s.alpha * (0.5 + Math.sin(t + i) * 0.5);
            this._ctx.globalAlpha = alpha;
            this._ctx.fillRect(px, py, 1.5, 1.5);
        }
        this._ctx.globalAlpha = 1.0;
    }

    // ── Darkness Modes (A, B, C) ──────────────────────────────────────────────
    if (REALITY_LAWS.DARKNESS_MODE === 'B' || REALITY_LAWS.DARKNESS_MODE === 'C') {
      const radius = Math.max(cx, cy) * 1.5;
      
      // Static floor (No mouse tracking in Pass 1)
      this._distX = cx;
      this._distY = cy;
      
      const gradient = this._ctx.createRadialGradient(this._distX, this._distY, 0, cx, cy, radius);
      
      const l = this._bgLuminosity;
      const r = Math.floor(6 + l * 20);
      const g = Math.floor(8 + l * 20);
      const b = Math.floor(14 + l * 20);
      
      gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
      gradient.addColorStop(0.5, 'rgba(3, 4, 6, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this._ctx.globalCompositeOperation = 'screen';
      this._ctx.fillStyle = gradient;
      this._ctx.fillRect(0, 0, this._tickData.cssWidth, this._tickData.cssHeight);
      this._ctx.globalCompositeOperation = 'source-over';

      if (REALITY_LAWS.DARKNESS_MODE === 'C') {
        const maxRadius = Math.max(cx, cy) * 1.5;
        // No certainty math in Pass 1. Constant static radius.
        const targetRadius = 100 + maxRadius; 
        
        const decaySpeed = 0.3;
        this._darknessRadius = this._darknessRadius + (targetRadius - this._darknessRadius) * (1.0 - Math.exp(-decaySpeed * this._tickData.deltaSeconds));

        const t1 = Math.sin(this._tickData.now * 0.002);
        const t2 = Math.cos(this._tickData.now * 0.0053);
        const t3 = Math.sin(this._tickData.now * 0.0089);
        const arrhythmicThrob = t1 * t2 * t3;
        
        // 10% Intensity, no tension math
        const tensionVibration = arrhythmicThrob * 4.0; // was 40.0
        const innerRad = Math.max(0, this._darknessRadius * 0.2 + tensionVibration);
        const outerRad = Math.max(1, this._darknessRadius + tensionVibration * 0.5);

        const darkGradient = this._ctx.createRadialGradient(this._distX, this._distY, innerRad, this._distX, this._distY, outerRad);
        darkGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        darkGradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.5)');
        darkGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.95)');
        darkGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

        this._ctx.fillStyle = darkGradient;
        this._ctx.fillRect(0, 0, this._tickData.cssWidth, this._tickData.cssHeight);
      }
    }

    // ── Emit tick — all subscribers draw here ─────────────────────────────
    EventBus.emit(EVENTS.RENDER_TICK, this._tickData);

    // ── Schedule next frame ───────────────────────────────────────────────
    this._rafHandle = requestAnimationFrame(this._tick);
  }

  /**
   * Called on window resize. Sets a flag — actual resize deferred to next rAF.
   * Prevents dozens of canvas resizes per second during a drag-resize.
   * @private
   */
  _onWindowResize() {
    this._resizePending = true;
  }

  /**
   * Apply the current window size to the canvas.
   * Called once on init, then deferred via _resizePending flag.
   * @private
   */
  _applyResize() {
    const dpr       = window.devicePixelRatio || 1;
    const cssWidth  = window.innerWidth;
    const cssHeight = window.innerHeight;
    const width     = Math.round(cssWidth * dpr);
    const height    = Math.round(cssHeight * dpr);

    this._canvas.width  = width;
    this._canvas.height = height;
    this._canvas.style.width  = `${cssWidth}px`;
    this._canvas.style.height = `${cssHeight}px`;

    // Apply DPR transform once per resize — drawing code always uses CSS pixels
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Rebuild noise pattern if missing (size doesn't matter since it repeats)
    if (!this._noisePattern) {
      this._buildNoisePattern();
    }

    // Update tick data dimensions (pre-allocated object)
    this._tickData.dpr       = dpr;
    this._tickData.width     = width;
    this._tickData.height    = height;
    this._tickData.cssWidth  = cssWidth;
    this._tickData.cssHeight = cssHeight;

    EventBus.emit(EVENTS.RESIZE, {
      width, height, cssWidth, cssHeight, dpr,
    });
  }

  /**
   * Builds a static 128x128 noise pattern to prevent the screen from feeling dead.
   * @private
   */
  _buildNoisePattern() {
    const size = 128;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext('2d', { alpha: false });
    if (!offCtx) return;

    const imgData = offCtx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 8; // Very subtle noise (0-8 out of 255)
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v + 1; // Slight blue tint
      data[i + 3] = 255;
    }
    
    offCtx.putImageData(imgData, 0, 0);
    this._noisePattern = this._ctx.createPattern(offCanvas, 'repeat');
  }
}
