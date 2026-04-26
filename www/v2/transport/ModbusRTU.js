// Pure Modbus RTU functions — no side effects, no EventBus dependency

export function crc16(buf) {
    let crc = 0xFFFF;
    for (const b of buf) {
        crc ^= b;
        for (let i = 0; i < 8; i++)
            crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1;
    }
    return crc;
}

export function buildFC03(slaveId, startAddr, qty) {
    const buf = new Uint8Array([
        slaveId,
        0x03,
        (startAddr >> 8) & 0xFF, startAddr & 0xFF,
        (qty >> 8) & 0xFF,       qty & 0xFF,
        0, 0,
    ]);
    const c = crc16(buf.slice(0, 6));
    buf[6] = c & 0xFF; buf[7] = (c >> 8) & 0xFF;
    return buf;
}

export function buildFC06(slaveId, addr, value) {
    let v = Math.round(Number(value));
    if (v < 0) v = (0xFFFF + v + 1) & 0xFFFF;
    v &= 0xFFFF;
    const buf = new Uint8Array([
        slaveId,
        0x06,
        (addr >> 8) & 0xFF, addr & 0xFF,
        (v >> 8) & 0xFF,    v & 0xFF,
        0, 0,
    ]);
    const c = crc16(buf.slice(0, 6));
    buf[6] = c & 0xFF; buf[7] = (c >> 8) & 0xFF;
    return buf;
}

export function hexStr(buf) {
    return Array.from(buf).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

// ── RTU Parser — per-instance, independent buffer ──
export class RTUParser {
    constructor(slaveId) {
        this._slaveId = slaveId;
        this._buf = new Uint8Array(512);
        this._len = 0;
        this._onFC03 = null;
        this._onFC06 = null;
        this._onException = null;
        this._onError = null;
    }

    onFC03Response(cb)  { this._onFC03      = cb; return this; }
    onFC06Echo(cb)      { this._onFC06      = cb; return this; }
    onException(cb)     { this._onException = cb; return this; }
    onError(cb)         { this._onError     = cb; return this; }

    reset() { this._len = 0; }

    feed(bytes) {
        for (const b of bytes) {
            if (this._len < this._buf.length) this._buf[this._len++] = b;
        }
        this._parse();
    }

    _parse() {
        let safety = 0;
        while (this._len > 0 && safety++ < 20) {
            // Sync to slave ID
            if (this._buf[0] !== this._slaveId) {
                let found = -1;
                for (let i = 1; i < this._len; i++) {
                    if (this._buf[i] === this._slaveId) { found = i; break; }
                }
                if (found > 0) {
                    this._buf.copyWithin(0, found);
                    this._len -= found;
                } else {
                    this._len = 0;
                }
                continue;
            }

            if (this._len < 2) break;
            const fc = this._buf[1];

            if (fc === 0x03) {
                if (this._len < 5) break;
                const byteCount = this._buf[2];
                const total = 3 + byteCount + 2;
                if (this._len < total) break;
                const frame = this._buf.slice(0, total);
                const crc = crc16(frame.slice(0, total - 2));
                const frameCrc = frame[total - 2] | (frame[total - 1] << 8);
                if (crc === frameCrc) {
                    const values = [];
                    const regCount = Math.floor(byteCount / 2);
                    for (let i = 0; i < regCount; i++) {
                        let v = (frame[3 + i * 2] << 8) | frame[4 + i * 2];
                        if (v > 32767) v -= 65536;
                        values.push(v);
                    }
                    this._onFC03?.(values);
                } else {
                    this._onError?.('CRC error FC03');
                }
                this._buf.copyWithin(0, total);
                this._len -= total;
                continue;
            }

            if (fc === 0x06) {
                if (this._len < 8) break;
                const frame = this._buf.slice(0, 8);
                const crc = crc16(frame.slice(0, 6));
                const frameCrc = frame[6] | (frame[7] << 8);
                if (crc === frameCrc) {
                    const addr  = (frame[2] << 8) | frame[3];
                    const value = (frame[4] << 8) | frame[5];
                    this._onFC06?.(addr, value);
                } else {
                    this._onError?.('CRC error FC06');
                }
                this._buf.copyWithin(0, 8);
                this._len -= 8;
                continue;
            }

            if (fc & 0x80) {
                if (this._len < 5) break;
                const frame = this._buf.slice(0, 5);
                const crc = crc16(frame.slice(0, 3));
                const frameCrc = frame[3] | (frame[4] << 8);
                if (crc === frameCrc) this._onException?.(fc & 0x7F, frame[2]);
                this._buf.copyWithin(0, 5);
                this._len -= 5;
                continue;
            }

            // Unknown byte, skip
            this._buf.copyWithin(0, 1);
            this._len -= 1;
        }
    }
}
