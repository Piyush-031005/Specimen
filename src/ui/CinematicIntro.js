/**
 * SPECIMEN — CinematicIntro.js
 *
 * Handles the initial narrative sequence before the canvas is revealed.
 * Now features an elegant, thin typographic style, a generative WebGL/Canvas background
 * drawing unimaginable organisms, and cinematic Web Audio API bass drops WITH Voiceover.
 */

export class CinematicIntro {
  constructor() {
    this._overlay = null;
    this._textContainer = null;
    this._canvas = null;
    this._ctx = null;
    this._audioCtx = null;
    this._animationFrameId = null;
  }

  /**
   * Starts the cinematic sequence.
   * @returns {Promise<void>} Resolves when the intro is complete and the canvas should be revealed.
   */
  async play() {
    return new Promise((resolve) => {
      this._buildDOM();

      const lines = [
        "In the darkest depths, survival demands sacrifice.",
        "Organisms consume one another...",
        "...tearing apart their own biology to merge.",
        "Flesh, machine, and mind twist together...",
        "...creating unimaginable hybrids of pure instinct.",
        "We have secured the Apex Specimen.",
        "And it is starving."
      ];

      let currentLine = 0;

      const showNextLine = () => {
        if (currentLine >= lines.length) {
          // Finish sequence
          this._textContainer.style.opacity = '0';
          if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
          
          setTimeout(() => {
            this._overlay.style.opacity = '0';
            setTimeout(() => {
              if (this._overlay.parentNode) {
                this._overlay.parentNode.removeChild(this._overlay);
              }
              resolve();
            }, 2000); // Wait for black screen to fade out
          }, 1000);
          return;
        }

        const text = lines[currentLine];

        // Set text and fade in
        this._textContainer.innerText = text;
        this._textContainer.style.opacity = '1';
        
        // Play Cinematic Bass Drop + Deep Voiceover
        this._playCinematicImpact(text);

        // Wait, then fade out
        setTimeout(() => {
          this._textContainer.style.opacity = '0';
          
          // Wait for fade out to complete before showing next line
          setTimeout(() => {
            currentLine++;
            showNextLine();
          }, 1500); // Time text stays hidden between lines
          
        }, 4000); // Time text stays visible (slightly longer for audio)
      };

      // Set up the "Click to start" screen to bypass audio autoplay policies
      this._textContainer.innerText = "[ CLICK TO INITIALIZE CONTAINMENT LOG ]";
      this._textContainer.style.opacity = '1';
      this._textContainer.style.cursor = 'pointer';
      
      const startSequence = () => {
        this._overlay.removeEventListener('click', startSequence);
        this._textContainer.style.cursor = 'default';
        this._textContainer.style.opacity = '0';
        
        // Initialize Web Audio API and Speech
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this._audioCtx = new AudioContext();
        window.speechSynthesis.getVoices();
        
        this._startBackgroundAnimation();
        
        setTimeout(showNextLine, 1500);
      };
      
      this._overlay.addEventListener('click', startSequence);
    });
  }

  _buildDOM() {
    // Create full screen black overlay
    this._overlay = document.createElement('div');
    this._overlay.id = 'cinematic-intro-overlay';
    Object.assign(this._overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#050505',
      zIndex: '9999', // Above HUD
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 2s ease-in-out',
      overflow: 'hidden'
    });

