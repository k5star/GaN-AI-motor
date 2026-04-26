import { bus } from '../core/EventBus.js';

const MODELS = [
    { value: 'qwen2.5:14b',            label: '★ AI 模型A（推薦，指令最準）' },
    { value: 'qwen2.5:7b',             label: 'AI 模型B（較快）' },
    { value: 'llama3.1:8b',            label: 'AI 模型C（Llama）' },
    { value: 'deepseek-r1:14b',        label: 'AI 模型D（DeepSeek）' },
];

export class AISettingsModal {
    constructor(aiConfig, trainingData) {
        this._config = aiConfig;
        this._data   = trainingData;
    }

    mount(container) {
        const modal = document.createElement('div');
        modal.id = 'ai-settings-modal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div class="bg-slate-800 border border-slate-600 rounded-xl p-5 w-80">
            <div class="text-sm font-bold text-slate-200 mb-3">🔑 AI API 設定</div>
            <label class="text-[11px] text-slate-400">Base URL</label>
            <input id="as-url"   type="text"     class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-2 mt-0.5">
            <label class="text-[11px] text-slate-400">API Key</label>
            <input id="as-key"   type="password" class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-2 mt-0.5">
            <label class="text-[11px] text-slate-400">Model</label>
            <select id="as-model" class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-3 mt-0.5">
                ${MODELS.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
            </select>
            <!-- Gist -->
            <div class="border-t border-slate-700 pt-2 mb-2">
                <label class="text-[11px] text-slate-400">GitHub Token (gist scope)</label>
                <input id="as-gist-token" type="password" class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-1 mt-0.5">
                <label class="text-[11px] text-slate-400">Gist ID（留空自動建立）</label>
                <input id="as-gist-id"    type="text"     class="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-2 mt-0.5" placeholder="留空">
                <div class="flex gap-1">
                    <button id="as-push" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] py-1 rounded">⬆ 上傳修正</button>
                    <button id="as-pull" class="flex-1 bg-green-900 hover:bg-green-800 text-green-300 text-[11px] py-1 rounded">⬇ 下載修正</button>
                </div>
            </div>
            <div class="flex gap-2">
                <button id="as-save"   class="flex-1 bg-violet-700 hover:bg-violet-600 text-white text-xs py-1.5 rounded font-bold">儲存</button>
                <button id="as-cancel" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs py-1.5 rounded">取消</button>
            </div>
        </div>`;
        container.appendChild(modal);

        bus.on('ui:openAISettings', () => this._open());
        document.getElementById('as-save').onclick   = () => this._save();
        document.getElementById('as-cancel').onclick = () => this._close();
        document.getElementById('as-push').onclick   = () => this._push();
        document.getElementById('as-pull').onclick   = () => this._pull();
    }

    _open() {
        document.getElementById('as-url').value   = this._config.baseUrl;
        document.getElementById('as-key').value   = this._config.apiKey;
        document.getElementById('as-model').value = this._config.model;
        document.getElementById('as-gist-token').value = localStorage.getItem('gistToken') || '';
        document.getElementById('as-gist-id').value    = localStorage.getItem('gistId')    || '';
        document.getElementById('ai-settings-modal').style.display = 'flex';
    }

    _close() { document.getElementById('ai-settings-modal').style.display = 'none'; }

    _save() {
        this._config.save({
            baseUrl: document.getElementById('as-url').value,
            apiKey:  document.getElementById('as-key').value,
            model:   document.getElementById('as-model').value,
        });
        const t = document.getElementById('as-gist-token').value.trim();
        const g = document.getElementById('as-gist-id').value.trim();
        if (t) localStorage.setItem('gistToken', t);
        if (g) localStorage.setItem('gistId',    g);
        bus.emit('ui:log', { type: 'SYS', msg: '✓ AI 設定已儲存', clr: 'text-violet-400' });
        this._close();
    }

    async _push() {
        try {
            const token = document.getElementById('as-gist-token').value.trim();
            const gid   = document.getElementById('as-gist-id').value.trim();
            await this._data.pushToGist(token, gid);
        } catch (e) {
            bus.emit('ui:log', { type: 'ERR', msg: `Gist 上傳失敗: ${e.message}`, clr: 'text-red-400' });
        }
    }

    async _pull() {
        try {
            const token = document.getElementById('as-gist-token').value.trim();
            const gid   = document.getElementById('as-gist-id').value.trim();
            await this._data.pullFromGist(token, gid);
        } catch (e) {
            bus.emit('ui:log', { type: 'ERR', msg: `Gist 下載失敗: ${e.message}`, clr: 'text-red-400' });
        }
    }
}
