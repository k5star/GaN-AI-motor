import { bus } from '../core/EventBus.js';

export class NavBar {
    constructor(transport, recorder) {
        this._transport = transport;
        this._recorder  = recorder;
    }

    mount(container) {
        container.innerHTML = `
        <nav class="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-emerald-400">GaN Motor V2</span>
                <div id="nav-motor-badge"></div>
            </div>
            <div class="flex items-center gap-2">
                <button id="nav-rec" class="text-[11px] border border-slate-600 rounded px-2 py-0.5 text-slate-400 hover:border-red-500 hover:text-red-400">● REC</button>
                <button id="nav-ai-settings" class="text-[11px] border border-slate-600 rounded px-2 py-0.5 text-slate-400 hover:text-violet-400">⚙ AI</button>
                <button id="nav-connect" class="text-[11px] font-bold rounded px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white">🔌 連線</button>
            </div>
        </nav>`;

        // Motor ID badge placeholder — MotorIdBadge mounts here
        const badgeContainer = document.getElementById('nav-motor-badge');

        document.getElementById('nav-connect').onclick = () => {
            if (this._transport.isConnected) {
                bus.emit('ui:disconnectRequested', {});
            } else {
                this._showConnModal();
            }
        };

        document.getElementById('nav-rec').onclick = () => {
            if (this._recorder.isRecording) {
                this._recorder.stop();
                document.getElementById('nav-rec').classList.remove('text-red-400', 'border-red-500');
                document.getElementById('nav-rec').classList.add('text-slate-400');
                const blob = this._recorder.exportCSV();
                if (blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `motor-${Date.now()}.csv`; a.click(); }
            } else {
                this._recorder.start();
                document.getElementById('nav-rec').classList.add('text-red-400', 'border-red-500');
                document.getElementById('nav-rec').classList.remove('text-slate-400');
            }
        };

        document.getElementById('nav-ai-settings').onclick = () => bus.emit('ui:openAISettings', {});

        bus.on('transport:connected', () => {
            const btn = document.getElementById('nav-connect');
            if (btn) { btn.textContent = '🔌 斷線'; btn.className = 'text-[11px] font-bold rounded px-3 py-1 bg-red-700 hover:bg-red-600 text-white'; }
        });
        bus.on('transport:disconnected', () => {
            const btn = document.getElementById('nav-connect');
            if (btn) { btn.textContent = '🔌 連線'; btn.className = 'text-[11px] font-bold rounded px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white'; }
        });

        return badgeContainer; // caller can pass to MotorIdBadge
    }

    _showConnModal() {
        const modal = document.getElementById('conn-modal');
        if (modal) { modal.style.display = 'flex'; return; }
        // Inline fallback
        const hasSerial = !!navigator.serial;
        const hasBLE    = !!navigator.bluetooth;
        if (hasSerial && hasBLE) {
            const t = confirm('選擇連線方式：\nOK = Web Serial (USB)\nCancel = BLE') ? 'serial' : 'ble';
            bus.emit('ui:connectRequested', { type: t });
        } else if (hasSerial) {
            bus.emit('ui:connectRequested', { type: 'serial' });
        } else {
            bus.emit('ui:connectRequested', { type: 'ble' });
        }
    }
}
