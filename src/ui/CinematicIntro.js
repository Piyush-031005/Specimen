/**
 * SPECIMEN — CinematicIntro.js
 *
 * Handles the initial narrative sequence before the canvas is revealed.
 * Now features an elegant, thin typographic style, a generative WebGL/Canvas background,
 * and cinematic Web Audio API bass drops instead of TTS.
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
        
        // Play Cinematic Bass Drop
        this._playCinematicImpact();

        // Wait, then fade out
        setTimeout(() => {
          this._textContainer.style.opacity = '0';
          
          // Wait for fade out to complete before showing next line
          setTimeout(() => {
            currentLine++;
            showNextLine();
          }, 1500); // Time text stays hidden between lines
          
        }, 3500); // Time text stays visible
      };

      // Set up the "Click to start" screen to bypass audio autoplay policies
      this._textContainer.innerText = "[ CLICK TO INITIALIZE CONTAINMENT LOG ]";
      this._textContainer.style.opacity = '1';
      this._textContainer.style.cursor = 'pointer';
      
      const startSequence = () => {
        this._overlay.removeEventListener('click', startSequence);
        this._textContainer.style.cursor = 'default';
        this._textContainer.style.opacity = '0';
        
        // Initialize Web Audio API
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this._audioCtx = new AudioContext();
        
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
      opacity: '0.4', // Keep it subtle
      pointerEvents: 'none'
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
    const nodes = [];
    const numNodes = 60;
    
    for (let i = 0; i < numNodes; i++) {
        nodes.push({
            x: Math.random() * this._canvas.width,
            y: Math.random() * this._canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1
        });
    }

    let time = 0;
    const render = () => {
        time += 0.01;
        this._ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

        this._ctx.lineWidth = 0.5;
        
        // Update and draw nodes
        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            // Wrap around edges
            if (node.x < 0) node.x = this._canvas.width;
            if (node.x > this._canvas.width) node.x = 0;
            if (node.y < 0) node.y = this._canvas.height;
            if (node.y > this._canvas.height) node.y = 0;

            this._ctx.beginPath();
            this._ctx.fillStyle = `rgba(255, 50, 50, ${Math.sin(time + node.x) * 0.5 + 0.5})`;
            this._ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            this._ctx.fill();
        });

        // Draw circuit-like connections (only orthogonal/diagonal lines)
        for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    this._ctx.beginPath();
                    this._ctx.strokeStyle = `rgba(200, 200, 255, ${0.15 * (1 - dist / 150)})`;
                    this._ctx.moveTo(nodes[i].x, nodes[i].y);
                    
                    // Draw circuit-like right angles
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this._ctx.lineTo(nodes[j].x, nodes[i].y);
                    } else {
                        this._ctx.lineTo(nodes[i].x, nodes[j].y);
                    }
                    
                    this._ctx.lineTo(nodes[j].x, nodes[j].y);
                    this._ctx.stroke();
                }
            }
        }

        this._animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  _playCinematicImpact() {
    if (!this._audioCtx) return;

    const time = this._audioCtx.currentTime;

    // 1. Massive Sub Bass Drop (Sine wave dropping in frequency)
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

    // 2. Gritty Mid-Rumble (Sawtooth passing through a lowpass filter)
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
