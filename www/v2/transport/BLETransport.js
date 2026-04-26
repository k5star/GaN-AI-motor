import { bus } from '../core/EventBus.js';
import { RTUParser } from './ModbusRTU.js';
import { SLAVE_ID } from '../core/Constants.js';

const HM10_SERVICE = '0000ffe0-0000-1000-8000-00805f9b34fb';
const HM10_CHAR    = '0000ffe1-0000-1000-8000-00805f9b34fb';
const NUS_SERVICE  = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_CHAR  = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write
const NUS_TX_CHAR  = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify

export class BLETransport {
    constructor() {
        this._device  = null;
        this._rxChar  = null; // write
        this._txChar  = null; // notify
        this._bleMode = null;
        this._queue   = [];
        this._queueRunning = false;
        this._parser  = new RTUParser(SLAVE_ID);
        this._setupParser();
    }

    _setupParser() {
        this._parser
            .onFC03Response(values => bus.emit('modbus:fc03', { values }))
            .onFC06Echo((addr, value) => bus.emit('modbus:fc06', { addr, value }))
            .onException((funcCode, exCode) => bus.emit('modbus:exception', { funcCode, exCode }))
            .onError(msg => bus.emit('ui:log', { type: 'ERR', msg, clr: 'text-red-400' }));
    }

    get isConnected() { return !!this._device; }
    get deviceName()  { return this._device?.name || 'BLE Device'; }

    async connect() {
        this._device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [HM10_SERVICE, NUS_SERVICE],
        });
        this._device.addEventListener('gattserverdisconnected', () => this._onDisconnect());

        let server;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try { server = await this._device.gatt.connect(); break; }
            catch (e) {
                if (attempt === 3) throw new Error('GATT 連線失敗（已重試 3 次）');
                await new Promise(r => setTimeout(r, 800));
            }
        }

        try {
            const svc = await server.getPrimaryService(HM10_SERVICE);
            const ch  = await svc.getCharacteristic(HM10_CHAR);
            this._rxChar = ch; this._txChar = ch; this._bleMode = 'hm10';
        } catch (_) {
            const svc = await server.getPrimaryService(NUS_SERVICE);
            this._rxChar = await svc.getCharacteristic(NUS_RX_CHAR);
            this._txChar = await svc.getCharacteristic(NUS_TX_CHAR);
            this._bleMode = 'nus';
        }

        await this._txChar.startNotifications();
        this._txChar.addEventListener('characteristicvaluechanged', e => {
            const view = e.target.value;
            const bytes = new Uint8Array(view.buffer);
            this._parser.feed(bytes);
        });

        this._parser.reset();
        bus.emit('transport:connected', { type: 'ble', deviceName: this._device.name || 'BLE' });
        bus.emit('ui:log', { type: 'SYS', msg: `BLE 已連線 (${this._bleMode})`, clr: 'text-emerald-400' });
    }

    async disconnect() {
        try { this._device?.gatt?.disconnect(); } catch (_) {}
        this._device = null; this._rxChar = null; this._txChar = null;
        bus.emit('transport:disconnected', { reason: 'user' });
        bus.emit('ui:log', { type: 'SYS', msg: 'BLE 已斷線', clr: 'text-amber-400' });
    }

    async send(buf) {
        if (!this._rxChar) return;
        const isPoll = buf[1] === 0x03 && buf[2] === 0x00 && buf[3] === 0x00;
        if (isPoll && this._queue.some(q => !q.isPoll)) return;
        if (isPoll && this._queue.some(q => q.isPoll))  return;
        this._queue.push({ buf, isPoll });
        this._processQueue();
    }

    async _processQueue() {
        if (this._queueRunning) return;
        this._queueRunning = true;
        while (this._queue.length > 0) {
            const { buf } = this._queue.shift();
            if (!this._rxChar) break;
            try {
                for (let i = 0; i < buf.length; i += 20) {
                    await this._rxChar.writeValueWithoutResponse(buf.slice(i, i + 20));
                    if (i + 20 < buf.length) await new Promise(r => setTimeout(r, 20));
                }
            } catch (e) {
                if (!e.message.includes('in progress') && !e.message.includes('disconnected'))
                    bus.emit('ui:log', { type: 'ERR', msg: `BLE send: ${e.message}`, clr: 'text-red-400' });
            }
            await new Promise(r => setTimeout(r, 30));
        }
        this._queueRunning = false;
    }

    _onDisconnect() {
        this._device = null; this._rxChar = null; this._txChar = null;
        bus.emit('transport:disconnected', { reason: 'ble_lost' });
        bus.emit('ui:log', { type: 'SYS', msg: 'BLE 裝置已斷線', clr: 'text-amber-400' });
    }
}
