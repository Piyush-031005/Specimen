import { EventBus } from '../utils/EventBus.js';

export class HUDSystem {
    constructor() {
        this._levelEl = document.getElementById('hud-level');
        this._temperamentEl = document.getElementById('hud-temperament');
        
        EventBus.on('ORGANISM_EVOLVED', ({ level }) => {
            if (this._levelEl) {
                const labels = { 1: 'MINIMAL', 2: 'ADAPTING', 3: 'COMPLETE' };
                this._levelEl.textContent = `SHARED UNDERSTANDING: ${labels[level] || level}`;
            }
        });
        
        EventBus.on('BEHAVIOR_TRUST_UPDATED', ({ trust }) => {
            if (this._temperamentEl) {
                let trustStr = "LOW";
                if (trust > 80) trustStr = "COMPLETE";
                else if (trust > 50) trustStr = "STABLE";
                else if (trust > 20) trustStr = "LIMITED";
                this._temperamentEl.textContent = `TRUST: ${trustStr}`;
            }
        });
    }
}
