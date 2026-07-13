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
import { PlanktonSystem } from './entity/PlanktonSystem.js';
import { HUDSystem } from './ui/HUDSystem.js';
import { CinematicIntro } from './ui/CinematicIntro.js';

import { EntityHeartbeat } from './pattern/EntityHeartbeat.js';
import { DisplacementWave } from './pattern/DisplacementWave.js';

import { CommunicationWindow } from './pattern/CommunicationWindow.js';

import { BehaviorEngine } from './behavior/BehaviorEngine.js';

import { WorldEngine } from './world/WorldEngine.js';


import { AudioEngine } from './audio/AudioEngine.js';
import { MemorySystem } from './memory/MemorySystem.js';

import { CustomCursor } from './director/CustomCursor.js';
import { SignatureMoment } from './director/SignatureMoment.js';

import { EventBus } from './utils/EventBus.js';
import { EVENTS } from './constants.js';

// ─── DOM ──────────────────────────────────────────────────────────────────────
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('canvas'));

// ─── Instantiate Systems ──────────────────────────────────────────────────────
const memory        = new MemorySystem();
const coords        = new CoordinateSystem();
const renderer      = new Renderer(canvas);
const scheduler     = new AnimationScheduler();     // Self-wires to RENDER_TICK

const worldEngine   = new WorldEngine();
const heartbeat     = new EntityHeartbeat();
const displacementWave = new DisplacementWave(coords);   // eslint-disable-line no-unused-vars
const commWindow    = new CommunicationWindow(); // eslint-disable-line no-unused-vars
const behavior      = new BehaviorEngine(memory);
const audio         = new AudioEngine(memory);
const hud           = new HUDSystem(); // HUD Overlay for cinematic effect
const cinematicIntro = new CinematicIntro();
const entity        = new Entity(coords, scheduler, memory);
const plankton      = new PlanktonSystem(coords); // Added fluid background particles
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
window.addEventListener('pointerup', handleUserGesture, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleUserGesture(e);
  }
}, { passive: false });
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleUserGesture(e);
  }
}, { passive: false });

// ─── Custom Cursor ────────────────────────────────────────────────────────────
// Cursor is hidden globally via CSS (cursor:none on body).
// Entity tracks cursor for CURIOUS state lean (implemented in Entity.js).
// Signature moment (M8): entity briefly absorbs cursor — no pointer for ~3s.
window.lastCursorX = window.innerWidth / 2;
window.lastCursorY = window.innerHeight / 2;
window.sessionInteractions = 0;
EventBus.on(EVENTS.USER_INPUT, ({ x, y }) => {
    window.lastCursorX = x;
    window.lastCursorY = y;
    window.sessionInteractions++;
});

// ─── Startup Sequence ─────────────────────────────────────────────────────────

// 1. Load memory — affects initial behavior state
const sessionData = memory.load();

// 2. Renderer init (resize listener, canvas sizing)
renderer.init();