    // Create Generative Background Canvas
    this._canvas = document.createElement('canvas');
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
    Object.assign(this._canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      opacity: '1', 
      pointerEvents: 'none',
      mixBlendMode: 'screen'
    });
    this._ctx = this._canvas.getContext('2d');
    this._overlay.appendChild(this._canvas);

    // Create elegant text container
    this._textContainer = document.createElement('div');
    Object.assign(this._textContainer.style, {
      position: 'relative',
      color: '#ffffff',
      fontFamily: '"Cinzel", "Didot", "Optima", "Times New Roman", serif', // Elegant, thin font
      fontWeight: '300',
      fontSize: '42px',
      letterSpacing: '12px', // Wide, cinematic tracking
      textAlign: 'center',
      maxWidth: '1000px',
      padding: '40px',
      opacity: '0',
      transition: 'opacity 1.5s ease-in-out',
      textTransform: 'uppercase',
      textShadow: '0 0 15px rgba(255,255,255,0.2)' // Subtle, elegant glow
    });

    this._overlay.appendChild(this._textContainer);
    document.body.appendChild(this._overlay);
  }

  _startBackgroundAnimation() {
    let time = 0;
    const render = () => {
        time += 0.008;
        // Heavy fade effect for trails
        this._ctx.globalCompositeOperation = 'source-over';
        this._ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

        const cx = this._canvas.width / 2;
        const cy = this._canvas.height / 2;

        this._ctx.globalCompositeOperation = 'lighter';
        this._ctx.lineWidth = 1.5;
        
        // Draw 5 interwoven morphing organisms (Parametric Strange Attractors) - CRAZY RED/BLUE
        for (let j = 0; j < 5; j++) {
            this._ctx.beginPath();
            if (j % 2 === 0) this._ctx.strokeStyle = `rgba(255, ${20 + j * 10}, 50, 0.3)`;
            else this._ctx.strokeStyle = `rgba(20, ${100 + j * 20}, 255, 0.3)`;

            for (let i = 0; i < Math.PI * 2; i += 0.04) {
                // Complex parametric equations for organic shifting shapes
                const a = i * (4 + Math.sin(time * 0.8 + j));
                const b = i * (5 + Math.cos(time * 0.6 - j));
                
                const radius = 300 + Math.sin(a * 6 + time) * 200 + Math.cos(b * 4 - time) * 120;
                
                // Add a violent swirling vortex effect
                const swirlAngle = time * (j % 2 === 0 ? 0.4 : -0.4);
                
                const x = cx + Math.sin(a + swirlAngle) * radius * Math.cos(time * 0.15);
                const y = cy + Math.cos(b + swirlAngle) * radius * Math.sin(time * 0.2);
                
                if (i === 0) this._ctx.moveTo(x, y);
                else this._ctx.lineTo(x, y);
            }
            this._ctx.stroke();
        }

        this._animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  _playCinematicImpact(text) {
    // 1. Play Deep Voiceover
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const deepVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark')) || voices[0];
    if (deepVoice) msg.voice = deepVoice;
    msg.pitch = 0.1; // Extremely deep, Kratos-like
    msg.rate = 0.7; // Slow and deliberate
    msg.volume = 1.0;
    window.speechSynthesis.speak(msg);

    // 2. Play Web Audio Drums / Bass Drop
    if (!this._audioCtx) return;
    const time = this._audioCtx.currentTime;

    // Massive Sub Bass Drop (Sine wave dropping in frequency)
    const subOsc = this._audioCtx.createOscillator();
    const subGain = this._audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, time);
    subOsc.frequency.exponentialRampToValueAtTime(10, time + 3.0);
    
    subGain.gain.setValueAtTime(0, time);
    subGain.gain.linearRampToValueAtTime(1.0, time + 0.1);
    subGain.gain.exponentialRampToValueAtTime(0.01, time + 3.5);
    
    subOsc.connect(subGain);
    subGain.connect(this._audioCtx.destination);
    
    subOsc.start(time);
    subOsc.stop(time + 3.5);

    // Gritty Mid-Rumble (Sawtooth passing through a lowpass filter)
    const rumbleOsc = this._audioCtx.createOscillator();
    const rumbleGain = this._audioCtx.createGain();
    const filter = this._audioCtx.createBiquadFilter();
    
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(45, time);
    rumbleOsc.frequency.linearRampToValueAtTime(30, time + 2.0);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(20, time + 2.5);
    
    rumbleGain.gain.setValueAtTime(0, time);
    rumbleGain.gain.linearRampToValueAtTime(0.4, time + 0.05);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, time + 2.5);
    
    rumbleOsc.connect(filter);
    filter.connect(rumbleGain);
    rumbleGain.connect(this._audioCtx.destination);
    
    rumbleOsc.start(time);
    rumbleOsc.stop(time + 2.5);
  }
}
