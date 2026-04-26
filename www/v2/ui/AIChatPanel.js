import { bus } from '../core/EventBus.js';

export class AIChatPanel {
    constructor(aiService, executor) {
        this._ai = aiService;
        this._executor = executor;
    }

    mount(container) {
        container.innerHTML = `
        <div class="bg-slate-800 rounded-lg flex flex-col gap-2 p-3 h-full">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-violet-400">AI 控制</span>
                <div class="flex gap-1">
                    <span id="ai-status" class="text-[10px] text-slate-500">待機</span>
                    <button id="ai-abort" class="hidden text-[10px] text-red-400 hover:text-red-300 border border-red-800 rounded px-1">中止</button>
                </div>
            </div>
            <!-- Chat history -->
            <div id="ai-history" class="flex-1 overflow-y-auto space-y-1 text-xs min-h-0 max-h-64"></div>
            <!-- Input -->
            <div class="flex gap-1">
                <input id="ai-input" type="text" placeholder="輸入指令…"
                    class="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-violet-500 outline-none">
                <button id="ai-send" class="bg-violet-700 hover:bg-violet-600 text-white text-xs px-3 py-1 rounded">送出</button>
            </div>
        </div>`;

        const input   = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send');
        const abort   = document.getElementById('ai-abort');

        sendBtn.onclick = () => this._send();
        input.onkeydown = e => { if (e.key === 'Enter') this._send(); };
        abort.onclick   = () => { this._executor.abort(); };

        bus.on('ai:executing', () => {
            document.getElementById('ai-status').textContent = '執行中…';
            abort.classList.remove('hidden');
        });
        bus.on('ai:sequenceCompleted', () => this._resetStatus());
        bus.on('ai:sequenceAborted',   () => this._resetStatus());
        bus.on('ai:responseReceived',  ({ parsed }) => {
            if (parsed?.reply) this._appendMsg('assistant', parsed.reply);
        });
    }

    _resetStatus() {
        document.getElementById('ai-status').textContent = '待機';
        document.getElementById('ai-abort').classList.add('hidden');
    }

    async _send() {
        const input = document.getElementById('ai-input');
        const text  = input.value.trim();
        if (!text) return;
        input.value = '';
        this._appendMsg('user', text);
        document.getElementById('ai-status').textContent = '思考中…';
        try {
            await this._ai.send(text);
        } catch (e) {
            this._appendMsg('error', `AI 錯誤: ${e.message}`);
            this._resetStatus();
        }
    }

    _appendMsg(role, text) {
        const history = document.getElementById('ai-history');
        if (!history) return;
        const div = document.createElement('div');
        const isUser  = role === 'user';
        const isError = role === 'error';
        div.className = `rounded p-1.5 text-[11px] ${
            isUser  ? 'bg-slate-700 text-slate-200 self-end' :
            isError ? 'bg-red-900/40 text-red-300' :
                      'bg-violet-900/40 text-violet-200'
        }`;
        div.textContent = (isUser ? '你：' : isError ? '⚠ ' : 'AI：') + text;
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }
}
