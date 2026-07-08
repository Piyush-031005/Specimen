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
import { ToleranceSystem } from './pattern/ToleranceSystem.js';
import { RhythmMatcher } from './pattern/RhythmMatcher.js';

import { BehaviorEngine } from './behavior/BehaviorEngine.js';

import { WorldEngine } from './world/WorldEngine.js';
import { ParticleManager } from './world/ParticleManager.js';

import { AudioEngine } from './audio/AudioEngine.js';
import { MemorySystem } from './memory/MemorySystem.js';
import { HintLayer } from './ui/HintLayer.js';

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
const particles     = new ParticleManager();
const worldEngine   = new WorldEngine();
const tolerance     = new ToleranceSystem();
const pulseGen      = new PulseGenerator();
const rhythmMatcher = new RhythmMatcher(tolerance); // eslint-disable-line no-unused-vars
const behavior      = new BehaviorEngine();
const audio         = new AudioEngine();
const entity        = new Entity(coords, scheduler);
const hint          = new HintLayer(hintEl);

// ─── Input Handler ────────────────────────────────────────────────────────────
/**
 * Single unified input handler.
 * Maps: click, spacebar, touch → USER_INPUT event.
 * Audio context is resumed on first gesture (browser policy).
 */
function handleUserGesture(event) {
  // Resume audio context on first interaction
  audio.resume();

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

/**
 * Audio init requires a user gesture — init on first interaction.
 */
let audioInitialized = false;
function handleFirstGesture(event) {
  if (!audioInitialized) {
    audioInitialized = true;
    audio.init();
  }
  handleUserGesture(event);
}

window.addEventListener('click', handleFirstGesture, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleFirstGesture(e);
  }
}, { passive: false });
window.addEventListener('touchstart', handleFirstGesture, { passive: true });

// ─── Custom Cursor ────────────────────────────────────────────────────────────
// Cursor is hidden globally in CSS. Draw it on canvas in Milestone 2.
// During signature moment (Milestone 8), canvas cursor is absorbed by entity.

// ─── Startup Sequence ─────────────────────────────────────────────────────────

// 1. Load memory — affects initial behavior state
const sessionData = memory.load();

// 2. Renderer init (resize listener, canvas sizing)
renderer.init();

// 3. Behavior engine starts FSM
behavior.init();

// 4. Persist memory when visitor leaves
window.addEventListener('beforeunload', () => {
  memory.updateTrust(behavior.trust);
  memory.updateStage(worldEngine.stage);
  memory.save();
});

// 5. Start render loop — produces black screen at 60fps
renderer.start();

// 6. Entity intro (currently stub — Milestone 2 will fade it in)
entity.init();

// 7. Pulse generator starts (first pulse after delay)
pulseGen.start();

// 8. Hint layer timer begins
hint.start();

// ─── Return visitor behavior ──────────────────────────────────────────────────
// If this is not the first visit, seed trust from memory.
// The entity will already be in a slightly warmer state.
if (memory.isReturnVisitor && sessionData.trust > 10) {
  EventBus.emit(EVENTS.BEHAVIOR_TRUST_UPDATED, {
    trust: Math.min(sessionData.trust * 0.6, 40), // Partial — must re-earn
  });
}
