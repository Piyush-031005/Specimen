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
import { DEFAULT_SESSION_DATA, classifyRhythmStyle } from './SessionData.js';

const STORAGE_KEY = 'specimen_memory';

export class MemorySystem {
  constructor() {
    /** @type {import('./SessionData.js').SessionData} */
    this._data = { ...DEFAULT_SESSION_DATA };

    /** @type {number[]} Accumulating response times this session */
    this._responseTimes = [];
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
        this._data = { ...DEFAULT_SESSION_DATA, ...parsed };
      }
    } catch {
      this._data = { ...DEFAULT_SESSION_DATA };
    }

    this._data.sessionCount += 1;
    this._data.lastVisitTimestamp = Date.now();

    EventBus.emit(EVENTS.MEMORY_LOADED, { data: this._data });
    return this._data;
  }

  /**
   * Save current session state to storage.
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      EventBus.emit(EVENTS.MEMORY_SAVED, { data: this._data });
    } catch {
      // Storage unavailable — fail silently
    }
  }

  /**
   * Update trust level in memory.
   * @param {number} trust
   */
  updateTrust(trust) {
    this._data.trust = trust;
  }

  /**
   * Update world stage in memory.
   * @param {number} stage
   */
  updateStage(stage) {
    this._data.worldStage = Math.max(this._data.worldStage, stage);
  }

  /**
   * Record a response time to build the rhythm fingerprint.
   * @param {number} responseTimeMs
   */
  recordResponseTime(responseTimeMs) {
    this._responseTimes.push(responseTimeMs);
    const avg = this._responseTimes.reduce((a, b) => a + b, 0) / this._responseTimes.length;
    this._data.avgResponseTimeMs = avg;
    this._data.rhythmStyle = classifyRhythmStyle(avg);
  }

  /** @returns {import('./SessionData.js').SessionData} */
  get data() { return this._data; }

  /** @returns {boolean} True if this is not the first visit */
  get isReturnVisitor() { return this._data.sessionCount > 1; }
}
