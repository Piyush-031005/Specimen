/**
 * SPECIMEN — CinematicIntro.js
 *
 * Handles the initial narrative sequence before the canvas is revealed.
 * Features a Lime Green CRT terminal boot sequence.
 */

export class CinematicIntro {
  constructor() {
    this._overlay = null;
    this._textContainer = null;
    this._audioCtx = null;
  }

  /**
   * Starts the cinematic sequence.
   * @returns {Promise<void>} Resolves when the intro is complete and the canvas should be revealed.
   */
  async play() {
    return new Promise((resolve) => {
      this._buildDOM();

      const lines = [
        "████████████████████\n\nCONTAINMENT FACILITY\nSITE–07\nNEURAL COMMUNICATION DIVISION\nSTATUS\nONLINE\n\n████████████████████",
        "Loading Experiment...",
        "SITE–07\nCommunication Archive\n\nAttempt 417\nNO RESPONSE\n\nAttempt 418\nSIGNAL LOST\n\nAttempt 419\nOBSERVER UNRESPONSIVE",
        "Attempt 892\n\nSearching..."
      ];

      // Set up the "Click to start" screen to bypass audio autoplay policies
      this._textContainer.innerText = "Communication requires silence.\nAvoid rapid movement.\n\n[ INITIATE CONNECTION ]";
      this._textContainer.style.opacity = '1';
      this._textContainer.style.cursor = 'pointer';
      this._textContainer.style.textAlign = 'center';
      
      const startSequence = () => {
        this._overlay.removeEventListener('click', startSequence);
        this._textContainer.style.cursor = 'default';
        this._textContainer.style.opacity = '0';
        
        // Initialize Web Audio API
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this._audioCtx = new AudioContext();
        
        setTimeout(() => this._playTerminalSequence(lines, resolve), 1000);
      };
      
      this._overlay.addEventListener('click', startSequence);
    });
  }

  _playTerminalSequence(lines, resolve) {
    let currentLine = 0;

    const showNextLine = () => {
      this._textContainer.style.textAlign = 'left';
      if (currentLine >= lines.length) {
        // We reached "Searching..."
        // Pause 8 seconds, then "Observer Found."
        setTimeout(() => {
           this._textContainer.innerText = "Attempt 892\n\nSearching...\n\nObserver Found.";
           this._playBeep(800, 'square');
           
           setTimeout(() => {
              this._textContainer.style.opacity = '0';
              setTimeout(() => {
                this._overlay.style.opacity = '0';
                setTimeout(() => {
                  if (this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
                  resolve();
                }, 2000);
              }, 1000);
           }, 3000);
        }, 8000);
        return;
      }

      const text = lines[currentLine];
      this._textContainer.innerText = text;
      this._textContainer.style.opacity = '1';
      this._playBeep(400 + Math.random() * 200, 'sawtooth');

      // Wait, then fade out/switch
      setTimeout(() => {
        this._textContainer.style.opacity = '0';
        setTimeout(() => {
          currentLine++;
          showNextLine();
        }, 500); // short gap between screens
      }, 3000);
    };
    
    showNextLine();
  }

  _buildDOM() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'cinematic-intro-overlay';
    Object.assign(this._overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#051005', // Very dark green/black
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 2s ease-in-out',
      overflow: 'hidden'
    });
    
    // Add CRT scanlines to overlay
    const scanlines = document.createElement('div');
    Object.assign(scanlines.style, {
      position: 'absolute',
      top: '0', left: '0', width: '100%', height: '100%',
      background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
      backgroundSize: '100% 4px, 6px 100%',
      pointerEvents: 'none'
    });
    this._overlay.appendChild(scanlines);

    this._textContainer = document.createElement('div');
    Object.assign(this._textContainer.style, {
      position: 'relative',
      color: '#33ff33', // Lime green
      fontFamily: '"IBM Plex Mono", "Courier New", monospace',
      fontWeight: 'bold',
      fontSize: '18px',
      letterSpacing: '2px',
      textAlign: 'left',
      whiteSpace: 'pre-line',
      maxWidth: '600px',
      padding: '40px',
      opacity: '0',
      transition: 'opacity 0.2s', // Quick CRT flicker fade
      textShadow: '0 0 10px rgba(51, 255, 51, 0.8)'
    });

    this._overlay.appendChild(this._textContainer);
    document.body.appendChild(this._overlay);
  }

  _playBeep(freq, type) {
    if (!this._audioCtx) return;
    const osc = this._audioCtx.createOscillator();
    const gain = this._audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this._audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.05, this._audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this._audioCtx.destination);
    
    osc.start();
    osc.stop(this._audioCtx.currentTime + 0.1);
  }
}
