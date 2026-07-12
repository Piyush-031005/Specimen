import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class HUDSystem {
    constructor() {
        this._hud = document.getElementById('specimen-hud');
        this._statusEl = document.getElementById('hud-status');
        this._coordsEl = document.getElementById('hud-coords');
        this._logEl = document.getElementById('hud-log');
        this._bioEl = document.getElementById('hud-bio');
        
        // Hide verbose UI elements — keep it minimal
        if (this._logEl) this._logEl.style.display = 'none';
        if (this._coordsEl) this._coordsEl.style.display = 'none';
        if (this._bioEl) this._bioEl.style.display = 'none';
        
        if (!this._hud) return; 
        
        // Add Mutation Level UI in the top-right
        const topR = document.querySelector('.hud-top-right');
        if (topR) {
            this._mutEl = document.createElement('div');
            this._mutEl.id = 'hud-mut';
            this._mutEl.textContent = 'MUTATION LEVEL: I';
            this._mutEl.style.color = '#00ffff';
            this._mutEl.style.fontWeight = 'bold';
            this._mutEl.style.marginTop = '10px';
            this._mutEl.style.fontSize = '0.85rem';
            this._mutEl.style.letterSpacing = '2px';
            topR.appendChild(this._mutEl);
        }
        
        EventBus.on(EVENTS.USER_INPUT, ({ x, y, type }) => {
            if (!this._hud) return;
            
            if (type === 'pointerdown' || type === 'keydown') {
                this._hud.classList.add('danger');
                this._statusEl.textContent = "CONTAINMENT BREACH";
            } else if (type === 'pointerup' || type === 'keyup') {
                this._hud.classList.remove('danger');
                this._statusEl.textContent = "CONTAINMENT STABLE";
            }
        });
        
        // EVOLUTION LOGIC
        EventBus.on('ORGANISM_EVOLVED', ({ level }) => {
            if (!this._hud) return;
            
            if (this._mutEl) {
                const labels = { 2: 'II', 3: 'III — APEX' };
                this._mutEl.textContent = `MUTATION LEVEL: ${labels[level] || level}`;
                this._mutEl.style.color = level === 2 ? '#ffb400' : '#ff2040';
                this._mutEl.style.textShadow = level === 3 ? '0 0 20px rgba(255,0,40,0.8)' : 'none';
            }
            
            this._hud.classList.add('danger');
            setTimeout(() => this._hud.classList.remove('danger'), 500);
        });
        
        EventBus.on('ORGANISM_APEX_FEEDING', () => {
            if (!this._hud) return;
            this._hud.classList.add('danger');
            setTimeout(() => this._hud.classList.remove('danger'), 200);
        });
    }
}
