import { bus } from '../core/EventBus.js';
import { buildFC03, buildFC06 } from '../transport/ModbusRTU.js';
import { SLAVE_ID, REG, BIT, MONITOR_DATA_CONFIG } from '../core/Constants.js';

export class MotorDriver {
    constructor(transport) {
        this._transport  = transport;
        this._pollTimer  = null;
        this._pollMs     = 100;
        this._netIoState = 0;
        this._currentDir = 'CW';
        this._profile    = null;

        // Wire Modbus FC03 response to motor status update
        bus.on('modbus:fc03', ({ values }) => {
            bus.emit('motor:statusUpdated', { values });
        });
    }

    get currentDir() { return this._currentDir; }
    get pollingActive() { return !!this._pollTimer; }

    loadProfile(profile) {
        this._profile = profile;
        bus.emit('ui:log', { type: 'SYS', msg: `已載入設定檔: ${profile?.name || '未知'}`, clr: 'text-blue-400' });
    }

    startPolling(intervalMs) {
        if (this._pollTimer) return;
        this._pollMs = intervalMs ?? (this._transport.connectionType === 'ble' ? 500 : 100);
        const pkt = buildFC03(SLAVE_ID, 0x0000, MONITOR_DATA_CONFIG.length);
        this._pollTimer = setInterval(() => this._transport.send(pkt), this._pollMs);
        bus.emit('ui:log', { type: 'SYS', msg: `輪詢啟動 ${this._pollMs}ms`, clr: 'text-slate-400' });
    }

    stopPolling() {
        if (!this._pollTimer) return;
        clearInterval(this._pollTimer);
        this._pollTimer = null;
    }

    async writeRegister(addr, value) {
        const pkt = buildFC06(SLAVE_ID, addr, value);
        await this._transport.send(pkt);
        bus.emit('ui:log', {
            type: 'CMD',
            msg: `FC06 0x${addr.toString(16).toUpperCase().padStart(4,'0')}h = ${value}`,
            clr: 'text-slate-400',
        });
    }

    async _writeNetIO(mask, set) {
        if (set) this._netIoState |= mask;
        else     this._netIoState &= ~mask;
        await this.writeRegister(REG.NET_IO, this._netIoState);
    }

    async setSpeed(rpm) {
        const clamped = Math.max(0, Math.min(3000, Math.round(rpm)));
        await this.writeRegister(REG.SPD_RAM0, clamped);
        bus.emit('ui:log', { type: 'CMD', msg: `轉速 → ${clamped} RPM`, clr: 'text-emerald-400' });
    }

    async setDir(dir) {
        this._currentDir = dir;
        await this._writeNetIO(BIT.CCW_CW, dir === 'CCW');
        bus.emit('ui:log', { type: 'CMD', msg: `方向 → ${dir}`, clr: 'text-blue-400' });
    }

    async setAcc(ms) {
        await this.writeRegister(REG.ACC_RAM0, Math.round(ms));
        bus.emit('ui:log', { type: 'CMD', msg: `加速 → ${ms}ms`, clr: 'text-slate-400' });
    }

    async setDec(ms) {
        await this.writeRegister(REG.DEC_RAM0, Math.round(ms));
        bus.emit('ui:log', { type: 'CMD', msg: `減速 → ${ms}ms`, clr: 'text-slate-400' });
    }

    async run(rpm, dir) {
        if (dir) await this.setDir(dir);
        if (rpm !== undefined) await this.setSpeed(rpm);
        await new Promise(r => setTimeout(r, 150)); // required timing
        await this._writeNetIO(BIT.START_STOP, true);
        bus.emit('ui:log', { type: 'CMD', msg: '▶ RUN', clr: 'text-emerald-400' });
    }

    async stop() {
        await this._writeNetIO(BIT.START_STOP, false);
        bus.emit('ui:log', { type: 'CMD', msg: '⏹ STOP', clr: 'text-red-400' });
    }

    async alarmReset() {
        await this._writeNetIO(BIT.ALM_RST, true);
        await new Promise(r => setTimeout(r, 200));
        await this._writeNetIO(BIT.ALM_RST, false);
        bus.emit('ui:log', { type: 'CMD', msg: '⚠ ALM RST', clr: 'text-amber-400' });
    }
}
