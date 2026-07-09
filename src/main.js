/**
 * SPECIMEN — main.js
 *
 * The conductor. Wires every engine together.
 * Nothing is drawn here. No logic lives here.
 * Only: instantiate → wire → init → start.
 *
 * Startup sequence (order matters):
 *   1. Load memory (affects initial behavior state)
 *   2. Initialize coordinate system
 *   3. Initialize all engines (no side effects yet)
 *   4. Wire input handler
 *   5. Init behavior engine (FSM starts running)
 *   6. Start renderer (loop begins — black screen, 60fps)
 *   7. Start pulse generator (after FIRST_PULSE_DELAY_MS)
 *   8. Start hint layer timer
 *   9. Persist memory on unload
 */

import { Renderer } from './engine/Renderer.js';
import { CoordinateSystem } from './engine/CoordinateSystem.js';
import { AnimationScheduler } from './engine/AnimationScheduler.js';

import { Entity } from './entity/Entity.js';

import { PulseGenerator } from './pattern/PulseGenerator.js';
import { PulseRenderer } from './pattern/PulseRenderer.js';
import { ToleranceSystem } from './pattern/ToleranceSystem.js';
import { RhythmMatcher } from './pattern/RhythmMatcher.js';

import { BehaviorEngine } from './behavior/BehaviorEngine.js';

import { WorldEngine } from './world/WorldEngine.js';
import { ParticleManager } from './world/ParticleManager.js';

import { AudioEngine } from './audio/AudioEngine.js';
import { MemorySystem } from './memory/MemorySystem.js';
import { HintLayer } from './ui/HintLayer.js';
import { CustomCursor } from './ui/CustomCursor.js';
import { SignatureMoment } from './ui/SignatureMoment.js';

import { EventBus } from './utils/EventBus.js';
import { EVENTS } from './constants.js';

// ─── DOM ──────────────────────────────────────────────────────────────────────
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('canvas'));
const hintEl = /** @type {HTMLElement} */ (document.getElementById('hint-layer'));

// ─── Instantiate Systems ──────────────────────────────────────────────────────
const memory        = new MemorySystem();
const coords        = new CoordinateSystem();
const renderer      = new Renderer(canvas);
const scheduler     = new AnimationScheduler();     // Self-wires to RENDER_TICK
const particles     = new ParticleManager(memory);  // eslint-disable-line no-unused-vars
const worldEngine   = new WorldEngine();
const tolerance     = new ToleranceSystem();
const pulseGen      = new PulseGenerator();
const pulseRenderer = new PulseRenderer(coords);   // eslint-disable-line no-unused-vars
const rhythmMatcher = new RhythmMatcher(tolerance); // eslint-disable-line no-unused-vars
const behavior      = new BehaviorEngine(memory);
const audio         = new AudioEngine();
const entity        = new Entity(coords, scheduler);
const hint          = new HintLayer(hintEl);
const customCursor  = new CustomCursor(coords);
const signatureMoment = new SignatureMoment(customCursor, coords, memory);

EventBus.on(EVENTS.RENDER_TICK, (tickData) => {
  customCursor.update(tickData.deltaSeconds);
  customCursor.render(tickData.ctx);
});

// ─── Accessibility ────────────────────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // If user prefers reduced motion, disable particles entirely
  EventBus.emit(EVENTS.PERF_QUALITY_CHANGED, { quality: 'reduced' });
  // We also set hard limit in ParticleManager manually in next step
}

// ─── Input Handler ────────────────────────────────────────────────────────────
/**
 * Single unified input handler.
 * Maps: click, spacebar, touch → USER_INPUT event.
 */
function handleUserGesture(event) {
  // Normalize event position
  let x = 0;
  let y = 0;

  if (event instanceof MouseEvent) {
    x = event.clientX;
    y = event.clientY;
  } else if (event instanceof TouchEvent && event.touches.length > 0) {
    x = event.touches[0].clientX;
    y = event.touches[0].clientY;
  }

  EventBus.emit(EVENTS.USER_INPUT, {
    x,
    y,
    timestamp: performance.now(),
    type: event.type,
  });
}

