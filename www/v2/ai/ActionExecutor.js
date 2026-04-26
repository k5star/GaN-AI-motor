import { bus } from '../core/EventBus.js';

export class ActionExecutor {
    constructor(motorDriver) {
        this._motor   = motorDriver;
        this._aborted = false;
        this._running = false;
        this._abortResolvers = [];
    }

    get isRunning() { return this._running; }
    get isAborted() { return this._aborted; }

    abort() {
        this._aborted = true;
        for (const resolve of this._abortResolvers) resolve();
        this._abortResolvers = [];
        bus.emit('ai:sequenceAborted', {});
        bus.emit('ui:log', { type: 'WARN', msg: '序列已中止', clr: 'text-amber-400' });
    }

    _abortableSleep(ms) {
        return new Promise(resolve => {
            if (this._aborted) { resolve(); return; }
            const t = setTimeout(resolve, ms);
            this._abortResolvers.push(() => { clearTimeout(t); resolve(); });
        });
    }

    async execute(cmd) {
        this._aborted = false;
        this._running = true;
        try {
            await this._run(cmd);
        } finally {
            this._running = false;
        }
    }

    async _run(cmd) {
        const { action, params = {} } = cmd;
        if (this._aborted) return;

        bus.emit('ai:executing', { action });

        switch (action) {
            case 'run':
                await this._motor.run(params.rpm, params.dir);
                break;
            case 'stop':
                await this._motor.stop();
                break;
            case 'setSpeed':
                await this._motor.setSpeed(params.rpm);
                break;
            case 'setDir':
                await this._motor.setDir(params.dir);
                break;
            case 'setAcc':
                await this._motor.setAcc(params.ms);
                break;
            case 'setDec':
                await this._motor.setDec(params.ms);
                break;
            case 'alarmReset':
                await this._motor.alarmReset();
                break;
            case 'sequence': {
                const steps = params.steps || [];
                bus.emit('ui:log', { type: 'SYS', msg: `▶ 序列執行：共 ${steps.length} 步`, clr: 'text-violet-400' });
                for (let i = 0; i < steps.length; i++) {
                    if (this._aborted) break;
                    const step = steps[i];
                    bus.emit('ui:log', { type: 'SYS', msg: `步驟 ${i + 1}/${steps.length}：${step.action}`, clr: 'text-slate-400' });
                    await this._run(step);
                    if (step.delay > 0 && !this._aborted) {
                        bus.emit('ui:log', { type: 'SYS', msg: `⏱ 等待 ${step.delay / 1000}s`, clr: 'text-slate-500' });
                        await this._abortableSleep(step.delay);
                    }
                }
                if (!this._aborted) bus.emit('ai:sequenceCompleted', {});
                break;
            }
            case 'repeat': {
                const steps = params.steps || [];
                const count = params.count || 1;
                bus.emit('ui:log', { type: 'SYS', msg: `🔁 重複 ${count} 次 × ${steps.length} 步`, clr: 'text-violet-400' });
                for (let r = 0; r < count; r++) {
                    if (this._aborted) break;
                    bus.emit('ui:log', { type: 'SYS', msg: `第 ${r + 1}/${count} 輪`, clr: 'text-slate-400' });
                    for (let i = 0; i < steps.length; i++) {
                        if (this._aborted) break;
                        await this._run(steps[i]);
                        if (steps[i].delay > 0 && !this._aborted)
                            await this._abortableSleep(steps[i].delay);
                    }
                }
                if (!this._aborted) bus.emit('ai:sequenceCompleted', {});
                break;
            }
            case 'query':
            case 'none':
                break;
        }
    }
}
