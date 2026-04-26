import { bus } from '../core/EventBus.js';

const LS_FAILED = 'ai_failedCases';
const LS_CORR   = 'ai_corrDataset';
const LS_GIST_TOKEN = 'gistToken';
const LS_GIST_ID    = 'gistId';

export class TrainingData {
    constructor() {
        this._failed = JSON.parse(localStorage.getItem(LS_FAILED) || '[]');
        this._corr   = JSON.parse(localStorage.getItem(LS_CORR)   || '[]');
    }

    get failedCount()     { return this._failed.length; }
    get correctionCount() { return this._corr.length; }

    recordFailed(userInput, rawCmd, errors) {
        this._failed.push({ ts: Date.now(), input: userInput, raw: rawCmd, errors });
        try { localStorage.setItem(LS_FAILED, JSON.stringify(this._failed)); } catch (_) {}
    }

    exportFailed() {
        const lines = this._failed.map(r => JSON.stringify(r));
        return new Blob([lines.join('\n')], { type: 'application/jsonl' });
    }

    clearFailed() { this._failed = []; localStorage.removeItem(LS_FAILED); }

    addCorrection(entry) {
        this._corr.push({ ts: Date.now(), ...entry });
        try { localStorage.setItem(LS_CORR, JSON.stringify(this._corr)); } catch (_) {}
    }

    exportCorrections(systemPrompt) {
        const lines = this._corr.map(c => {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: c.userInput },
                { role: 'assistant', content: JSON.stringify(c.corrected) },
            ];
            return JSON.stringify({ messages });
        });
        return new Blob([lines.join('\n')], { type: 'application/jsonl' });
    }

    clearCorrections() { this._corr = []; localStorage.removeItem(LS_CORR); }

    async pushToGist(token, gistId) {
        const t = token || localStorage.getItem(LS_GIST_TOKEN) || '';
        if (!t) throw new Error('未設定 GitHub Token');

        const content = JSON.stringify({ failed: this._failed, corrections: this._corr }, null, 2);
        const body = { description: 'GaN Motor AI Corrections', public: false, files: { 'corrections.json': { content } } };

        let id = gistId || localStorage.getItem(LS_GIST_ID) || '';
        let url = id ? `https://api.github.com/gists/${id}` : 'https://api.github.com/gists';
        let method = id ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method, headers: { Authorization: `token ${t}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Gist API ${res.status}`);
        const json = await res.json();
        id = json.id;
        localStorage.setItem(LS_GIST_ID, id);
        localStorage.setItem(LS_GIST_TOKEN, t);
        bus.emit('ui:log', { type: 'SYS', msg: `已上傳 Gist (${id})`, clr: 'text-emerald-400' });
        return id;
    }

    async pullFromGist(token, gistId) {
        const t  = token  || localStorage.getItem(LS_GIST_TOKEN) || '';
        const id = gistId || localStorage.getItem(LS_GIST_ID)    || '';
        if (!t || !id) throw new Error('未設定 Token 或 Gist ID');

        const res = await fetch(`https://api.github.com/gists/${id}`, {
            headers: { Authorization: `token ${t}` },
        });
        if (!res.ok) throw new Error(`Gist API ${res.status}`);
        const json = await res.json();
        const raw  = json.files?.['corrections.json']?.content;
        if (!raw) throw new Error('Gist 無 corrections.json');

        const data = JSON.parse(raw);
        if (Array.isArray(data.corrections)) {
            this._corr = data.corrections;
            localStorage.setItem(LS_CORR, JSON.stringify(this._corr));
        }
        bus.emit('ui:log', { type: 'SYS', msg: `已下載修正資料 (${this._corr.length} 筆)`, clr: 'text-emerald-400' });
    }
}
