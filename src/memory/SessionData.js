/**
 * SPECIMEN — SessionData
 *
 * Schema for persisted encounter data.
 * What the entity remembers about the visitor.
 *
 * No scores. No achievements. Just memory.
 */

/**
 * @typedef {Object} SessionData
 * @property {number} trust                — Trust level at end of last session [0, 100]
 * @property {number} worldStage           — World stage reached [0, 4]
 * @property {number} sessionCount         — Total number of visits
 * @property {string} rhythmStyle          — 'fast' | 'slow' | 'irregular' | 'unknown'
 * @property {number} avgResponseTimeMs    — Average response time in ms
 * @property {number} lastVisitTimestamp   — Date.now() of last session
 * @property {boolean} firstSuccessAchieved — Whether first successful communication happened
 * @property {boolean} signatureMomentSeen — Whether the cursor absorption happened
 */

/** @type {SessionData} */
export const DEFAULT_SESSION_DATA = Object.freeze({
  trust: 0,
  worldStage: 0,
  sessionCount: 0,
  rhythmStyle: 'unknown',
  avgResponseTimeMs: 0,
  lastVisitTimestamp: 0,
  firstSuccessAchieved: false,
  signatureMomentSeen: false,
});

/**
 * Classify rhythm style from average response time.
 * @param {number} avgMs
 * @returns {string}
 */
export function classifyRhythmStyle(avgMs) {
  if (avgMs === 0) return 'unknown';
  if (avgMs < 250) return 'fast';
  if (avgMs < 500) return 'moderate';
  return 'slow';
}
