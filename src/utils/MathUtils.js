/**
 * SPECIMEN — MathUtils
 *
 * Custom easing and math primitives.
 * Rule: No bounce. No elastic. No cartoony curves.
 * Everything: slow, organic, hesitant, alive.
 */

// ─── Fundamental ─────────────────────────────────────────────────────────────

/**
 * Linear interpolation between a and b by t.
 * @param {number} a
 * @param {number} b
 * @param {number} t — [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a value from one range to another.
 * @param {number} value
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, t);
}

/**
 * Normalize a value to [0, 1] within a range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function normalize(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Convert degrees to radians.
 * @param {number} degrees
 * @returns {number}
 */
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Distance between two 2D points.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Random float between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(randomFloat(min, max + 1));
}

// ─── Easing Functions (Custom — SPECIMEN Language) ────────────────────────────

/**
 * Smootherstep — Perlin's improved smooth interpolation.
 * Slower start and end than smoothstep. Feels organic.
 * @param {number} t — [0, 1]
 * @returns {number}
 */
export function smootherstep(t) {
  t = clamp(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Ease in — slow start, accelerating. Feels like hesitation.
 * @param {number} t — [0, 1]
 * @returns {number}
 */
export function easeIn(t) {
  return t * t * t;
}

/**
 * Ease out — fast start, decelerating. Feels like breath release.
 * @param {number} t — [0, 1]
 * @returns {number}
 */
export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Organic sine pulse — not a perfect sine, has slight asymmetry.
 * Feels like a living breath cycle.
 * @param {number} t — time in seconds
 * @param {number} frequency — cycles per second
 * @param {number} phase — offset in radians
 * @returns {number} — [-1, 1]
 */
export function organicSine(t, frequency = 1, phase = 0) {
  const base = Math.sin(t * frequency * Math.PI * 2 + phase);
  // Add a subtle second harmonic to break perfect symmetry
  const harmonic = Math.sin(t * frequency * Math.PI * 4 + phase * 1.3) * 0.08;
  return base + harmonic;
}

/**
 * Hesitation curve — starts, pauses slightly midway, then continues.
 * Core to the entity's behavioral language.
 * @param {number} t — [0, 1]
 * @returns {number}
 */
export function hesitationCurve(t) {
  if (t < 0.45) {
    return easeOut(t / 0.45) * 0.4;
  } else if (t < 0.55) {
    // The pause — almost no movement
    return 0.4 + (t - 0.45) * 0.02;
  } else {
    return 0.4 + smootherstep((t - 0.55) / 0.45) * 0.6;
  }
}

/**
 * Exponential decay — value fades toward zero. Natural falloff.
 * @param {number} value — current value
 * @param {number} target — target value
 * @param {number} lambda — decay constant (higher = faster)
 * @param {number} dt — delta time in seconds
 * @returns {number}
 */
export function expDecay(value, target, lambda, dt) {
  return target + (value - target) * Math.exp(-lambda * dt);
}

// ─── Noise ────────────────────────────────────────────────────────────────────

/**
 * Simple value noise — pseudo-random but smooth.
 * Used for adding life to animations without external libraries.
 *
 * @param {number} x
 * @returns {number} — [0, 1]
 */
export function valueNoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = smootherstep(f);

  // Pseudo-random hash
  const a = _hash(i);
  const b = _hash(i + 1);

  return lerp(a, b, u);
}

/**
 * 2D value noise.
 * @param {number} x
 * @param {number} y
 * @returns {number} — [0, 1]
 */
export function valueNoise2D(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smootherstep(x - ix);
  const fy = smootherstep(y - iy);

  const aa = _hash2(ix, iy);
  const ba = _hash2(ix + 1, iy);
  const ab = _hash2(ix, iy + 1);
  const bb = _hash2(ix + 1, iy + 1);

  return lerp(lerp(aa, ba, fx), lerp(ab, bb, fx), fy);
}

/** @private */
function _hash(n) {
  n = Math.sin(n * 127.1) * 43758.5453123;
  return n - Math.floor(n);
}

/** @private */
function _hash2(x, y) {
  return _hash(x + y * 57.0);
}
