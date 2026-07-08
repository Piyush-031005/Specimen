/**
 * SPECIMEN — AudioEngine
 *
 * Procedural audio. No files. No music. Everything generated.
 *
 * Audio Rule: Silence first. Let silence establish the room.
 * First sound plays after TIMING.AUDIO_SILENCE_BEFORE_FIRST_PULSE_MS.
 *
 * ⚠️  Stub: Full implementation in Milestone 7 (Audio Engine).
 */

import { EventBus } from '../utils/EventBus.js';
import { EVENTS, TIMING } from '../constants.js';

export class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;

    /** @type {GainNode|null} Master gain */
    this._masterGain = null;

    /** @type {boolean} */
    this._initialized = false;

    /** @type {boolean} Ready to play (silence period has passed) */
    this._silenceComplete = false;

    this._setupListeners();
  }

  /**
   * Initialize the AudioContext.
   * Must be called from a user gesture (click/keypress) due to browser policy.
   */
  init() {
    if (this._initialized) return;

    this._ctx = new AudioContext();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.setValueAtTime(0.7, this._ctx.currentTime);
    this._masterGain.connect(this._ctx.destination);

    this._initialized = true;

    // Enforce silence before first sound
    setTimeout(() => {
      this._silenceComplete = true;
    }, TIMING.AUDIO_SILENCE_BEFORE_FIRST_PULSE_MS);
  }

  /**
   * Resume AudioContext if it was suspended (browser autoplay policy).
   */
  async resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      await this._ctx.resume();
    }
  }

  /** @private */
  _setupListeners() {
    EventBus.on(EVENTS.AUDIO_PULSE_TRIGGER, () => {
      if (!this._silenceComplete) return;
      this._playPulse();
    });

    EventBus.on(EVENTS.AUDIO_MATCH_TRIGGER, () => {
      if (!this._silenceComplete) return;
      this._playMatch();
    });

    EventBus.on(EVENTS.AUDIO_OBSERVING_START, () => {
      this._fadeToSilence();
    });

    EventBus.on(EVENTS.AUDIO_OBSERVING_END, () => {
      this._fadeIn();
    });
  }

  /** @private — Milestone 7 */
  _playPulse() {}

  /** @private — Milestone 7 */
  _playMatch() {}

  /** @private — Milestone 7 */
  _fadeToSilence() {}

  /** @private — Milestone 7 */
  _fadeIn() {}
}
