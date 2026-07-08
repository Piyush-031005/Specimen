/**
 * SPECIMEN — PulseSynth
 *
 * Generates the entity's heartbeat/pulse sound using the Web Audio API.
 * Synthesized in real-time. No samples.
 *
 * Behavior:
 * - Organic sine wave with a soft envelope.
 * - Success adds a harmonic overtone bloom.
 * - Hesitation detunes the frequency slightly.
 * - High trust aligns the pitch perfectly to the atmosphere.
 */

import { BEHAVIOR_STATES } from '../constants.js';

export class PulseSynth {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode} destination
   */
  constructor(ctx, destination) {
    this._ctx = ctx;
    this._destination = destination;

    // Base fundamental frequency (C2)
    this._baseFreq = 65.41;
    this._currentTrust = 0;
    this._behaviorState = BEHAVIOR_STATES.CALM;
  }

  /**
   * Update internal parameters based on behavior and trust.
   */
  updateParameters(state, trust) {
    this._behaviorState = state;
    this._currentTrust = trust;
  }

  /**
   * Play the pulse sound.
   * @param {boolean} isSuccess - Did the user successfully match this pulse?
   */
  play(isSuccess) {
    if (this._ctx.state !== 'running') return;

    const t = this._ctx.currentTime;
    
    // Calculate frequency based on state and trust
    // Trust drives synchronization: low trust allows detuning, high trust forces perfect pitch
    let freq = this._baseFreq;
    let detune = 0;

    if (this._behaviorState === BEHAVIOR_STATES.HESITANT || this._behaviorState === BEHAVIOR_STATES.DEFENSIVE) {
      // Detune more when trust is low
      const detuneFactor = Math.max(0, 1 - (this._currentTrust / 100));
      detune = (Math.random() - 0.5) * 30 * detuneFactor; // Up to 15 cents off
    }

    // Main oscillator (Sub/Body)
    const osc = this._ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const gain = this._ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this._destination);

    // Envelope
    const attack = 0.1;
    const decay = this._behaviorState === BEHAVIOR_STATES.DEFENSIVE ? 0.3 : 0.8;
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    osc.start(t);
    osc.stop(t + attack + decay);

    // Harmonic overtone bloom on success
    if (isSuccess) {
      this._playOvertone(t, freq, detune);
    }
  }

  /**
   * Plays a harmonic overtone that blooms softly.
   * @private
   */
  _playOvertone(t, baseFreq, baseDetune) {
    const osc = this._ctx.createOscillator();
    // Warm, round shape
    osc.type = 'triangle';
    // Perfect fifth above octave (Harmonic series)
    osc.frequency.value = baseFreq * 3; 
    osc.detune.value = baseDetune;

    const filter = this._ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // Bloom effect: filter opens up then closes
    filter.frequency.setValueAtTime(baseFreq * 3, t);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 8, t + 0.3);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 3, t + 1.2);

    const gain = this._ctx.createGain();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._destination);

    const attack = 0.4;
    const decay = 1.5;

    gain.gain.setValueAtTime(0, t);
    // Subtle volume
    gain.gain.linearRampToValueAtTime(0.15, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    osc.start(t);
    osc.stop(t + attack + decay);
  }
}
