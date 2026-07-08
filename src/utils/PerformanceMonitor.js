/**
 * SPECIMEN — PerformanceMonitor
 *
 * Tracks frame rate and automatically signals quality changes
 * so the engine can reduce particle counts invisibly when needed.
 *
 * Adaptive Quality Rule:
 *   60fps  → Full quality
 *   < 45fps → Emit PERF_QUALITY_CHANGED → ParticleManager reduces pool
 *   Recovery: if fps recovers to 55+ for 5 seconds → restore full quality
 */

import { EventBus } from './EventBus.js';
import { EVENTS, PERFORMANCE } from '../constants.js';

const QUALITY = Object.freeze({
  FULL: 'full',
  REDUCED: 'reduced',
});

const FPS_SAMPLE_SIZE = 60;           // Average over last N frames
const RECOVERY_DURATION_MS = 5_000;  // Time at high fps before restoring quality
const LOW_FPS_THRESHOLD = PERFORMANCE.REDUCED_FPS_THRESHOLD;
const RECOVERY_FPS_THRESHOLD = 55;

export class PerformanceMonitor {
  constructor() {
    /** @type {number[]} Ring buffer of recent frame durations (ms) */
    this._frameTimes = new Array(FPS_SAMPLE_SIZE).fill(16.67);
    this._frameIndex = 0;

    /** @type {'full'|'reduced'} */
    this._quality = QUALITY.FULL;

    /** @type {number|null} Timestamp when fps first recovered */
    this._recoveryStartTime = null;

    /** @type {number} */
    this._currentFPS = 60;
  }

  /**
   * Called every frame by the Renderer with the raw delta time.
   * @param {number} deltaMs — milliseconds since last frame
   * @param {number} nowMs — current timestamp from performance.now()
   */
  update(deltaMs, nowMs) {
    // Clamp delta to avoid wild spikes (e.g. tab switching)
    const safeDelta = Math.min(deltaMs, 100);

    this._frameTimes[this._frameIndex] = safeDelta;
    this._frameIndex = (this._frameIndex + 1) % FPS_SAMPLE_SIZE;

    const avgDelta = this._frameTimes.reduce((a, b) => a + b, 0) / FPS_SAMPLE_SIZE;
    this._currentFPS = avgDelta > 0 ? 1000 / avgDelta : 60;

    this._evaluateQuality(nowMs);
  }

  /**
   * @returns {number} The current smoothed FPS.
   */
  get fps() {
    return this._currentFPS;
  }

  /**
   * @returns {'full'|'reduced'} Current quality level.
   */
  get quality() {
    return this._quality;
  }

  /**
   * @private
   * @param {number} nowMs
   */
  _evaluateQuality(nowMs) {
    if (this._quality === QUALITY.FULL) {
      if (this._currentFPS < LOW_FPS_THRESHOLD) {
        this._quality = QUALITY.REDUCED;
        this._recoveryStartTime = null;
        EventBus.emit(EVENTS.PERF_QUALITY_CHANGED, { quality: QUALITY.REDUCED, fps: this._currentFPS });
      }
    } else {
      // In reduced quality — watch for sustained recovery
      if (this._currentFPS >= RECOVERY_FPS_THRESHOLD) {
        if (this._recoveryStartTime === null) {
          this._recoveryStartTime = nowMs;
        } else if (nowMs - this._recoveryStartTime >= RECOVERY_DURATION_MS) {
          this._quality = QUALITY.FULL;
          this._recoveryStartTime = null;
          EventBus.emit(EVENTS.PERF_QUALITY_CHANGED, { quality: QUALITY.FULL, fps: this._currentFPS });
        }
      } else {
        // FPS dropped again — reset recovery timer
        this._recoveryStartTime = null;
      }
    }
  }
}
