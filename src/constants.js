/**
 * SPECIMEN — Constants
 *
 * The single source of truth for every value in the engine.
 * Tweak here. Never hard-code values in modules.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = Object.freeze({
  BACKGROUND: '#050505',
  WARM_WHITE: '#F5F0E8',
  ELECTRIC_BLUE: '#4B9FFF',
  SOFT_VIOLET: '#8B6FCF',
  WARM_GOLD: '#D4A843',

  // RGBA convenience (for canvas operations)
  WARM_WHITE_RGB: { r: 245, g: 240, b: 232 },
  ELECTRIC_BLUE_RGB: { r: 75, g: 159, b: 255 },
  SOFT_VIOLET_RGB: { r: 139, g: 111, b: 207 },
  WARM_GOLD_RGB: { r: 212, g: 168, b: 67 },
});

// ─── Behavior States ──────────────────────────────────────────────────────────
export const BEHAVIOR_STATES = Object.freeze({
  CURIOUS: 'curious',
  CALM: 'calm',
  DEFENSIVE: 'defensive',
  HESITANT: 'hesitant',
  TRUSTING: 'trusting',
  OBSERVING: 'observing', // Transient — silence is behavior
});

// ─── World Stages ─────────────────────────────────────────────────────────────
export const WORLD_STAGES = Object.freeze({
  DARKNESS: 0,     // Pure black. Only entity.
  PULSE: 1,        // Faint ripples from entity.
  GEOMETRY: 2,     // Background geometry begins to crystallize.
  LIGHT: 3,        // Ambient light particles emerge.
  GLIMPSE: 4,      // The Closest Glimpse — never fully revealed.
});

// ─── Events (EventBus channel names) ─────────────────────────────────────────
export const EVENTS = Object.freeze({
  // Renderer
  RENDER_TICK: 'render:tick',
  RESIZE: 'renderer:resize',

  // Input
  USER_INPUT: 'input:user',          // Raw pointer/touch/key event
  USER_PULSE_RESPONSE: 'input:pulse_response', // Deliberate rhythm response
  USER_INTERACTION_STYLE: 'input:interaction_style', // Evaluated interaction style

  // Entity
  INTRO_REVEALED: 'entity:intro_revealed',
  ENTITY_PULSE_EMITTED: 'entity:pulse_emitted',
  ENTITY_STATE_CHANGED: 'entity:state_changed',
  FIBER_PLUCK: 'entity:fiber_pluck',

  // Behavior
  BEHAVIOR_STATE_CHANGED: 'behavior:state_changed',
  BEHAVIOR_TRUST_UPDATED: 'behavior:trust_updated',

  // Communication
  COMMUNICATION_MATCH: 'comm:match',
  COMMUNICATION_MISS: 'comm:miss',
  COMMUNICATION_FIRST_SUCCESS: 'comm:first_success',

  // World
  WORLD_STAGE_CHANGED: 'world:stage_changed',

  // Audio
  AUDIO_PULSE_TRIGGER: 'audio:pulse',
  AUDIO_MATCH_TRIGGER: 'audio:match',
  AUDIO_OBSERVING_START: 'audio:observing_start',
  AUDIO_OBSERVING_END: 'audio:observing_end',

  // Memory
  MEMORY_LOADED: 'memory:loaded',
  MEMORY_SAVED: 'memory:saved',

  // Signature moment
  SIGNATURE_MOMENT_START: 'signature:start',
  SIGNATURE_MOMENT_END: 'signature:end',

  // Performance
  PERF_QUALITY_CHANGED: 'perf:quality_changed',
});

// ─── Timing (milliseconds) ────────────────────────────────────────────────────
export const TIMING = Object.freeze({
  // How long before the first hint appears (12s of idle)
  HINT_IDLE_DELAY_MS: 12_000,

  // Silence before audio begins
  AUDIO_SILENCE_BEFORE_FIRST_PULSE_MS: 3_500,

  // Entity's first pulse delay after page load
  FIRST_PULSE_DELAY_MS: 3_000,

  // Observing state duration
  OBSERVING_DURATION_MS: 5_000,

  // Signature moment duration
  SIGNATURE_MOMENT_DURATION_MS: 3_200,

  // Behavior response timing variation (entity is never perfectly deterministic)
  RESPONSE_VARIATION_MIN_MS: 150,
  RESPONSE_VARIATION_MAX_MS: 900,
});

// ─── Performance ──────────────────────────────────────────────────────────────
export const PERFORMANCE = Object.freeze({
  TARGET_FPS: 60,
  REDUCED_FPS_THRESHOLD: 45,   // Below this → reduce particle count
  PARTICLE_POOL_SIZE: 512,      // Pre-allocated pool — no GC pressure
  PARTICLE_REDUCED_POOL_SIZE: 128,
});

// ─── Trust ────────────────────────────────────────────────────────────────────
export const TRUST = Object.freeze({
  MIN: 0,
  MAX: 100,
  INITIAL: 0,
  // Trust thresholds that advance world stages
  STAGE_THRESHOLDS: [0, 20, 45, 70, 90],
  // Trust deltas per event
  MATCH_GAIN: 3,
  MISS_PENALTY: 1.5,
  IDLE_DECAY_RATE: 0.05,    // Per second when user is doing nothing
});

// ─── Reality Laws (Feature Toggles) ───────────────────────────────────────────
// Built for blind comparison testing. Each law must survive on its own merit.
export const REALITY_LAWS = {
  HEAVY_SPACE: true,      // Anisotropic compression based on threat
  LIVING_DARKNESS: true,  // Volumetric darkness reacting with inertia to certainty
  MEMORY_DISTORTION: false,
  UNCERTAINTY: false,
  WITNESS: false,
  IS_ORGANISM_VISIBLE: true // Added for World Only recording
};
