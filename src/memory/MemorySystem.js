/**
 * SPECIMEN — MemorySystem
 *
 * Persists the encounter. Loads it back on return.
 * Storage: localStorage (no server dependency for MVP).
 *
 * The entity recognizes the visitor through behavioral changes,
 * not through UI messages. No "Welcome back!" text. Ever.
 *
 * ⚠️  Stub: Full implementation in Milestone 6 (Memory System).
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';
import { DEFAULT_SESSION_DATA } from './SessionData.js';

const STORAGE_KEY = 'specimen_memory';

export class MemorySystem {
  constructor() {
    /** @type {import('./SessionData.js').SessionData} */
    this._data = JSON.parse(JSON.stringify(DEFAULT_SESSION_DATA)); // Deep clone

    /** @type {number[]} Accumulating response times this session for variance calc */
    this._recentResponseTimes = [];
  }

  /**
   * Load memory from storage. Call at startup.
   * @returns {import('./SessionData.js').SessionData} The loaded data.
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Deep merge to preserve structure
        this._data = { 
          ...JSON.parse(JSON.stringify(DEFAULT_SESSION_DATA)), 
          ...parsed,
          fingerprint: {
            ...DEFAULT_SESSION_DATA.fingerprint,
            ...(parsed.fingerprint || {})
          },
          identitySignature: {
            ...DEFAULT_SESSION_DATA.identitySignature,
            ...(parsed.identitySignature || {})
          }
        };
      }
    } catch {
      this._data = JSON.parse(JSON.stringify(DEFAULT_SESSION_DATA));
    }

    this._data.sessionCount += 1;
    
    EventBus.emit(EVENTS.MEMORY_LOADED, { data: this._data });
    return this._data;
  }

  /**
   * Save current session state to storage.
   * Micro-evolves the Identity Signature on every save.
   */
  save() {
    this._data.lastVisitTimestamp = Date.now();
    this._evolveIdentitySignature();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      EventBus.emit(EVENTS.MEMORY_SAVED, { data: this._data });
    } catch {
      // Storage unavailable — fail silently
    }
  }

  /**
   * Slowly erode the Identity Signature based on history.
   * This is microscopic. It takes many sessions to become prominent.
   * @private
   */
  _evolveIdentitySignature() {
    const sig = this._data.identitySignature;
    const temp = this._data.temperament; // -1 to 1

    // Breath Asymmetry: Playful = longer inhale, Guarded = longer exhale
    // Evolves by 0.001 per save towards a max of 1.1 or 0.9
    const targetAsym = 1.0 + (temp * 0.1);
    sig.breathAsymmetry += (targetAsym - sig.breathAsymmetry) * 0.01;

    // Drift Bias: slowly biased by the center of historical tension.
    // We can approximate the center of mass of the history field.
    let sumX = 0, sumY = 0, totalW = 0;
    const field = this._data.historyField || DEFAULT_SESSION_DATA.historyField;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const w = field[y * 4 + x];
        sumX += (x / 3) * w;
        sumY += (y / 3) * w;
        totalW += w;
      }
    }
    const avgX = totalW > 0 ? sumX / totalW : 0.5;
    const avgY = totalW > 0 ? sumY / totalW : 0.5;

    const targetDriftX = (avgX - 0.5) * 2; // -1 to 1
    const targetDriftY = (avgY - 0.5) * 2;
    sig.driftBiasX += (targetDriftX - sig.driftBiasX) * 0.01;
    sig.driftBiasY += (targetDriftY - sig.driftBiasY) * 0.01;

    // Rotational Bias: Fast, frantic history (low temp, high variance) causes a slightly erratic/faster rotation
    const varianceRatio = Math.min(this._data.fingerprint.varianceMs / 200, 1.0); // 0 to 1
    const targetRot = 1.0 + (varianceRatio * 0.1) - (temp * 0.05);
    sig.rotationalBias += (targetRot - sig.rotationalBias) * 0.01;
  }

  /**
   * Update trust level in memory.
   * @param {number} trust
   */
  updateTrust(trust) {
    this._data.trust = trust;
  }

  /**
   * Shift the organism's permanent temperament based on interaction style.
   * -1.0 (Guarded/Reserved) to 1.0 (Playful/Curious)
   * @param {number} delta 
   */
  updateTemperament(delta) {
    this._data.temperament = Math.max(-1.0, Math.min(1.0, this._data.temperament + delta));
  }

  /**
   * Accumulate historical tension by lingering in a specific spot.
   * Diffuses naturally into the 4x4 field.
   * @param {number} nx - Normalized X (0.0 to 1.0)
   * @param {number} ny - Normalized Y (0.0 to 1.0)
   * @param {number} amount - The amount of tension to add (e.g. deltaSeconds * 0.05)
   */
  diffuseHistory(nx, ny, amount) {
    if (!this._data.historyField) this._data.historyField = [...DEFAULT_SESSION_DATA.historyField];
    const field = this._data.historyField;
    
    // Map nx, ny to grid space [0, 3]
    const gx = nx * 3;
    const gy = ny * 3;

    // Distribute tension to the 4 nearest nodes (bilinear distribution)
    const x0 = Math.floor(gx);
    const x1 = Math.min(3, x0 + 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(3, y0 + 1);

    const tx = gx - x0;
    const ty = gy - y0;

    const w00 = (1 - tx) * (1 - ty);
    const w10 = tx * (1 - ty);
    const w01 = (1 - tx) * ty;
    const w11 = tx * ty;

    // Apply and cap at 1.0 (Maximum tension)
    field[y0 * 4 + x0] = Math.min(1.0, field[y0 * 4 + x0] + amount * w00);
    field[y0 * 4 + x1] = Math.min(1.0, field[y0 * 4 + x1] + amount * w10);
    field[y1 * 4 + x0] = Math.min(1.0, field[y1 * 4 + x0] + amount * w01);
    field[y1 * 4 + x1] = Math.min(1.0, field[y1 * 4 + x1] + amount * w11);
  }

  /**
   * Reads the accumulated continuous tension at any point in space.
   * @param {number} nx - Normalized X
   * @param {number} ny - Normalized Y
   * @returns {number} Tension [0.0 to 1.0]
   */
  getHistoricalTension(nx, ny) {
    if (!this._data.historyField) return 0.0;
    const field = this._data.historyField;
    
    const gx = Math.max(0, Math.min(3, nx * 3));
    const gy = Math.max(0, Math.min(3, ny * 3));

    const x0 = Math.floor(gx);
    const x1 = Math.min(3, x0 + 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(3, y0 + 1);

    const tx = gx - x0;
    const ty = gy - y0;

    const v00 = field[y0 * 4 + x0];
    const v10 = field[y0 * 4 + x1];
    const v01 = field[y1 * 4 + x0];
    const v11 = field[y1 * 4 + x1];

    // Bilinear interpolation
    const top = v00 * (1 - tx) + v10 * tx;
    const bot = v01 * (1 - tx) + v11 * tx;
    return top * (1 - ty) + bot * ty;
  }

  /**
   * Accumulate genuine interaction time.
   */
  addInteractionTime(deltaSeconds) {
    this._data.totalInteractionTime += deltaSeconds;
  }

  /**
   * Calculate habitat maturity [0.0, 1.0].
   * It takes ~5-10 minutes of genuine interaction to fully mature the habitat.
   * Trust and temperament also act as multipliers.
   */
  getHabitatMaturity() {
    // 300 seconds (5 mins) = 1.0 maturity baseline
    let timeMaturity = Math.min(this._data.totalInteractionTime / 300, 1.0);
    
    // Higher trust accelerates maturity
    const trustFactor = 1.0 + (this._data.trust / 100);
    
    // Temperament (-1 to 1) -> 0.8 to 1.2
    const temperamentFactor = 1.0 + (this._data.temperament * 0.2);

    return Math.min(1.0, timeMaturity * trustFactor * temperamentFactor);
  }

  /**
   * Update world stage in memory.
   * @param {number} stage
   */
  updateStage(stage) {
    this._data.worldStage = Math.max(this._data.worldStage, stage);
  }

  /**
   * Record an interaction to build the rhythm fingerprint.
   * @param {boolean} isMatch 
   * @param {number} responseTimeMs - only provided if isMatch is true
   */
  recordInteraction(isMatch, responseTimeMs = 0) {
    const fp = this._data.fingerprint;
    fp.totalAttempts += 1;

    if (isMatch) {
      fp.matches += 1;
      this._recentResponseTimes.push(responseTimeMs);
      
      // Calculate running average
      fp.avgTempoMs = ((fp.avgTempoMs * (fp.matches - 1)) + responseTimeMs) / fp.matches;

      // Calculate variance (average deviation from the mean)
      let sumDeviation = 0;
      for (const t of this._recentResponseTimes) {
        sumDeviation += Math.abs(t - fp.avgTempoMs);
      }
      fp.varianceMs = sumDeviation / this._recentResponseTimes.length;
      
      // Keep recent array bounded
      if (this._recentResponseTimes.length > 50) {
        this._recentResponseTimes.shift();
      }
    }
  }

  /**
   * Calculates the starting trust for a return visitor based on time away.
   * Real-world time decay: shorter absence = higher retention.
   * @returns {number}
   */
  calculateReturningTrust() {
    if (this._data.sessionCount <= 1 || this._data.lastVisitTimestamp === 0) return 0;
    
    const timeAwayMs = Date.now() - this._data.lastVisitTimestamp;
    const hoursAway = timeAwayMs / (1000 * 60 * 60);
    
    // Decay curve: 
    // 1 hour away = keeps ~90% of trust
    // 24 hours away = keeps ~40% of trust
    // 7 days away = keeps ~10% of trust
    const retentionFactor = Math.max(0.1, Math.exp(-hoursAway / 24));
    
    // Maximum starting trust is capped at 40 (must re-earn higher stages)
    return Math.min(this._data.trust * retentionFactor, 40);
  }

  /**
   * If the visitor interacts with a similar rhythm to their past sessions,
   * they are "recognized", giving a slight boost to trust gains.
   * @param {number} currentResponseMs 
   * @returns {number} Multiplier (e.g. 1.0 to 1.5)
   */
  getFamiliarityMultiplier(currentResponseMs) {
    const fp = this._data.fingerprint;
    // Must have a meaningful fingerprint established
    if (fp.matches < 10 || fp.avgTempoMs === 0) return 1.0;

    // Check if their current timing falls within their historical variance
    const deviation = Math.abs(currentResponseMs - fp.avgTempoMs);
    
    // If they are within 1.5x of their normal variance, they are recognized
    if (deviation <= fp.varianceMs * 1.5) {
      // The tighter the variance, the stronger the recognition, up to +30% boost
      const accuracy = 1 - (deviation / (fp.varianceMs * 1.5));
      return 1.0 + (0.3 * accuracy); 
    }

    return 1.0; // Stranger rhythm
  }

  /** @returns {import('./SessionData.js').SessionData} */
  get data() { return this._data; }

  /** @returns {boolean} True if this is not the first visit */
  get isReturnVisitor() { return this._data.sessionCount > 1; }
}
