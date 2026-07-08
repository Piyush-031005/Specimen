/**
 * SPECIMEN — StageDefinitions
 *
 * The five world stages. Each defines particle behavior, background
 * luminosity, and the visual atmosphere of that moment in the encounter.
 *
 * Emotional mapping:
 *   Stage 0 (Darkness)        → Curiosity
 *   Stage 1 (Pulse)           → Confusion
 *   Stage 2 (Geometry)        → First Success / Trust
 *   Stage 3 (Light)           → Wonder
 *   Stage 4 (Closest Glimpse) → Silence → Signature Moment → Peace
 */

import { WORLD_STAGES, TRUST, COLORS } from '../constants.js';

/**
 * @typedef {Object} StageDefinition
 * @property {number} id
 * @property {string} name
 * @property {number} trustThreshold — Min trust to enter this stage
 * @property {number} backgroundLuminosity — [0, 1] overall scene brightness (gradient)
 * @property {number} particleCount — Number of active background particles
 * @property {string} particleColor — Hex or rgba
 * @property {number} particleOpacityMax — [0, 1]
 * @property {string} particleMotion — 'static' | 'inward' | 'orbital' | 'resonance'
 * @property {number} particleSpeed — Base velocity multiplier
 * @property {boolean} geometryBackground — Whether background geometry appears
 */

/** @type {StageDefinition[]} */
export const STAGE_DEFINITIONS = Object.freeze([
  {
    id: WORLD_STAGES.DARKNESS,
    name: 'Darkness',
    trustThreshold: TRUST.STAGE_THRESHOLDS[0],
    backgroundLuminosity: 0,
    particleCount: 0,
    particleColor: COLORS.WARM_WHITE,
    particleOpacityMax: 0,
    particleMotion: 'static',
    particleSpeed: 0,
    geometryBackground: false,
  },
  {
    id: WORLD_STAGES.PULSE,
    name: 'Pulse',
    trustThreshold: TRUST.STAGE_THRESHOLDS[1],
    backgroundLuminosity: 0.02,
    particleCount: 30,
    particleColor: COLORS.ELECTRIC_BLUE,
    particleOpacityMax: 0.15,
    particleMotion: 'static',
    particleSpeed: 0.05,
    geometryBackground: false,
  },
  {
    id: WORLD_STAGES.GEOMETRY,
    name: 'Geometry',
    trustThreshold: TRUST.STAGE_THRESHOLDS[2],
    backgroundLuminosity: 0.05,
    particleCount: 80,
    particleColor: COLORS.SOFT_VIOLET,
    particleOpacityMax: 0.25,
    particleMotion: 'inward',
    particleSpeed: 0.2,
    geometryBackground: true,
  },
  {
    id: WORLD_STAGES.LIGHT,
    name: 'Light',
    trustThreshold: TRUST.STAGE_THRESHOLDS[3],
    backgroundLuminosity: 0.15,
    particleCount: 200,
    particleColor: COLORS.WARM_GOLD,
    particleOpacityMax: 0.35,
    particleMotion: 'orbital',
    particleSpeed: 0.4,
    geometryBackground: true,
  },
  {
    id: WORLD_STAGES.GLIMPSE,
    name: 'The Closest Glimpse',
    trustThreshold: TRUST.STAGE_THRESHOLDS[4],
    backgroundLuminosity: 0.25,
    particleCount: 400,
    particleColor: '#F5F0E8', // Slightly warm white
    particleOpacityMax: 0.5,
    particleMotion: 'resonance',
    particleSpeed: 0.3, // Slower, calmer, more synchronized
    geometryBackground: true,
  },
]);