// The Climax (Containment Report)
let climaxTriggered = false;
EventBus.on('ORGANISM_EVOLVED', ({ level }) => {
    const body = document.body;
    const hud = document.getElementById('specimen-hud');
    
    // Color Timeline Shifts
    if (level === 2) {
        body.style.backgroundColor = '#001a24'; // Cyan tint
        if (hud) hud.style.color = 'rgba(0, 255, 255, 0.08)';
    } else if (level === 3) {
        body.style.backgroundColor = '#1a0500'; // Deep Orange tint
        if (hud) hud.style.color = 'rgba(255, 60, 0, 0.08)';
    }
    
    if (level === 3 && !climaxTriggered) {
        climaxTriggered = true;
        
        // Trigger report after 15 seconds of Level 3
        setTimeout(() => {
            const canvas = document.getElementById('canvas');
            
            canvas.style.transition = 'opacity 3s ease';
            canvas.style.opacity = '0';
            if (hud) hud.style.opacity = '0';
            
            setTimeout(() => {
                body.style.backgroundColor = '#000000'; // Blackout
                const report = document.getElementById('containment-report');
                report.classList.add('visible');
                
                const mem = memory.load();
                const interactions = window.sessionInteractions || 0;
                
                // Show "Observer ignored protocol" if they spammed clicks
                if (interactions > 30) {
                    const protocolEl = document.getElementById('rep-protocol');
                    if (protocolEl) protocolEl.style.display = 'block';
                }
                
                let trait = "OBSERVANT";
                if (interactions > 30) trait = "RAPID / ERRATIC";
                else if (interactions < 10) trait = "HESITATION";
                else trait = "CALCULATING";
                
                // Sequence 1: Archive Report
                setTimeout(() => { document.getElementById('rep-subj').classList.add('visible'); }, 1000);
                setTimeout(() => { document.getElementById('rep-id').classList.add('visible'); }, 2000);
                setTimeout(() => { 
                    const protocolEl = document.getElementById('rep-protocol');
                    if (protocolEl && protocolEl.style.display === 'block') protocolEl.classList.add('visible'); 
                }, 3000);
                setTimeout(() => { 
                    const tr = document.getElementById('rep-trait');
                    tr.textContent = `DOMINANT RESPONSE: ${trait}`;
                    tr.classList.add('visible'); 
                }, 4000);
                setTimeout(() => { 
                    const ti = document.getElementById('rep-time');
                    const timeAlive = Math.floor(performance.now() / 1000);
                    const m = Math.floor(timeAlive / 60).toString().padStart(2, '0');
                    const s = (timeAlive % 60).toString().padStart(2, '0');
                    ti.textContent = `OBSERVATION DURATION: ${m}:${s}`;
                    ti.classList.add('visible'); 
                }, 5000);
                setTimeout(() => { document.getElementById('rep-stability').classList.add('visible'); }, 6000);
                setTimeout(() => { document.getElementById('rep-class').classList.add('visible'); }, 7000);
                
                // Sequence 2: Comm Status
                setTimeout(() => {
                    document.getElementById('report-content-1').style.opacity = '0';
                    setTimeout(() => document.getElementById('report-content-1').style.display = 'none', 1000);
                    document.getElementById('report-content-2').style.display = 'block';
                    setTimeout(() => document.getElementById('rep-comm1').classList.add('visible'), 1500);
                    setTimeout(() => document.getElementById('rep-comm2').classList.add('visible'), 3000);
                    setTimeout(() => document.getElementById('rep-comm3').classList.add('visible'), 5000);
                }, 13000);
                
                // Sequence 3: Correction
                setTimeout(() => {
                    document.getElementById('report-content-2').style.opacity = '0';
                    setTimeout(() => document.getElementById('report-content-2').style.display = 'none', 1000);
                    document.getElementById('report-content-3').style.display = 'block';
                    setTimeout(() => document.getElementById('rep-corr1').classList.add('visible'), 2000);
                    setTimeout(() => document.getElementById('rep-corr2').classList.add('visible'), 5000);
                    setTimeout(() => document.getElementById('rep-corr3').classList.add('visible'), 8000);
                }, 23000);
                
                // Sequence 4: End
                setTimeout(() => {
                    document.getElementById('report-content-3').style.opacity = '0';
                    setTimeout(() => document.getElementById('report-content-3').style.display = 'none', 1000);
                    document.getElementById('report-content-4').style.display = 'block';
                    setTimeout(() => document.getElementById('rep-end1').classList.add('visible'), 1000);
                    setTimeout(() => document.getElementById('rep-end2').classList.add('visible'), 3000);
                    setTimeout(() => document.getElementById('rep-end3').classList.add('visible'), 7000);
                }, 35000);
                
                // Sequence 5: Blackout & Impossible Eye
                setTimeout(() => {
                    document.getElementById('report-content-4').style.opacity = '0';
                    setTimeout(() => document.getElementById('report-content-4').style.display = 'none', 1000);
                    
                    // Draw Impossible Eye exactly at last cursor position
                    const eyeCanvas = document.getElementById('impossible-eye');
                    if (eyeCanvas) {
                        eyeCanvas.width = window.innerWidth;
                        eyeCanvas.height = window.innerHeight;
                        eyeCanvas.style.opacity = '1';
                        
                        const ctx = eyeCanvas.getContext('2d');
                        ctx.strokeStyle = '#33ccff';
                        ctx.lineWidth = 1;
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = '#33ccff';
                        
                        // Use memory cursor, or fallback to center
                        const mx = (window.lastCursorX !== undefined) ? window.lastCursorX : window.innerWidth / 2;
                        const my = (window.lastCursorY !== undefined) ? window.lastCursorY : window.innerHeight / 2;
                        
                        // 4 fibers
                        ctx.beginPath(); ctx.moveTo(mx - 15, my - 20); ctx.lineTo(mx - 2, my + 20); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(mx + 15, my - 20); ctx.lineTo(mx + 2, my + 20); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(mx - 5, my - 22); ctx.lineTo(mx + 4, my + 18); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(mx + 5, my - 18); ctx.lineTo(mx - 4, my + 22); ctx.stroke();
                        
                        // Session Terminated text
                        setTimeout(() => {
                            ctx.font = '14px "IBM Plex Mono", monospace';
                            ctx.fillStyle = '#ff3333';
                            ctx.textAlign = 'center';
                            ctx.shadowBlur = 0;
                            ctx.fillText("Session terminated.", mx, my + 60);
                        }, 3000);
                    }
                }, 47000);
                
            }, 3000);
            
        }, 15000);
    }
});

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

// Hide HUD initially
const hudElement = document.getElementById('specimen-hud');
if (hudElement && !sessionStorage.getItem('specimen_intro_played')) {
  hudElement.style.opacity = '0';
  hudElement.style.transition = 'opacity 2s ease-in-out';
}

cinematicIntro.play().then(() => {
  if (hudElement) hudElement.style.opacity = '1';

  // Trigger Blast Sequence
  EventBus.emit(EVENTS.TRIGGER_BLAST_SEQUENCE);

  setTimeout(() => {
    // 6. Entity intro — fades in over 2.4s
    entity.init();

    // 7. Pulse generator starts
    heartbeat.start();

    // The Impossible Observation
    setTimeout(() => {
      EventBus.emit(EVENTS.ENTITY_PULSE_EMITTED, { timestamp: performance.now(), type: 'auto' });
    }, 3000);
  }, 2000); // 2 second blast shockwave delay
});

// 8. Removed HintLayer

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
