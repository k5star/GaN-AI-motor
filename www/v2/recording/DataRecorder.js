import { bus } from '../core/EventBus.js';
import { MONITOR_DATA_CONFIG } from '../core/Constants.js';

const VALID_STATUS = new Set([0, 2, 3, 4, 5, 6, 7, 8]);

export class DataRecorder {
    constructor() {
        this._recording = false;
        this._rows = [];
    }

    get isRecording() { return this._recording; }
    get rowCount()    { return this._rows.length; }

    start() {
        this._rows = [];
        this._recording = true;
        bus.emit('recorder:started', {});
        bus.emit('ui:log', { type: 'SYS', msg: '● REC 開始', clr: 'text-red-400' });
    }

    stop() {
        this._recording = false;
        bus.emit('recorder:stopped', { rowCount: this._rows.length });
        bus.emit('ui:log', { type: 'SYS', msg: `■ REC 停止 (${this._rows.length} 筆)`, clr: 'text-slate-400' });
    }

    addRow(values) {
        if (!this._recording) return;
        if (!VALID_STATUS.has(values[0])) return;
        const now = new Date();
        const row = { time: now.toLocaleTimeString(), timestamp: now.getTime() };
        MONITOR_DATA_CONFIG.forEach((cfg, i) => {
            row[cfg.id] = ((values[i] ?? 0) * cfg.scale).toFixed(cfg.scale < 1 ? 2 : 0);
        });
        this._rows.push(row);
        bus.emit('recorder:rowAdded', { row, count: this._rows.length });
    }

    exportCSV() {
        if (this._rows.length === 0) return null;
        const headers = ['time', 'timestamp', ...MONITOR_DATA_CONFIG.map(c => c.id)];
        const lines = [headers.join(',')];
        for (const row of this._rows) {
            lines.push(headers.map(h => row[h] ?? '').join(','));
        }
        return new Blob([lines.join('\n')], { type: 'text/csv' });
    }
}
