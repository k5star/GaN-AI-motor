import { bus } from '../core/EventBus.js';

const MAX_POINTS = 120;

export class ChartView {
    constructor() { this._chart = null; this._labels = []; this._rpm = []; this._current = []; }

    mount(container) {
        const canvas = document.createElement('canvas');
        canvas.id = 'motorChart';
        canvas.className = 'w-full';
        canvas.style.height = '140px';
        container.appendChild(canvas);

        this._chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: this._labels,
                datasets: [
                    { label: '實際轉速 (RPM)', data: this._rpm,     borderColor: '#34d399', borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: 'y' },
                    { label: '電流 (×10 A)',  data: this._current, borderColor: '#f87171', borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: 'y' },
                ],
            },
            options: {
                animation: false, responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
                scales: {
                    x: { ticks: { color: '#64748b', maxTicksLimit: 6, font: { size: 9 } }, grid: { color: '#1e293b' } },
                    y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: '#1e293b' } },
                },
            },
        });

        bus.on('motor:statusUpdated', ({ values }) => this._addPoint(values));
    }

    _addPoint(values) {
        const now = new Date().toLocaleTimeString();
        const rpm  = values[2] ?? 0;       // D02 實際轉速
        const curr = (values[12] ?? 0) * 10; // D12 電流 ×10 for display scale

        this._labels.push(now);
        this._rpm.push(rpm);
        this._current.push(curr);

        if (this._labels.length > MAX_POINTS) {
            this._labels.shift(); this._rpm.shift(); this._current.shift();
        }
        this._chart?.update('none');
    }
}
