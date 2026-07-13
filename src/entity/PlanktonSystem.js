import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';
import { randomFloat } from '../utils/MathUtils.js';

export class PlanktonSystem {
    constructor(coords) {
        this._coords = coords;
        this._particles = [];
        this._numParticles = 250;
        this._mouseX = window.innerWidth / 2;
        this._mouseY = window.innerHeight / 2;
        this._isGrappling = false;
        
        for (let i = 0; i < this._numParticles; i++) {
            this._particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: randomFloat(-0.5, 0.5),
                vy: randomFloat(-0.5, 0.5),
                size: randomFloat(0.5, 2.2),
                phase: randomFloat(0, Math.PI * 2),
                speed: randomFloat(0.5, 1.5)
            });
        }
        
        EventBus.on(EVENTS.USER_INPUT, ({ x, y, type }) => {
            this._mouseX = x;
            this._mouseY = y;
            if (type === 'pointerdown' || type === 'keydown') this._isGrappling = true;
            if (type === 'pointerup' || type === 'keyup') this._isGrappling = false;
        });
        
        EventBus.on(EVENTS.RENDER_TICK, ({ ctx, deltaSeconds }) => {
            this.update(deltaSeconds);
            this.render(ctx);
        });
    }
    
    update(deltaSeconds) {
        const time = performance.now() * 0.001;
        
        for (let i = 0; i < this._numParticles; i++) {
            const p = this._particles[i];
            
            // Base drift (fluid motion)
            p.vx += Math.cos(time * p.speed + p.phase) * 1.5 * deltaSeconds;
            p.vy += Math.sin(time * p.speed + p.phase) * 1.5 * deltaSeconds;
            
            // Cursor interaction
            const dx = p.x - this._mouseX;
            const dy = p.y - this._mouseY;
            const distSq = dx * dx + dy * dy;
            
            if (this._isGrappling) {
                // Sucked into the center (feeding frenzy)
                if (distSq > 100) {
                    const dist = Math.sqrt(distSq);
                    p.vx -= (dx / dist) * 20.0 * deltaSeconds;
                    p.vy -= (dy / dist) * 20.0 * deltaSeconds;
                }
            } else {
                // Gentle push away from cursor
                if (distSq < 30000) {
                    const dist = Math.sqrt(distSq);
                    p.vx += (dx / dist) * 5.0 * deltaSeconds;
                    p.vy += (dy / dist) * 5.0 * deltaSeconds;
                }
            }
            
            // Friction
            p.vx *= 0.96;
            p.vy *= 0.96;
            
            p.x += p.vx;
            p.y += p.vy;
            
            // Wrap around screen
            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;
        }
    }
    
    render(ctx) {
        ctx.save();
        const time = performance.now() * 0.001;
        
        if (this._isGrappling) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.6)'; // Blood Orange
        } else {
            ctx.fillStyle = 'rgba(0, 200, 255, 0.4)'; // Cyan
        }
        
        ctx.beginPath();
        for (let i = 0; i < this._numParticles; i++) {
            const p = this._particles[i];
            // Twinkle effect
            const alpha = 0.3 + Math.sin(time * 3.0 + p.phase) * 0.7;
            ctx.globalAlpha = Math.max(0, alpha);
            
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}
