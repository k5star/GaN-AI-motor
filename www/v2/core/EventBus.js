class EventBus {
    constructor() {
        this._handlers = {};
    }

    on(event, handler) {
        if (!this._handlers[event]) this._handlers[event] = [];
        this._handlers[event].push(handler);
        return this;
    }

    off(event, handler) {
        if (!this._handlers[event]) return this;
        this._handlers[event] = this._handlers[event].filter(h => h !== handler);
        return this;
    }

    emit(event, payload) {
        if (!this._handlers[event]) return;
        for (const h of [...this._handlers[event]]) {
            try { h(payload); } catch (e) { console.error(`[EventBus] ${event}`, e); }
        }
    }

    once(event, handler) {
        const wrapper = (payload) => { this.off(event, wrapper); handler(payload); };
        return this.on(event, wrapper);
    }
}

export const bus = new EventBus();

// ── 全系統事件清單 ──
// transport:connected      { type:'serial'|'ble', deviceName:string }
// transport:disconnected   { reason:string }
// transport:error          { message:string }
// modbus:fc03              { startAddr:number, values:number[] }
// modbus:fc06              { addr:number, value:number }
// modbus:exception         { funcCode:number, exCode:number }
// motor:statusUpdated      { values:number[16] }
// scanner:started          {}
// scanner:progress         { done:number, total:number }
// scanner:groupDone        { group:number, startAddr:number, values:number[] }
// scanner:completed        { groups:object }
// identifier:detected      { modelId:string, profile:object, confidence:number, warnings:string[] }
// ai:messageQueued         { userText:string }
// ai:responseReceived      { parsed:object }
// ai:executing             { action:string }
// ai:sequenceAborted       {}
// ai:sequenceCompleted     {}
// ai:validationError       { errors:string[] }
// recorder:started         {}
// recorder:stopped         { rowCount:number }
// ui:log                   { type:string, msg:string, clr:string }
// ui:notification          { level:string, message:string }
// ui:abortRequested        {}
// ui:connectRequested      { type:string }
// ui:disconnectRequested   {}
