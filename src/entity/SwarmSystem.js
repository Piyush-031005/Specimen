import { randomFloat } from '../utils/MathUtils.js';

const NUM_PARTICLES = 5000;
const MAX_SPEED = 20;
const MAX_FORCE = 1.5;

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = randomFloat(-5, 5);
        this.vy = randomFloat(-5, 5);
        this.ax = 0;
        this.ay = 0;
        this.targetX = x;
        this.targetY = y;
        this.mass = randomFloat(0.5, 2.0);
        this.color = `rgba(255, 255, 255, ${randomFloat(0.1, 0.8)})`;
    }
}

export class SwarmSystem {
    constructor() {
        this._particles = [];
        this._isActive = false;
        this._opacity = 0;
        this._isReforming = false;
        
        // Initialize particles off-screen or at center
        for (let i = 0; i < NUM_PARTICLES; i++) {
            this._particles.push(new Particle(window.innerWidth / 2, window.innerHeight / 2));
        }
    }

    shatter(centerX, centerY) {
        this._isActive = true;
        this._isReforming = false;
        
        // Explode outward from center
        for (let p of this._particles) {
            p.x = centerX + randomFloat(-50, 50);
            p.y = centerY + randomFloat(-50, 50);
            p.vx = randomFloat(-30, 30);
            p.vy = randomFloat(-30, 30);
        }
    }

    reform() {
        this._isReforming = true;
    }

    get isActive() { return this._isActive; }
    get isReforming() { return this._isReforming; }
    get opacity() { return this._opacity; }

    update(targetX, targetY) {
        if (!this._isActive) {
            this._opacity -= 0.05;
            if (this._opacity < 0) this._opacity = 0;
            return;
        }

        if (this._isReforming) {
            this._opacity -= 0.02;
            if (this._opacity <= 0) {
                this._opacity = 0;
                this._isActive = false;
            }
        } else {
            this._opacity += 0.05;
            if (this._opacity > 1) this._opacity = 1;
        }

        // Update physics
        for (let p of this._particles) {
            if (this._isReforming) {
                // Slam into center
                const dx = targetX - p.x;
                const dy = targetY - p.y;
                p.vx += dx * 0.05;
                p.vy += dy * 0.05;
                
                // Friction
                p.vx *= 0.8;
                p.vy *= 0.8;
            } else {
                // Swarm around target but keep some chaos
                const dx = targetX - p.x;
                const dy = targetY - p.y;
                const distSq = dx * dx + dy * dy;
                
                // Magnetic pull
                if (distSq > 100) {
                    p.ax = (dx / distSq) * 5000 / p.mass;
                    p.ay = (dy / distSq) * 5000 / p.mass;
                }
                
                // Chaos noise
                p.ax += randomFloat(-2, 2);
                p.ay += randomFloat(-2, 2);
                
                p.vx += p.ax;
                p.vy += p.ay;
                
                // Speed limit
                const speed = Math.hypot(p.vx, p.vy);
                if (speed > MAX_SPEED) {
                    p.vx = (p.vx / speed) * MAX_SPEED;
                    p.vy = (p.vy / speed) * MAX_SPEED;
                }
            }
            
            p.x += p.vx;
            p.y += p.vy;
            p.ax = 0;
            p.ay = 0;
        }
    }

    draw(ctx) {
        if (this._opacity <= 0) return;

        ctx.save();
        ctx.globalAlpha = this._opacity;
        
        ctx.beginPath();
        for (let p of this._particles) {
            // Tint particles depending on speed or state
            if (this._isReforming) {
                ctx.fillStyle = `rgba(0, 200, 255, ${randomFloat(0.5, 1.0)})`;
            } else {
                ctx.fillStyle = p.color;
            }
            ctx.rect(p.x, p.y, 1.5, 1.5);
        }
        ctx.fill();
        ctx.restore();
    }
    
    // UI Assimilation Mechanic
    assimilateDOM(text) {
        // Create a hidden canvas to measure and draw the text
        const tCanvas = document.createElement('canvas');
        tCanvas.width = window.innerWidth;
        tCanvas.height = 200; // Text area height
        const tCtx = tCanvas.getContext('2d');
        
        tCtx.fillStyle = '#ffffff';
        tCtx.font = '200 120px "Cinzel", serif'; // Match the UI
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillText(text, tCanvas.width / 2, 100);
        
        // Extract pixels
        const imgData = tCtx.getImageData(0, 0, tCanvas.width, tCanvas.height).data;
        const newParticles = [];
        
        // Sample every 4th pixel to avoid too many particles
        for (let y = 0; y < tCanvas.height; y += 4) {
            for (let x = 0; x < tCanvas.width; x += 4) {
                const alpha = imgData[(y * tCanvas.width + x) * 4 + 3];
                if (alpha > 128) {
                    const p = new Particle(x, y);
                    p.color = '#ff3333'; // UI particles are red
                    p.mass = randomFloat(0.1, 0.5); // Lighter mass so they get sucked in faster
                    newParticles.push(p);
                }
            }
        }
        
        // Add to swarm
        this._particles.push(...newParticles);
        this._isActive = true;
    }
}
