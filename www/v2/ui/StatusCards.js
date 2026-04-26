import { bus } from '../core/EventBus.js';
import { MONITOR_DATA_CONFIG, MOTOR_STATUS_MAP } from '../core/Constants.js';

export class StatusCards {
    constructor() { this._el = null; }

    mount(container) {
        this._el = document.createElement('div');
        this._el.className = 'grid grid-cols-4 gap-1';
        MONITOR_DATA_CONFIG.forEach(cfg => {
            const card = document.createElement('div');
            card.className = 'bg-slate-800 rounded p-1 text-center';
            card.innerHTML = `<div class="text-[9px] text-slate-500">${cfg.name}</div>
                <div id="sv-${cfg.id}" class="text-xs font-mono font-bold text-slate-200">—</div>
                <div class="text-[9px] text-slate-600">${cfg.unit}</div>`;
            this._el.appendChild(card);
        });
        container.appendChild(this._el);

        bus.on('motor:statusUpdated', ({ values }) => this._update(values));
    }

    _update(values) {
        MONITOR_DATA_CONFIG.forEach((cfg, i) => {
            const el = document.getElementById(`sv-${cfg.id}`);
            if (!el) return;
            const raw = values[i] ?? 0;
            if (cfg.id === 'D00') {
                const s = MOTOR_STATUS_MAP[raw] || { txt: raw, clr: 'text-slate-400' };
                el.textContent = s.txt;
                el.className = `text-xs font-mono font-bold ${s.clr}`;
            } else {
                el.textContent = (raw * cfg.scale).toFixed(cfg.scale < 1 ? 2 : 0);
            }
        });
    }
}
