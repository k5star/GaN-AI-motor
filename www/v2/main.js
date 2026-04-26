import { bus } from './core/EventBus.js';
import { MONITOR_DATA_CONFIG, MOTOR_STATUS_MAP } from './core/Constants.js';

import { TransportManager } from './transport/TransportManager.js';
import { MotorDriver }       from './driver/MotorDriver.js';
import { ParamScanner }      from './driver/ParamScanner.js';
import { MotorIdentifier }   from './driver/MotorIdentifier.js';

import LTC8116Profile from './profiles/LTC8116.js';
import genericProfile from './profiles/generic.js';

import { AIConfig }          from './ai/AIConfig.js';
import { AIService }         from './ai/AIService.js';
import { ActionExecutor }    from './ai/ActionExecutor.js';
import { TrainingData }      from './ai/TrainingData.js';
import { validateAICommand } from './ai/CommandValidator.js';

import { DataRecorder }      from './recording/DataRecorder.js';

import { NavBar }            from './ui/NavBar.js';
import { MotorIdBadge }      from './ui/MotorIdBadge.js';
import { StatusCards }       from './ui/StatusCards.js';
import { ChartView }         from './ui/ChartView.js';
import { ControlPanel }      from './ui/ControlPanel.js';
import { ParamViewer }       from './ui/ParamViewer.js';
import { AIChatPanel }       from './ui/AIChatPanel.js';
import { AISettingsModal }   from './ui/AISettingsModal.js';
import { LogPanel }          from './ui/LogPanel.js';

// ── Instantiate modules ──
const transport    = new TransportManager();
const motorDriver  = new MotorDriver(transport);
const scanner      = new ParamScanner(transport);
const identifier   = new MotorIdentifier([LTC8116Profile, genericProfile]);
const aiConfig     = new AIConfig();
const trainingData = new TrainingData();
const aiService    = new AIService(aiConfig);
const executor     = new ActionExecutor(motorDriver);
const recorder     = new DataRecorder();

// ── Mount UI modules ──
const navBar = new NavBar(transport, recorder);
const badgeContainer = navBar.mount(document.getElementById('navbar'));
new MotorIdBadge().mount(badgeContainer);

new ChartView().mount(document.getElementById('chart-area'));
new ControlPanel(motorDriver).mount(document.getElementById('control-panel'));
new StatusCards().mount(document.getElementById('status-cards'));
new ParamViewer().mount(document.getElementById('param-viewer'));
new AIChatPanel(aiService, executor).mount(document.getElementById('ai-chat'));
new AISettingsModal(aiConfig, trainingData).mount(document.getElementById('modal-container'));
new LogPanel().mount(document.getElementById('log-panel'));

// ── Core event wiring (Mediator) ──

// Connection
bus.on('ui:connectRequested', async ({ type }) => {
    try {
        await transport.connect(type);
    } catch (e) {
        bus.emit('ui:log', { type: 'ERR', msg: `連線失敗: ${e.message}`, clr: 'text-red-400' });
    }
});

bus.on('ui:disconnectRequested', async () => {
    motorDriver.stopPolling();
    await transport.disconnect();
});

// After connection: scan → identify → poll
bus.on('transport:connected', async ({ type }) => {
    motorDriver.stopPolling();
    try {
        const result = await scanner.scanAll();
        const idResult = identifier.identify(result);
        motorDriver.loadProfile(idResult.profile);
    } catch (e) {
        bus.emit('ui:log', { type: 'WARN', msg: `掃描失敗: ${e.message}，使用預設設定`, clr: 'text-amber-400' });
        motorDriver.loadProfile(genericProfile);
    }
    motorDriver.startPolling();
});

bus.on('transport:disconnected', () => {
    motorDriver.stopPolling();
});

// Motor status → update AI context
bus.on('motor:statusUpdated', ({ values }) => {
    const s = MOTOR_STATUS_MAP[values[0]] || { txt: 'UNKNOWN' };
    const state = `狀態:${s.txt} | 實際轉速:${values[2]}RPM | 目標轉速(可直接使用):${values[5]}RPM | 電流:${(values[12]*0.01).toFixed(2)}A`;
    aiService.updateMotorState(state);
});

// Motor status → recorder
bus.on('motor:statusUpdated', ({ values }) => {
    if (recorder.isRecording) recorder.addRow(values);
});

// AI response → validate → execute
bus.on('ai:responseReceived', async ({ parsed, userText }) => {
    if (!parsed) {
        bus.emit('ui:log', { type: 'ERR', msg: 'AI 回傳無法解析的 JSON', clr: 'text-red-400' });
        return;
    }
    const result = validateAICommand(parsed, userText, (u, r, e) => trainingData.recordFailed(u, r, e));
    if (!result.ok) {
        bus.emit('ai:validationError', { errors: result.errors });
        bus.emit('ui:log', { type: 'WARN', msg: `驗證修正: ${result.errors.join(', ')}`, clr: 'text-amber-400' });
    }
    if (result.fixed.action !== 'none' && result.fixed.action !== 'query') {
        await executor.execute(result.fixed);
    }
});

bus.emit('ui:log', { type: 'SYS', msg: 'GaN Motor V2 已啟動', clr: 'text-emerald-400' });
