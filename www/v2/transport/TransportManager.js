import { bus } from '../core/EventBus.js';
import { SerialTransport } from './SerialTransport.js';
import { BLETransport }    from './BLETransport.js';

export class TransportManager {
    constructor() {
        this._serial = new SerialTransport();
        this._ble    = new BLETransport();
        this._type   = null; // 'serial' | 'ble' | null
    }

    get isConnected()    { return this._type !== null; }
    get connectionType() { return this._type; }
    get deviceName() {
        if (this._type === 'serial') return 'Serial Port';
        if (this._type === 'ble')    return this._ble.deviceName;
        return '';
    }

    async connect(type) {
        if (this.isConnected) await this.disconnect();
        try {
            if (type === 'serial') {
                await this._serial.connect();
                this._type = 'serial';
            } else if (type === 'ble') {
                await this._ble.connect();
                this._type = 'ble';
            } else {
                // auto: prefer serial if available
                const hasSerial = !!navigator.serial;
                const hasBLE    = !!navigator.bluetooth;
                if (hasSerial) { await this._serial.connect(); this._type = 'serial'; }
                else if (hasBLE) { await this._ble.connect(); this._type = 'ble'; }
                else throw new Error('瀏覽器不支援 Web Serial 或 Web Bluetooth');
            }
        } catch (e) {
            this._type = null;
            bus.emit('transport:error', { message: e.message });
            throw e;
        }
    }

    async disconnect() {
        if (this._type === 'serial') await this._serial.disconnect();
        if (this._type === 'ble')    await this._ble.disconnect();
        this._type = null;
    }

    async send(buf) {
        if (this._type === 'serial') return this._serial.send(buf);
        if (this._type === 'ble')    return this._ble.send(buf);
    }
}
