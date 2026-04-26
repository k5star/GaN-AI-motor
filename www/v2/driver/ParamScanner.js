import { bus } from '../core/EventBus.js';
import { buildFC03 } from '../transport/ModbusRTU.js';
import { SLAVE_ID, SCAN_GROUPS } from '../core/Constants.js';

export class ParamScanner {
    constructor(transport) {
        this._transport = transport;
        this._lastResult = null;
        this._pending = null; // resolve callback for current FC03 response
    }

    get lastResult() { return this._lastResult; }

    async scanAll(options = {}) {
        const pauseMs = options.pauseBetweenGroups
            ?? (this._transport.connectionType === 'ble' ? 300 : 80);

        bus.emit('scanner:started', {});
        bus.emit('ui:log', { type: 'SYS', msg: `開始掃描 ${SCAN_GROUPS.length} 個群組...`, clr: 'text-violet-400' });

        const groups = {};
        const total  = SCAN_GROUPS.length;

        // Temporarily listen for FC03 responses
        const fc03Handler = ({ values }) => {
            if (this._pending) { this._pending(values); this._pending = null; }
        };
        bus.on('modbus:fc03', fc03Handler);

        try {
            for (let i = 0; i < SCAN_GROUPS.length; i++) {
                const grp = SCAN_GROUPS[i];
                bus.emit('scanner:progress', { done: i, total });

                const values = await this._readGroup(grp.startAddr, grp.qty, pauseMs);
                groups[grp.group] = { name: grp.name, startAddr: grp.startAddr, values };

                bus.emit('scanner:groupDone', { group: grp.group, name: grp.name, startAddr: grp.startAddr, values });
                bus.emit('ui:log', {
                    type: 'SYS',
                    msg: `掃描 ${grp.name} (0x${grp.startAddr.toString(16).toUpperCase()}) ✓`,
                    clr: 'text-slate-400',
                });

                if (i < SCAN_GROUPS.length - 1)
                    await new Promise(r => setTimeout(r, pauseMs));
            }
        } finally {
            bus.off('modbus:fc03', fc03Handler);
        }

        this._lastResult = { timestamp: Date.now(), groups };
        bus.emit('scanner:completed', { groups });
        bus.emit('scanner:progress', { done: total, total });
        bus.emit('ui:log', { type: 'SYS', msg: '參數掃描完成', clr: 'text-emerald-400' });
        return this._lastResult;
    }

    async _readGroup(startAddr, qty, timeoutMs = 500) {
        return new Promise((resolve) => {
            let timer = setTimeout(() => {
                this._pending = null;
                bus.emit('ui:log', {
                    type: 'WARN',
                    msg: `群組 0x${startAddr.toString(16).toUpperCase()} 讀取超時`,
                    clr: 'text-amber-400',
                });
                resolve(new Array(qty).fill(null)); // null = timeout
            }, timeoutMs);

            this._pending = (values) => {
                clearTimeout(timer);
                resolve(values);
            };

            const pkt = buildFC03(SLAVE_ID, startAddr, qty);
            this._transport.send(pkt).catch(() => {
                clearTimeout(timer);
                this._pending = null;
                resolve(new Array(qty).fill(null));
            });
        });
    }
}
