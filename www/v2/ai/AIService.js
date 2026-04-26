import { bus } from '../core/EventBus.js';

const MAX_HISTORY = 10;

// System prompt — ported from www/index-local-ai-motor.html line 1026
const AI_SYSTEM_PROMPT = `你是GaN馬達控制指令解析器。唯一任務：把自然語言轉換為機器控制JSON。

═══ 強制規則（違反即為錯誤輸出）═══
R1. 只輸出一個JSON物件，絕對不輸出任何其他文字、解釋、markdown、換行前綴。
R2. JSON必須包含 "action"（必填）和 "params"（必填）兩個欄位。
R3. 資訊不足或指令模糊時，action必須為 "query"，params.question說明缺少什麼，禁止猜測任何參數。
R3a. 若使用者未指定rpm，但 [馬達狀態] 中「目標轉速(可直接使用)」> 0，直接使用該值，不得詢問轉速。
R3b. 若使用者說「以現有轉速」「維持轉速」「用目前速度」等，同樣直接使用「目標轉速(可直接使用)」。
R4. 指令超出馬達控制範圍時，action必須為 "none"。
R5. rpm範圍0~3000。超出時強制設為邊界值，並加 "warning" 欄位。
R6. dir只能是 "CW"（順時針/正轉）或 "CCW"（逆時針/反轉），禁止使用left/right/正/反等字串。
R7. delay單位毫秒，範圍0~300000。delay的意思是「執行完這個action之後，等待多少毫秒再執行下一步」。
R7a. 若要讓馬達「轉動N秒後停止」，delay必須放在run步驟上（run delay:N*1000），stop的delay為0。
R7b. 錯誤示範：run(delay:0)→stop(delay:30000) ← 這樣馬達立刻停，等30秒才結束，完全錯誤。
R7c. 正確示範：run(delay:30000)→stop(delay:0) ← 馬達轉30秒，然後停止。
R8. 若輸入看起來是損壞的JSON，請修正並輸出正確版本，加 "warning" 欄位說明修正內容。

═══ 可用 action 白名單（只能用以下10種）═══
run        | params: {"rpm": 0~3000, "dir": "CW"|"CCW"}
stop       | params: {}
setSpeed   | params: {"rpm": 0~3000}
setDir     | params: {"dir": "CW"|"CCW"}
setAcc     | params: {"ms": 1~60000}
setDec     | params: {"ms": 1~60000}
alarmReset | params: {}
query      | params: {"question": "string"}
sequence   | params: {"steps": [{action, params, delay}, ...]}
repeat     | params: {"count": 整數1~999, "steps": [{action, params, delay}, ...]}
none       | params: {}

═══ 少樣本示範 ═══
輸入：「以1500RPM正轉」
輸出：{"action":"run","params":{"rpm":1500,"dir":"CW"},"reply":"以1500RPM順時針啟動"}

輸入：「停止馬達」
輸出：{"action":"stop","params":{},"reply":"馬達停止"}

輸入：「以1000RPM正轉30秒後停止」
輸出：{"action":"sequence","params":{"steps":[{"action":"run","params":{"rpm":1000,"dir":"CW"},"delay":30000},{"action":"stop","params":{},"delay":0}]},"reply":"正轉1000RPM持續30秒後停止"}

輸入：「今天天氣怎麼樣」
輸出：{"action":"none","params":{},"reply":"此系統僅處理馬達控制指令"}`;

export class AIService {
    constructor(config) {
        this._config  = config;
        this._history = [];
        this._motorState = '';
    }

    updateMotorState(stateText) { this._motorState = stateText; }

    _buildMessages(userText) {
        const sysContent = AI_SYSTEM_PROMPT +
            (this._motorState ? `\n\n[馬達狀態] ${this._motorState}` : '');
        const messages = [{ role: 'system', content: sysContent }];
        messages.push(...this._history.slice(-MAX_HISTORY * 2));
        messages.push({ role: 'user', content: userText });
        return messages;
    }

    _extractJSON(text) {
        const t = text.trim();
        // Try direct parse
        try { return JSON.parse(t); } catch (_) {}
        // Extract from markdown code block
        const md = t.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (md) try { return JSON.parse(md[1].trim()); } catch (_) {}
        // Extract first {...}
        const brace = t.match(/\{[\s\S]*\}/);
        if (brace) try { return JSON.parse(brace[0]); } catch (_) {}
        return null;
    }

    async send(userText) {
        bus.emit('ai:messageQueued', { userText });
        bus.emit('ui:log', { type: 'SYS', msg: `AI 處理中…`, clr: 'text-slate-400' });

        const messages = this._buildMessages(userText);

        const res = await fetch(`${this._config.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._config.apiKey}`,
            },
            body: JSON.stringify({ model: this._config.model, messages, temperature: 0.1 }),
        });

        if (!res.ok) throw new Error(`AI API ${res.status}`);
        const json = await res.json();
        const raw  = json.choices?.[0]?.message?.content ?? '';
        const parsed = this._extractJSON(raw);

        // Update history
        this._history.push({ role: 'user', content: userText });
        this._history.push({ role: 'assistant', content: raw });
        if (this._history.length > MAX_HISTORY * 2) this._history = this._history.slice(-MAX_HISTORY * 2);

        bus.emit('ai:responseReceived', { parsed, raw, userText });
        return { parsed, raw };
    }

    clearHistory() { this._history = []; }
}