window.addEventListener('pointerdown', handleUserGesture, { passive: true });
window.addEventListener('pointermove', handleUserGesture, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleUserGesture(e);
  }
}, { passive: false });

// ─── Custom Cursor ────────────────────────────────────────────────────────────
// Cursor is hidden globally via CSS (cursor:none on body).
// Entity tracks cursor for CURIOUS state lean (implemented in Entity.js).
// Signature moment (M8): entity briefly absorbs cursor — no pointer for ~3s.

// ─── Startup Sequence ─────────────────────────────────────────────────────────

// 1. Load memory — affects initial behavior state
const sessionData = memory.load();

// 2. Renderer init (resize listener, canvas sizing)
renderer.init();

// 3. Behavior engine starts FSM
behavior.init();

// 4. World engine init (broadcasts starting stage)
worldEngine.init();

// 5. Audio engine init (attaches strict pointerdown unlock listener)
audio.init();

// 5. Persist memory when visitor leaves
window.addEventListener('beforeunload', () => {
  memory.updateTrust(behavior.trust);
  memory.updateStage(worldEngine.stage);
  memory.save();
});

// 6. Start render loop — produces black screen at 60fps
renderer.start();

// 6. Entity intro — fades in over 2.4s (smootherstep) after 600ms silence
entity.init();

// 7. Pulse generator starts (first pulse after TIMING.FIRST_PULSE_DELAY_MS)
pulseGen.start();

// 8. Hint layer timer begins (shows '...' after 12s idle)
hint.start();

// 9. Wire response time recording to MemorySystem
// MemorySystem records visitor's rhythm fingerprint for return visits
EventBus.on(EVENTS.USER_PULSE_RESPONSE, ({ responseTimeMs, success }) => {
  memory.recordInteraction(success, responseTimeMs);
});

// Update the organism's permanent temperament based on interaction style
EventBus.on(EVENTS.USER_INTERACTION_STYLE, ({ delta }) => {
  memory.updateTemperament(delta);
});

// Track interaction time and spatial bias
let lastInputTime = performance.now();
let currentNx = 0.5;
let currentNy = 0.5;
let cursorStillTime = 0;

EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
  const now = performance.now();
  const dt = (now - lastInputTime) / 1000;
  
  if (dt < 2.0) { // Only count genuine continuous interaction, not huge gaps
    memory.addInteractionTime(dt);
  }
  lastInputTime = now;

  // Track spatial bias (normalize coordinates 0-1)
  currentNx = x / window.innerWidth;
  currentNy = y / window.innerHeight;
  cursorStillTime = 0; // Reset stillness because they moved
});

// Accumulate history purely based on lingering
EventBus.on(EVENTS.RENDER_TICK, ({ deltaSeconds }) => {
  cursorStillTime += deltaSeconds;
  // If the visitor is perfectly still for more than 1 second, they are lingering.
  // We accumulate historical tension in this specific conceptual space.
  if (cursorStillTime > 1.0) {
    // Diffuse slowly. It takes ~200 seconds of total lingering in a spot to max out its tension.
    memory.diffuseHistory(currentNx, currentNy, deltaSeconds * 0.005);
  }
});

// ─── Return visitor behavior ──────────────────────────────────────────────────
// If this is not the first visit, seed trust from memory.
// The entity will already be in a slightly warmer state, calculated via real-time decay.
if (memory.isReturnVisitor && sessionData.trust > 0) {
  const retainedTrust = memory.calculateReturningTrust();
  if (retainedTrust > 5) {
    EventBus.emit(EVENTS.BEHAVIOR_TRUST_UPDATED, {
      trust: retainedTrust, 
    });
  }
}
