import { bus } from '../core/EventBus.js';

const MAX_LOGS = 200;

export class LogPanel {
    constructor() { this._el = null; this._count = 0; }

    mount(container) {
        const wrap = document.createElement('div');
        wrap.className = 'bg-slate-900 rounded border border-slate-700 flex flex-col';
        wrap.style.height = '160px';
        wrap.innerHTML = `
            <div class="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                <span class="text-[10px] font-bold text-slate-400">通訊日誌</span>
                <button id="log-clear" class="text-[10px] text-slate-500 hover:text-white">清除</button>
            </div>
            <div id="log-body" class="flex-1 overflow-y-auto font-mono text-[10px] px-2 py-1 space-y-0.5"></div>`;
        container.appendChild(wrap);

        document.getElementById('log-clear').onclick = () => {
            document.getElementById('log-body').innerHTML = '';
            this._count = 0;
        };

        bus.on('ui:log', ({ type, msg, clr }) => this._append(type, msg, clr));
    }

    _append(type, msg, clr = 'text-slate-400') {
        const body = document.getElementById('log-body');
        if (!body) return;
        const children = body.children;
        if (children.length >= MAX_LOGS) children[0].remove();
        const line = document.createElement('div');
        line.className = `flex gap-1 ${clr}`;
        line.innerHTML = `<span class="text-slate-600 select-none">${new Date().toLocaleTimeString()}</span>
            <span class="text-slate-500 select-none">[${type}]</span>
            <span>${msg}</span>`;
        body.appendChild(line);
        body.scrollTop = body.scrollHeight;
    }
}
