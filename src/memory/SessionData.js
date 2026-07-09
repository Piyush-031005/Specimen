/**
 * SPECIMEN — SessionData
 *
 * Schema for persisted encounter data.
 * What the entity remembers about the visitor.
 *
 * No scores. No achievements. Just memory.
 */

/**
 * @typedef {Object} RhythmFingerprint
 * @property {number} avgTempoMs       — Preferred response timing
 * @property {number} varianceMs       — How consistent their timing is (lower = more robotic/precise)
 * @property {number} matches          — Total successful interactions
 * @property {number} totalAttempts    — Total interaction attempts
 */

/**
 * @typedef {Object} SessionData
 * @property {number} trust                — Trust level at end of last session [0, 100]
 * @property {number} worldStage           — World stage reached [0, 4]
 * @property {number} temperament          — The organism's permanent disposition toward the visitor [-1.0 (Guarded) to 1.0 (Playful)]
 * @property {number} sessionCount         — Total number of visits
 * @property {number} totalInteractionTime — Total seconds of active engagement across all sessions
 * @property {number} spatialBiasX         — Accumulated cursor center of mass X (normalized 0-1)
 * @property {number} spatialBiasY         — Accumulated cursor center of mass Y (normalized 0-1)
 * @property {RhythmFingerprint} fingerprint — The visitor's behavioral profile
 * @property {number} lastVisitTimestamp   — Date.now() of last session
 * @property {boolean} firstSuccessAchieved — Whether first successful communication happened
 * @property {boolean} signatureMomentSeen — Whether the cursor absorption happened
 */

/** @type {SessionData} */
export const DEFAULT_SESSION_DATA = Object.freeze({
  trust: 0,
  worldStage: 0,
  temperament: 0.0,
  sessionCount: 0,
  totalInteractionTime: 0,
  spatialBiasX: 0.5,
  spatialBiasY: 0.5,
  fingerprint: {
    avgTempoMs: 0,
    varianceMs: 0,
    matches: 0,
    totalAttempts: 0
  },
  lastVisitTimestamp: 0,
  firstSuccessAchieved: false,
  signatureMomentSeen: false,
});
