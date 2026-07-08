/**
 * SPECIMEN — AtmosphereSynth
 *
 * Generates the evolving ambient drone of the world using Web Audio.
 * Limited to 4 simultaneous oscillator layers to prioritize quality and performance.
 *
 * Stage progression:
 * - Stage 1 (Darkness): Near silence.
 * - Stage 2 (Pulse): Sub-bass fundamental (C2).
 * - Stage 3 (Geometry): Adds the perfect fifth (G2).
 * - Stage 4 (Light): Adds a higher octave harmonic (C3) with slow LFO shimmer.
 * - Stage 5 (Contact): Adds a major third (E3) creating a peaceful, resolved C Major resonance.
 */

import { WORLD_STAGES } from '../constants.js';

export class AtmosphereSynth {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode} destination
   */
  constructor(ctx, destination) {
    this._ctx = ctx;
    
    // Master gain for the atmosphere, allows global fading
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0; // Starts silent
    this._masterGain.connect(destination);

    // Fundamental: C2 (65.41 Hz)
    const baseFreq = 65.41;

    // Define the 4 harmonic layers (C Major chord spread across octaves)
    this._layers = [
      { freq: baseFreq, type: 'sine', targetGain: 0 },         // C2 (Sub)
      { freq: baseFreq * 1.5, type: 'sine', targetGain: 0 },   // G2 (Fifth)
      { freq: baseFreq * 2, type: 'triangle', targetGain: 0 }, // C3 (Octave)
      { freq: baseFreq * 2.5, type: 'sine', targetGain: 0 }    // E3 (Major Third - Peace/Resolution)
    ];

    this._oscillators = [];
    this._gains = [];
    this._started = false;
  }

  /**
   * Starts the continuous ambient oscillators.
   * Only called once the AudioContext is unlocked.
   */
  start() {
    if (this._started || this._ctx.state !== 'running') return;
    this._started = true;

    const t = this._ctx.currentTime;
    
    // Smooth fade in for the master bus
    this._masterGain.gain.setTargetAtTime(0.6, t, 2.0);

    // Initialize the 4 continuous layers
    for (let i = 0; i < 4; i++) {
      const def = this._layers[i];
      
      const osc = this._ctx.createOscillator();
      osc.type = def.type;
      osc.frequency.value = def.freq;
      
      const gain = this._ctx.createGain();
      gain.gain.value = 0; // Layers start muted

      // Layer 3 (Octave C3) gets a slow LFO for "gentle shimmer"
      if (i === 2) {
        const lfo = this._ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15; // Very slow shimmer (0.15 Hz)
        
        const lfoGain = this._ctx.createGain();
        lfoGain.gain.value = 0.05; // Depth of the shimmer
        
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start(t);
      }

      osc.connect(gain);
      gain.connect(this._masterGain);
      
      osc.start(t);
      
      this._oscillators.push(osc);
      this._gains.push(gain);
    }
  }

  /**
   * Update the atmosphere mix based on the world stage.
   * Uses smooth crossfading (exponentialRamp).
   * @param {number} stage - The current WORLD_STAGES value.
   */
  setStage(stage) {
    if (!this._started) return;

    const t = this._ctx.currentTime;
    const transitionTime = 4.0; // Slow, organic 4-second fade

    // Define target mix based on stage
    // Values are volume multipliers [0, 1] for the 4 layers
    let targetMix = [0, 0, 0, 0];

    switch (stage) {
      case WORLD_STAGES.DARKNESS:
        targetMix = [0, 0, 0, 0];
        break;
      case WORLD_STAGES.PULSE:
        targetMix = [0.3, 0, 0, 0]; // Sub bass emerges
        break;
      case WORLD_STAGES.GEOMETRY:
        targetMix = [0.4, 0.2, 0, 0]; // Fifth adds stability
        break;
      case WORLD_STAGES.LIGHT:
        targetMix = [0.4, 0.25, 0.15, 0]; // Octave adds shimmer
        break;
      case WORLD_STAGES.GLIMPSE:
        targetMix = [0.4, 0.3, 0.2, 0.2]; // Major third resolves into peaceful harmony
        break;
    }

    // Apply the mix gracefully
    for (let i = 0; i < 4; i++) {
      // AudioParams don't like ramping to exact 0 with exponentialRampToValueAtTime, use a tiny value
      const val = Math.max(0.001, targetMix[i]);
      this._gains[i].gain.setTargetAtTime(val, t, transitionTime / 3);
    }
  }

  /**
   * Drops high frequencies and reduces volume for the Signature Moment.
   */
  calm() {
    if (!this._started) return;
    const t = this._ctx.currentTime;
    const transitionTime = 1.0;

    // Sub stays (0.3), Fifth lowers (0.1), Octave drops to near zero, Third lowers (0.1)
    const calmMix = [0.3, 0.1, 0.001, 0.1];

    for (let i = 0; i < 4; i++) {
      this._gains[i].gain.setTargetAtTime(calmMix[i], t, transitionTime);
    }
  }
}
