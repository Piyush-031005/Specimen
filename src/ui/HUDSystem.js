import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class HUDSystem {
    constructor() {
        this._hud = document.getElementById('specimen-hud');
        this._statusEl = document.getElementById('hud-status');
        this._levelEl = document.getElementById('hud-level');
        this._logEl = document.getElementById('hud-log');
        
        if (!this._hud) return; 
        
        EventBus.on(EVENTS.USER_INPUT, ({ x, y, type }) => {
            if (!this._hud) return;
            
            if (type === 'pointerdown' || type === 'keydown') {
                this._hud.classList.add('danger');
                this._statusEl.textContent = "CONTAINMENT BREACH DETECTED";
            } else if (type === 'pointerup' || type === 'keyup') {
                this._hud.classList.remove('danger');
                this._statusEl.textContent = "CONTAINMENT PROTOCOLS ACTIVE";
            }
        });

        // Add dummy logging for aesthetic
        setInterval(() => {
            if (!this._logEl) return;
            const msgs = [
                "> ADJUSTING SYNAPSE GAIN...",
                "> TRACKING VITAL FLUCTUATIONS...",
                "> RE-CALIBRATING OPTICAL SENSORS...",
                "> SECTOR 4 ANOMALY DETECTED...",
                "> BIOMASS INTEGRATION NOMINAL..."
            ];
            const msg = msgs[Math.floor(Math.random() * msgs.length)];
            const div = document.createElement('div');
            div.textContent = msg;
            this._logEl.appendChild(div);
            if (this._logEl.children.length > 5) {
                this._logEl.removeChild(this._logEl.firstChild);
            }
        }, 3000);
        
        // EVOLUTION LOGIC
        EventBus.on('ORGANISM_EVOLVED', ({ level }) => {
            if (!this._hud) return;
            
            if (this._levelEl) {
                const labels = { 2: 'II', 3: 'III — APEX' };
                this._levelEl.textContent = `MUTATION LEVEL: ${labels[level] || level}`;
                this._levelEl.style.color = level === 2 ? '#ffb400' : '#ff2040';
                this._levelEl.style.textShadow = level === 3 ? '0 0 20px rgba(255,0,40,0.8)' : 'none';
            }
            
            this._hud.classList.add('danger');
            setTimeout(() => this._hud.classList.remove('danger'), 800);

            if (this._logEl) {
                const div = document.createElement('div');
                div.style.color = '#f00';
                div.textContent = `> CRITICAL: MUTATION STAGE ${level} REACHED`;
                this._logEl.appendChild(div);
            }
        });
        
        EventBus.on('ORGANISM_APEX_FEEDING', () => {
            if (!this._hud) return;
            this._hud.classList.add('danger');
            setTimeout(() => this._hud.classList.remove('danger'), 200);
        });
    }
}
