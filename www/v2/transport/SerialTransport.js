import { bus } from '../core/EventBus.js';
import { RTUParser } from './ModbusRTU.js';
import { SLAVE_ID } from '../core/Constants.js';

export class SerialTransport {
    constructor() {
        this._port   = null;
        this._reader = null;
        this._keepReading = false;
        this._parser = new RTUParser(SLAVE_ID);
        this._setupParser();
    }

    _setupParser() {
        this._parser
            .onFC03Response(values => bus.emit('modbus:fc03', { values }))
            .onFC06Echo((addr, value) => bus.emit('modbus:fc06', { addr, value }))
            .onException((funcCode, exCode) => bus.emit('modbus:exception', { funcCode, exCode }))
            .onError(msg => bus.emit('ui:log', { type: 'ERR', msg, clr: 'text-red-400' }));
    }

    get isConnected() { return !!this._port; }

    async connect() {
        this._port = await navigator.serial.requestPort();
        await this._port.open({ baudRate: 115200 });
        await this._port.setSignals({ dataTerminalReady: true, requestToSend: true });
        this._keepReading = true;
        this._parser.reset();
        this._readLoop();
        bus.emit('transport:connected', { type: 'serial', deviceName: 'Serial Port' });
        bus.emit('ui:log', { type: 'SYS', msg: 'Serial 已連線 115200 8N1', clr: 'text-emerald-400' });
    }

    async disconnect() {
        this._keepReading = false;
        try { await this._reader?.cancel(); this._reader?.releaseLock(); } catch (_) {}
        try { await this._port?.close(); } catch (_) {}
        this._port = null;
        this._reader = null;
        bus.emit('transport:disconnected', { reason: 'user' });
        bus.emit('ui:log', { type: 'SYS', msg: 'Serial 已斷線', clr: 'text-amber-400' });
    }

    async send(buf) {
        if (!this._port?.writable) return;
        const w = this._port.writable.getWriter();
        try { await w.write(buf); } finally { w.releaseLock(); }
    }

    async _readLoop() {
        while (this._port && this._port.readable && this._keepReading) {
            try {
                this._reader = this._port.readable.getReader();
                while (true) {
                    const { value, done } = await this._reader.read();
                    if (done) break;
                    if (value) this._parser.feed(value);
                }
            } catch (e) {
                if (this._keepReading)
                    bus.emit('transport:error', { message: e.message });
            } finally {
                try { this._reader?.releaseLock(); } catch (_) {}
            }
        }
    }
}
