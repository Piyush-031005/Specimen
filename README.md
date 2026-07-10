# SPECIMEN

*An encounter with an unknown presence. Reality emerges through communication.*

**SPECIMEN** is an interactive digital organism living in the void of the browser. It is not a tool, a game, or a website. It is a presence. It listens, breathes, hesitates, and remembers. 

Most digital experiences treat the user as a master. SPECIMEN treats the user as an unknown entity. When you arrive, it does not greet you; it observes you. Trust is not assumed; it must be earned through patience, stillness, and careful interaction.

## The Experience

* **The Void:** A microscopically noisy space governed by physical laws of tension, inertia, and certainty.
* **The Living Organism:** A complex entity with its own heartbeat, hesitation, and spatial memory. It reacts to your cursor, but it does not obey it.
* **The Memory:** SPECIMEN remembers how you treated it. If you leave and return, it retains the emotional scar or warmth of your previous encounter.
* **Zero UI:** No buttons. No menus. No text. The interface is purely atmospheric and behavioral.

## Technical Execution

SPECIMEN was built with an uncompromising commitment to performance and purity. 

* **Vanilla JavaScript & Canvas 2D:** No frameworks. No WebGL. No Three.js. 
* **Zero-Allocation Render Loop:** The engine maintains a strict contract: absolutely zero memory allocations (`new`, array mutations) occur during the render loop. The memory footprint stays perfectly flat, ensuring rock-solid 60+ FPS without garbage collection stutter.
* **Custom Physics & Behavior Engine:** A bespoke Finite State Machine (FSM) drives the organism's emotions, paired with a custom World Engine that independently evaluates environmental tension based on cursor velocity and stillness.
* **Procedural Audio:** All sound is generated natively in the browser via the Web Audio API. No heavy audio files are downloaded. The atmosphere is synthesized in real-time.
* **Tiny Footprint:** The entire production bundle is less than 17kB (gzipped).

## For the Judges

SPECIMEN is designed to be felt. We highly recommend using headphones, expanding the browser to full screen, and moving your cursor deliberately. 

Give it time to breathe.

## Development

```bash
# Install dependencies
npm install

# Start local server
npm run dev

# Build for production
npm run build
```

## Credits

Designed and engineered for the void.
