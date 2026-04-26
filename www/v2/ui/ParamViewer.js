import { bus } from '../core/EventBus.js';
import { SCAN_GROUPS } from '../core/Constants.js';

export class ParamViewer {
    constructor() { this._el = null; }

    mount(container) {
        const wrap = document.createElement('div');
        wrap.className = 'bg-slate-800 rounded-lg p-2';
        wrap.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-300">參數掃描結果</span>
                <span id="pv-status" class="text-[10px] text-slate-500">等待連線…</span>
            </div>
            <div id="pv-progress" class="w-full bg-slate-700 rounded h-1 mb-2 hidden">
                <div id="pv-bar" class="bg-violet-500 h-1 rounded transition-all" style="width:0%"></div>
            </div>
            <div id="pv-groups" class="space-y-1 max-h-48 overflow-y-auto text-[10px]"></div>`;
        container.appendChild(wrap);

        bus.on('scanner:started', () => {
            document.getElementById('pv-status').textContent = '掃描中…';
            document.getElementById('pv-progress').classList.remove('hidden');
            document.getElementById('pv-groups').innerHTML = '';
        });

        bus.on('scanner:progress', ({ done, total }) => {
            const pct = total > 0 ? (done / total * 100).toFixed(0) : 0;
            document.getElementById('pv-bar').style.width = `${pct}%`;
        });

        bus.on('scanner:groupDone', ({ group, name, startAddr, values }) => {
            const div = document.createElement('div');
            div.className = 'bg-slate-700 rounded p-1';
            const addrHex = `0x${startAddr.toString(16).toUpperCase().padStart(4,'0')}`;
            const vals = values.map((v, i) => {
                const a = `0x${(startAddr + i).toString(16).toUpperCase().padStart(4,'0')}`;
                const display = v === null ? '<span class="text-amber-500">timeout</span>' : `<span class="text-slate-300">${v}</span>`;
                return `<span class="text-slate-500">${a}:</span>${display}`;
            }).join(' ');
            div.innerHTML = `<div class="text-violet-400 font-bold mb-0.5">${name} (${addrHex})</div>
                <div class="flex flex-wrap gap-x-3 gap-y-0.5">${vals}</div>`;
            document.getElementById('pv-groups').appendChild(div);
        });

        bus.on('scanner:completed', () => {
            document.getElementById('pv-status').textContent = '掃描完成';
            document.getElementById('pv-progress').classList.add('hidden');
        });

        bus.on('transport:disconnected', () => {
            document.getElementById('pv-status').textContent = '等待連線…';
            document.getElementById('pv-groups').innerHTML = '';
        });
    }
}
