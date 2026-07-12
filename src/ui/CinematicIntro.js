/**
 * SPECIMEN — CinematicIntro.js
 *
 * Handles the initial narrative sequence before the canvas is revealed.
 * Sets the tone of biological horror and hybrid mutation based on the user's vision.
 * Includes TTS Voiceover and flashing anaglyph biological hybrid images.
 */

export class CinematicIntro {
  constructor() {
    this._overlay = null;
    this._textContainer = null;
    this._bgImage = null;
  }

  /**
   * Starts the cinematic sequence.
   * @returns {Promise<void>} Resolves when the intro is complete and the canvas should be revealed.
   */
  async play() {
    // Always play for hackathon presentation purposes
    
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

      // Match the generated images (hardcoded to the ones we copied)
      const images = [
        '/assets/lobster_hybrid_1783876754565.png',
        '/assets/dragonfly_hybrid_1783876735856.png',
        '/assets/spider_hybrid_1783876774985.png'
      ];

      let currentLine = 0;
      let currentImageIndex = 0;

      const speakText = (text) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const msg = new SpeechSynthesisUtterance(text);
        
        // Find a deep male voice if possible
        const voices = window.speechSynthesis.getVoices();
        const deepVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark')) || voices[0];
        if (deepVoice) msg.voice = deepVoice;
        
        msg.pitch = 0.1; // Extremely deep, Kratos-like
        msg.rate = 0.7; // Slow and deliberate
        msg.volume = 1.0;
        
        window.speechSynthesis.speak(msg);
      };

      const showNextLine = () => {
        if (currentLine >= lines.length) {
          // Finish sequence
          this._textContainer.style.opacity = '0';
          this._bgImage.style.opacity = '0';
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
        
        // Flash image for certain lines
        if (currentLine === 1 || currentLine === 3 || currentLine === 5) {
          this._bgImage.style.backgroundImage = `url(${images[currentImageIndex]})`;
          this._bgImage.style.opacity = '0.3'; // Subtle background flash
          currentImageIndex++;
        } else {
          this._bgImage.style.opacity = '0';
        }

        // Play Voiceover
        speakText(text);

        // Wait, then fade out
        setTimeout(() => {
          this._textContainer.style.opacity = '0';
          this._bgImage.style.opacity = '0';
          
          // Wait for fade out to complete before showing next line
          setTimeout(() => {
            currentLine++;
            showNextLine();
          }, 1500); // Time text stays hidden between lines
          
        }, 4000); // Time text stays visible (slightly longer for audio to finish)
      };

      // Set up the "Click to start" screen to bypass audio autoplay policies
      this._textContainer.innerText = "[ CLICK TO INITIALIZE CONTAINMENT LOG ]";
      this._textContainer.style.opacity = '1';
      this._textContainer.style.cursor = 'pointer';
      
      const startSequence = () => {
        this._overlay.removeEventListener('click', startSequence);
        this._textContainer.style.cursor = 'default';
        this._textContainer.style.opacity = '0';
        
        // Initialize speech synthesis voices (sometimes they need a nudge on first click)
        window.speechSynthesis.getVoices();
        
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
      backgroundColor: '#000000',
      zIndex: '9999', // Above HUD
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 2s ease-in-out',
    });

    // Create background image container for flashes
    this._bgImage = document.createElement('div');
    Object.assign(this._bgImage.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: '0',
      transition: 'opacity 0.2s ease-out', // Fast flash
      mixBlendMode: 'screen',
      filter: 'contrast(1.5) grayscale(0.5)' // Gritty biological look
    });
    this._overlay.appendChild(this._bgImage);

    // Create text container
    this._textContainer = document.createElement('div');
    Object.assign(this._textContainer.style, {
      position: 'relative',
      color: '#ffffff',
      fontFamily: '"Impact", "Arial Black", sans-serif', // Huge AAA game font
      fontSize: '48px',
      letterSpacing: '2px',
      textAlign: 'center',
      maxWidth: '800px',
      padding: '40px',
      opacity: '0',
      transition: 'opacity 1.5s ease-in-out',
      textTransform: 'uppercase',
      // Deep AAA game shadow and anaglyph text offset
      textShadow: '3px 0px 0px rgba(255, 0, 0, 0.8), -3px 0px 0px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0,0,0,1)'
    });

    this._overlay.appendChild(this._textContainer);
    document.body.appendChild(this._overlay);
  }
}
