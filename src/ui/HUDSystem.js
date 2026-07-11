import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class HUDSystem {
    constructor() {
        this._hud = document.getElementById('specimen-hud');
        this._statusEl = document.getElementById('hud-status');
        this._coordsEl = document.getElementById('hud-coords');
        this._logEl = document.getElementById('hud-log');
        this._bioEl = document.getElementById('hud-bio');
        
        this._logs = [];
        this._isGrappling = false;
        
        if (!this._hud) return; // Prevent crash if HTML isn't updated yet
        
        this.addLog("SYSTEM INITIALIZED.");
        this.addLog("SUBJECT: SPECIMEN-01 AWAITING OBSERVATION.");
        
        EventBus.on(EVENTS.USER_INPUT, ({ x, y, type }) => {
            if (!this._hud) return;
            this._coordsEl.textContent = `POS: [${Math.floor(x)}, ${Math.floor(y)}]`;
            
            if (type === 'pointerdown' || type === 'keydown') {
                this._isGrappling = true;
                this._hud.classList.add('danger');
                this._statusEl.textContent = "CONTAINMENT BREACH";
                this.addLog("WARNING: PREDATORY RESPONSE TRIGGERED");
            } else if (type === 'pointerup' || type === 'keyup') {
                this._isGrappling = false;
                this._hud.classList.remove('danger');
                this._statusEl.textContent = "CONTAINMENT STABLE";
                this.addLog("SUBJECT REVERTED TO CALM STATE.");
            }
        });
        
        EventBus.on(EVENTS.BEHAVIOR_STATE_CHANGED, ({ state }) => {
            if (this._hud) this.addLog(`STATE SHIFT: ${state.toUpperCase()}`);
        });
        
        // Pulse the BPM on heartbeat
        EventBus.on(EVENTS.ENTITY_PULSE_EMITTED, () => {
            if (!this._hud) return;
            const bpm = this._isGrappling ? Math.floor(Math.random() * 40 + 140) : Math.floor(Math.random() * 10 + 60);
            this._bioEl.textContent = `HRT: ${bpm} BPM`;
            
            this._bioEl.style.opacity = '1';
            setTimeout(() => {
                if (this._bioEl) this._bioEl.style.opacity = '0.5';
            }, 200);
        });
    }
    
    addLog(msg) {
        const time = new Date().toISOString().substring(11, 23);
        this._logs.push(`[${time}] ${msg}`);
        if (this._logs.length > 6) this._logs.shift();
        
        if (this._logEl) {
            this._logEl.innerHTML = this._logs.map(l => `<div>${l}</div>`).join('');
        }
    }
}
