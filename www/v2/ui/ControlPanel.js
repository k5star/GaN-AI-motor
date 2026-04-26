import { bus } from '../core/EventBus.js';

export class ControlPanel {
    constructor(motorDriver) { this._motor = motorDriver; }

    mount(container) {
        container.innerHTML = `
        <div class="bg-slate-800 rounded-lg p-3 flex flex-col gap-3">
            <!-- RUN / STOP -->
            <div class="flex gap-2">
                <button id="cp-run"  class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded text-sm">▶ RUN</button>
                <button id="cp-stop" class="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded text-sm">⏹ STOP</button>
                <button id="cp-alm"  class="bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded text-sm">⚠ RST</button>
            </div>
            <!-- Direction -->
            <div class="flex gap-2 items-center">
                <span class="text-xs text-slate-400 w-12">方向</span>
                <button id="cp-cw"  class="flex-1 bg-emerald-600 text-white text-xs py-1 rounded">CW</button>
                <button id="cp-ccw" class="flex-1 bg-slate-700 text-slate-400 text-xs py-1 rounded">CCW</button>
            </div>
            <!-- Speed slider -->
            <div>
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                    <span>轉速</span>
                    <span id="cp-rpm-disp" class="font-mono font-bold text-emerald-400">0 RPM</span>
                </div>
                <input type="range" id="cp-rpm-slider" min="0" max="3000" step="10" value="0" class="w-full">
                <div class="flex gap-1 mt-1">
                    ${[300,500,1000,1500,2000,3000].map(v =>
                        `<button onclick="document.getElementById('cp-rpm-slider').value=${v};document.getElementById('cp-rpm-disp').textContent='${v} RPM';"
                            class="flex-1 bg-slate-700 hover:bg-slate-600 text-[10px] py-0.5 rounded text-slate-300">${v}</button>`
                    ).join('')}
                </div>
            </div>
            <!-- Acc / Dec -->
            <div class="flex gap-2">
                <div class="flex-1">
                    <div class="text-[10px] text-slate-500 mb-1">加速 ms</div>
                    <div class="flex gap-1">
                        <input type="number" id="cp-acc" value="2000" min="1" max="60000"
                            class="flex-1 bg-slate-900 border border-slate-600 rounded px-1 text-xs text-white w-16">
                        <button id="cp-acc-set" class="bg-slate-700 hover:bg-emerald-700 text-emerald-400 px-2 py-1 rounded text-[10px]">SET</button>
                    </div>
                </div>
                <div class="flex-1">
                    <div class="text-[10px] text-slate-500 mb-1">減速 ms</div>
                    <div class="flex gap-1">
                        <input type="number" id="cp-dec" value="2000" min="1" max="60000"
                            class="flex-1 bg-slate-900 border border-slate-600 rounded px-1 text-xs text-white w-16">
                        <button id="cp-dec-set" class="bg-slate-700 hover:bg-emerald-700 text-emerald-400 px-2 py-1 rounded text-[10px]">SET</button>
                    </div>
                </div>
            </div>
        </div>`;
        container.appendChild(document.createElement('span')); // flush

        // Wire events
        document.getElementById('cp-run').onclick  = () => {
            const rpm = parseInt(document.getElementById('cp-rpm-slider').value) || 0;
            this._motor.run(rpm, this._motor.currentDir);
        };
        document.getElementById('cp-stop').onclick = () => this._motor.stop();
        document.getElementById('cp-alm').onclick  = () => this._motor.alarmReset();

        document.getElementById('cp-cw').onclick  = () => { this._setDirUI('CW');  this._motor.setDir('CW'); };
        document.getElementById('cp-ccw').onclick = () => { this._setDirUI('CCW'); this._motor.setDir('CCW'); };

        document.getElementById('cp-rpm-slider').oninput = (e) => {
            document.getElementById('cp-rpm-disp').textContent = `${e.target.value} RPM`;
        };
        document.getElementById('cp-rpm-slider').onchange = (e) => {
            this._motor.setSpeed(parseInt(e.target.value));
        };

        document.getElementById('cp-acc-set').onclick = () => {
            this._motor.setAcc(parseInt(document.getElementById('cp-acc').value) || 2000);
        };
        document.getElementById('cp-dec-set').onclick = () => {
            this._motor.setDec(parseInt(document.getElementById('cp-dec').value) || 2000);
        };
    }

    _setDirUI(dir) {
        document.getElementById('cp-cw').className  = `flex-1 ${dir==='CW'  ?'bg-emerald-600 text-white':'bg-slate-700 text-slate-400'} text-xs py-1 rounded`;
        document.getElementById('cp-ccw').className = `flex-1 ${dir==='CCW' ?'bg-emerald-600 text-white':'bg-slate-700 text-slate-400'} text-xs py-1 rounded`;
    }
}
