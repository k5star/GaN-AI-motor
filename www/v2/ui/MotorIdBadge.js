import { bus } from '../core/EventBus.js';

export class MotorIdBadge {
    constructor() { this._el = null; }

    mount(container) {
        this._el = document.createElement('div');
        this._el.id = 'motor-id-badge';
        this._el.className = 'flex items-center gap-2 px-2 py-1 bg-slate-800 rounded text-[11px]';
        this._el.innerHTML = `<span class="text-slate-500">型號</span>
            <span id="badge-model" class="text-slate-400 font-mono">—</span>
            <span id="badge-conf"  class="text-slate-600"></span>
            <span id="badge-warn" class="text-amber-400 hidden">⚠</span>`;
        container.appendChild(this._el);

        bus.on('identifier:detected', ({ modelId, profile, confidence, warnings }) => {
            document.getElementById('badge-model').textContent = profile?.name || modelId;
            const pct = (confidence * 100).toFixed(0);
            document.getElementById('badge-conf').textContent = confidence > 0 ? `${pct}%` : '';
            const warnEl = document.getElementById('badge-warn');
            if (warnings?.length > 0) {
                warnEl.classList.remove('hidden');
                warnEl.title = warnings.join('\n');
            } else {
                warnEl.classList.add('hidden');
            }
            this._el.className = `flex items-center gap-2 px-2 py-1 rounded text-[11px] ${
                confidence >= 0.8 ? 'bg-emerald-900/40' : confidence > 0 ? 'bg-amber-900/40' : 'bg-slate-800'
            }`;
        });

        bus.on('transport:disconnected', () => {
            document.getElementById('badge-model').textContent = '—';
            document.getElementById('badge-conf').textContent  = '';
            document.getElementById('badge-warn').classList.add('hidden');
            this._el.className = 'flex items-center gap-2 px-2 py-1 bg-slate-800 rounded text-[11px]';
        });
    }
}
