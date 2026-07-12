/**
 * SPECIMEN — CinematicIntro.js
 *
 * Handles the initial narrative sequence before the canvas is revealed.
 * Sets the tone of biological horror and hybrid mutation based on the user's vision.
 */

export class CinematicIntro {
  constructor() {
    this._overlay = null;
    this._textContainer = null;
    this._hasPlayed = false;
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

      let currentLine = 0;

      const showNextLine = () => {
        if (currentLine >= lines.length) {
          // Finish sequence
          this._textContainer.style.opacity = '0';
          setTimeout(() => {
            this._overlay.style.opacity = '0';
            setTimeout(() => {
              if (this._overlay.parentNode) {
                this._overlay.parentNode.removeChild(this._overlay);
              }
              sessionStorage.setItem('specimen_intro_played', 'true');
              resolve();
            }, 2000); // Wait for black screen to fade out
          }, 1000);
          return;
        }

        // Set text and fade in
        this._textContainer.innerText = lines[currentLine];
        this._textContainer.style.opacity = '1';

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

      // Start the sequence after a brief initial pause
      setTimeout(showNextLine, 2000);
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

    // Create text container
    this._textContainer = document.createElement('div');
    Object.assign(this._textContainer.style, {
      color: '#f5f0e8',
      fontFamily: '"IBM Plex Mono", monospace', // Match HUD font for terminal vibe
      fontSize: '14px',
      letterSpacing: '3px',
      textAlign: 'center',
      maxWidth: '600px',
      padding: '20px',
      opacity: '0',
      transition: 'opacity 1.5s ease-in-out',
      textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
      textTransform: 'uppercase'
    });

    this._overlay.appendChild(this._textContainer);
    document.body.appendChild(this._overlay);
  }
}
