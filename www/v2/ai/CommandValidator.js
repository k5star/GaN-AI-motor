import { MOTOR_CMD_SCHEMA, ACTION_WHITELIST } from './CommandSchema.js';

function deepClone(obj) {
    try { return structuredClone(obj); } catch (_) { return JSON.parse(JSON.stringify(obj)); }
}

// Fully ported from www/index-local-ai-motor.html validateAICommand (lines 1394-1520)
// recordFailedCase is injected to avoid circular dependency
export function validateAICommand(cmd, userInput, recordFailed) {
    const errors = [];

    if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) {
        return { ok: false, fixed: { action: 'query', params: { question: '指令格式錯誤，請重新輸入' }, reply: '格式錯誤' }, errors: ['not an object'] };
    }

    const fixed = deepClone(cmd);
    if (!fixed.params || typeof fixed.params !== 'object') fixed.params = {};
    const p = fixed.params;

    if (!ACTION_WHITELIST.has(fixed.action)) {
        errors.push(`unknown action: ${fixed.action}`);
        if (userInput) recordFailed?.(userInput, cmd, errors);
        return { ok: false, fixed: { action: 'query', params: { question: `無法識別的指令「${fixed.action}」，請重新描述` }, reply: '未知指令' }, errors };
    }

    const DIR_MAP = { left: 'CCW', right: 'CW', '正': 'CW', '反': 'CCW', '順': 'CW', '逆': 'CCW', cw: 'CW', ccw: 'CCW' };
    if (p.dir !== undefined && p.dir !== 'CW' && p.dir !== 'CCW') {
        const mapped = DIR_MAP[String(p.dir).toLowerCase()] || DIR_MAP[p.dir];
        if (mapped) {
            fixed.warning = (fixed.warning ? fixed.warning + '；' : '') + `dir「${p.dir}」已修正為${mapped}`;
            p.dir = mapped;
        } else {
            errors.push(`invalid dir value: ${p.dir}`);
        }
    }

    if (p.rpm !== undefined) {
        const rpm = Number(p.rpm);
        if (isNaN(rpm)) {
            errors.push('rpm is not a number');
        } else if (rpm < 0) {
            p.rpm = 0;
            fixed.warning = (fixed.warning ? fixed.warning + '；' : '') + 'rpm不可為負數，已設為0';
        } else if (rpm > 3000) {
            p.rpm = 3000;
            fixed.warning = (fixed.warning ? fixed.warning + '；' : '') + `rpm ${rpm}超出最大值3000，已限制為3000`;
        } else {
            p.rpm = Math.round(rpm);
        }
    }

    if (p.ms !== undefined) {
        const ms = Number(p.ms);
        if (isNaN(ms) || ms < 1) {
            p.ms = 1;
            fixed.warning = (fixed.warning ? fixed.warning + '；' : '') + 'ms已修正為最小值1';
        } else if (ms > 60000) {
            p.ms = 60000;
            fixed.warning = (fixed.warning ? fixed.warning + '；' : '') + `ms ${ms}已限制為60000`;
        } else {
            p.ms = Math.round(ms);
        }
    }

    if (fixed.action === 'repeat') {
        const count = Number(p.count);
        if (isNaN(count) || count < 1) {
            p.count = 1;
        } else if (count > 999) {
            p.count = 999;
        } else {
            p.count = Math.round(count);
        }
        const steps = p.steps;
        if (!Array.isArray(steps) || steps.length === 0) {
            errors.push('repeat.steps is empty or not array');
            if (userInput) recordFailed?.(userInput, cmd, errors);
            return { ok: false, fixed: { action: 'query', params: { question: '重複指令缺少steps，請描述每個步驟' }, reply: 'repeat格式錯誤' }, errors };
        }
        p.steps = steps.map((step, i) => {
            const sv = validateAICommand(step, null, null);
            if (!sv.ok) errors.push(`repeat.step[${i}]: ${sv.errors.join(', ')}`);
            const s = sv.fixed;
            const d = Number(step.delay);
            s.delay = (isNaN(d) || d < 0) ? 0 : Math.min(Math.round(d), 300000);
            return s;
        });
    }

    if (fixed.action === 'sequence') {
        const steps = p.steps;
        if (!Array.isArray(steps) || steps.length === 0) {
            errors.push('sequence.steps is empty or not array');
            if (userInput) recordFailed?.(userInput, cmd, errors);
            return { ok: false, fixed: { action: 'query', params: { question: '序列指令格式錯誤，請重新描述每個步驟' }, reply: '序列格式錯誤' }, errors };
        }
        p.steps = steps.map((step, i) => {
            const sv = validateAICommand(step, null, null);
            if (!sv.ok) errors.push(`step[${i}]: ${sv.errors.join(', ')}`);
            const s = sv.fixed;
            const d = Number(step.delay);
            s.delay = (isNaN(d) || d < 0) ? 0 : Math.min(Math.round(d), 300000);
            return s;
        });
    }

    const schema = MOTOR_CMD_SCHEMA.actions[fixed.action];
    if (schema) {
        for (const req of (schema.required || [])) {
            if (p[req] === undefined || p[req] === null || p[req] === '') {
                errors.push(`missing required param: ${req} for action: ${fixed.action}`);
                if (userInput) recordFailed?.(userInput, cmd, errors);
                return {
                    ok: false,
                    fixed: { action: 'query', params: { question: `指令「${fixed.action}」缺少必要參數「${req}」，請補充` }, reply: `缺少 ${req}` },
                    errors,
                };
            }
        }
    }

    if (errors.length > 0 && userInput) recordFailed?.(userInput, cmd, errors);
    return { ok: errors.length === 0, fixed, errors };
}
