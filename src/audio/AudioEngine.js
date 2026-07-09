/**
 * SPECIMEN — AudioEngine
 *
 * Orchestrates the synthesized audio experience.
 *
 * Rules:
 * - STRICT UNLOCK: AudioContext must ONLY unlock on the first deliberate click/tap.
 * - Subscribes to FSM and World Engine events to modulate the audio organically.
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';
import { PulseSynth } from './PulseSynth.js';
import { AtmosphereSynth } from './AtmosphereSynth.js';

export class AudioEngine {
  constructor() {
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Master compressor to prevent clipping
    this._compressor = this._ctx.createDynamicsCompressor();
    this._compressor.connect(this._ctx.destination);
    
    // Synths
    this._pulseSynth = new PulseSynth(this._ctx, this._compressor);
    this._atmosphereSynth = new AtmosphereSynth(this._ctx, this._compressor);

    this._unlocked = false;
    this._currentTrust = 0;

    // We must listen for interaction to unlock audio
    this._unlockHandler = this._unlock.bind(this);
  }

  /**
   * Bind event listeners for the engine and the document for unlocking.
   */
  init() {
    document.addEventListener('pointerdown', this._unlockHandler, { once: true });
    
    EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state, trust }) => {
      this._currentTrust = trust;
      this._pulseSynth.updateParameters(state, trust);
    });

    EventBus.on(EVENTS.WORLD_STAGE_CHANGED, ({ stage }) => {
      this._currentWorldStage = stage;
      this._atmosphereSynth.setStage(stage);
    });

    EventBus.on(EVENTS.AUDIO_PULSE_TRIGGER, () => {
      this._pulseSynth.play(false);
    });

    EventBus.on(EVENTS.AUDIO_MATCH_TRIGGER, () => {
      this._pulseSynth.play(true);
    });
    
    // In Observing state, silence the audio
    EventBus.on(EVENTS.AUDIO_OBSERVING_START, () => {
      // The atmosphere crossfades to silence
      this._atmosphereSynth.setStage(0); 
    });
    
    EventBus.on(EVENTS.AUDIO_OBSERVING_END, () => {
      // Audio will naturally resume when the world stage gets broadcasted next, 
      // or we can let the behavior engine trigger the state update.
    });

    // Signature Moment (M8)
    EventBus.on(EVENTS.SIGNATURE_MOMENT_START, () => {
      this._atmosphereSynth.calm();
    });

    EventBus.on(EVENTS.SIGNATURE_MOMENT_END, () => {
      this._atmosphereSynth.setStage(4); // Restore Stage 5 mix (GLIMPSE = 4)
    });

    // Vigilance Moment
    EventBus.on('VIGILANCE_START', () => {
      this._atmosphereSynth.vigilanceStart();
    });

    EventBus.on('VIGILANCE_END', () => {
      // Need to restore based on the current world stage. We don't track it locally, 
      // but we can ask the synth to re-apply it if we just save the last stage.
      // Wait, AtmosphereSynth.vigilanceEnd needs the stage.
      // Let's track _currentWorldStage in AudioEngine.
      this._atmosphereSynth.vigilanceEnd(this._currentWorldStage || 0);
    });
  }

  /**
   * Unlocks the AudioContext. Only fires once on deliberate pointerdown.
   * @private
   */
  _unlock() {
    if (this._unlocked) return;
    
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().then(() => {
        this._unlocked = true;
        this._atmosphereSynth.start();
        console.log('AudioContext unlocked.');
      });
    } else {
      this._unlocked = true;
      this._atmosphereSynth.start();
    }
  }
}
