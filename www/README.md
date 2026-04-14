# GaN Motor LOCAL AI ROBOT

> **AI 語音控制 GaN 馬達** — 透過本地 AI（Open WebUI）以自然語言指令控制 GaN 馬達驅動器

---

## 線上網址

```
https://k5star.github.io/GaN-AI-motor/www/index-local-ai-motor.html
```

---

## 功能特色

| 功能 | 說明 |
|------|------|
| 🎙️ AI 語音控制 | 說出自然語言指令，AI 自動解析並執行馬達動作 |
| 🔗 Web Serial | USB / COM 埠直接連線馬達驅動器 |
| 📡 Web Bluetooth | BLE（HM-10 模組）無線連線 |
| 📊 即時圖表 | 雙通道即時數據監控（轉速、電流、電壓等） |
| 🔄 序列動作 | 支援多步驟自動化序列（如：左轉30秒後右轉30秒） |
| 📥 數據錄製 | REC 錄製並匯出 CSV，支援離線分析 |
| 🔒 登入保護 | SHA-256 加密帳密，支援「記住我」自動登入 |
| 📱 手機支援 | 響應式版面，支援手機觸控操作 |

---

## 登入

帳號密碼由管理員私下提供，不公開於此文件。

- 勾選「記住我」→ 下次開啟自動登入（存於 localStorage）
- 未勾選 → 關閉分頁後需重新登入（sessionStorage）

---

## 硬體需求

| 項目 | 規格 |
|------|------|
| 馬達驅動器 | GaN 驅動器（Modbus RTU，Slave ID = 1） |
| 通訊模組 | USB-Serial 或 HM-10（BLE，LTC8116） |
| 通訊參數 | 115200 baud / 8N1 |
| 瀏覽器 | Chrome（需支援 Web Serial / Web Bluetooth） |

### 主要 Modbus 暫存器

| 暫存器 | 位址 | 說明 |
|--------|------|------|
| NET_IO | `0x1400` | 主控開關（RUN/STOP/方向） |
| SPD_RAM | `0x3F08` | 目標轉速 (0–3000 RPM) |
| ACC | `0x4000` | 加速時間 (ms) |
| DEC | `0x4008` | 減速時間 (ms) |

---

## AI 設定

### Open WebUI（本地 AI）

1. 點右上角 **🔑 AI設定**
2. 填入：

| 欄位 | 說明 | 預設值 |
|------|------|--------|
| Base URL | Open WebUI 伺服器位址 | `https://ai.aistargalaxy.com` |
| API Key | Bearer Token | `sk-...` |
| Model | 選擇 AI 模型 | AI 模型 A（推薦） |

> 推薦使用 **AI 模型 A**（qwen 系列），JSON 格式輸出最穩定。

---

## AI 指令範例

| 指令 | 執行動作 |
|------|---------|
| `啟動` | 以當前設定啟動馬達 |
| `停止` | 停止馬達 |
| `1500轉啟動` | 設定 1500 RPM 並啟動 |
| `順時針轉` | 切換為 CW 方向 |
| `左轉30秒後右轉30秒` | 自動序列：CCW 30秒 → CW 30秒 |
| `加速時間設為1000ms` | 設定加速斜率 1000ms |
| `清除故障` | 送出 Alarm Reset 指令 |

### 序列動作格式（AI 自動產生）

```json
{
  "action": "sequence",
  "params": {
    "steps": [
      { "action": "run",  "params": { "dir": "CCW", "rpm": 1500 }, "delay": 0 },
      { "action": "stop", "params": {},                             "delay": 30000 },
      { "action": "run",  "params": { "dir": "CW",  "rpm": 1500 }, "delay": 2000 },
      { "action": "stop", "params": {},                             "delay": 30000 }
    ]
  },
  "reply": "先CCW轉30秒，再CW轉30秒"
}
```

---

## 連線步驟

### USB / COM 埠
1. 點右上角 **🔌 連線**
2. 選擇 **Web Serial (USB / COM 埠)**
3. 選取對應的 COM 埠

### BLE（HM-10）
1. 確認 HM-10 模組已上電
2. 點右上角 **🔌 連線**
3. 選擇 **Web Bluetooth BLE (HM-10)**
4. 配對裝置（LTC8116）

---

## 頁面結構

```
index-local-ai-motor.html
├── 導覽列 (Nav)
│   ├── REC 錄製 / 下載 CSV
│   ├── 📊 分析（離線 CSV 分析）
│   ├── 🔑 AI設定
│   ├── ✨ AI控制（捲動至 AI 輸入框）
│   └── 🔌 連線
├── 主內容 (Main)
│   ├── 左側（75%）
│   │   ├── 即時圖表（雙通道）
│   │   └── 控制面板
│   │       ├── STO 安全狀態
│   │       ├── 主控開關（RUN / STOP / 語音 / 方向）
│   │       ├── 目標轉速（滑桿 + 快捷按鈕）
│   │       └── 加減速設定
│   └── 右側（25%）
│       ├── 馬達狀態
│       ├── ✨ AI 語音控制（嵌入式）
│       ├── 數據監控卡片
│       └── TX/RX Log（可折疊）
└── 登入遮罩
```

---

## 技術架構

- **前端**：純 HTML / Tailwind CSS / Chart.js（無需後端）
- **通訊**：Web Serial API / Web Bluetooth API
- **協議**：Modbus RTU（FC03 讀取 / FC06 寫入，CRC16）
- **AI**：OpenAI 相容 API（Open WebUI / Ollama）
- **認證**：Web Crypto API SHA-256 hash
- **部署**：GitHub Pages（靜態網頁，零伺服器成本）

---

## 版本紀錄

| 版本 | 更新內容 |
|------|---------|
| v1.3 | 記住我登入、語音按鈕優化、手機版面 |
| v1.2 | AI 語音控制內嵌主頁、sequence 執行器、強制 JSON |
| v1.1 | AI 設定模態、Open WebUI API 整合 |
| v1.0 | 基礎馬達控制、Modbus RTU、Web Serial/BLE |

---

## License

Private — All rights reserved © k5star
