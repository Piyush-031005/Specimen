import { EventBus } from '../utils/EventBus.js';
import { EVENTS } from '../constants.js';

export class HUDSystem {
    constructor() {
        this._levelEl = document.getElementById('hud-level');
        this._temperamentEl = document.getElementById('hud-temperament');
        
        EventBus.on('ORGANISM_EVOLVED', ({ level }) => {
            if (this._levelEl) {
                const labels = { 1: 'I', 2: 'II', 3: 'III' };
                this._levelEl.textContent = `MUTATION LEVEL: ${labels[level] || level}`;
            }
        });
        
        EventBus.on('BEHAVIOR_STATE_CHANGED', ({ state }) => {
            if (this._temperamentEl) {
                this._temperamentEl.textContent = `BEHAVIOR: ${state}`;
            }
        });
    }
}
