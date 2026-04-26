export const SLAVE_ID = 1;

export const REG = {
    NET_IO:   0x1400,
    SPD_RAM0: 0x0300, SPD_RAM1: 0x0301, SPD_RAM2: 0x0302, SPD_RAM3: 0x0303,
    ACC_RAM0: 0x0400,
    DEC_RAM0: 0x0408,
    ALM_RST:  0x0A00,
    CFG_CMD:  0x0A27,
};

export const BIT = {
    START_STOP: 0x01,
    CCW_CW:     0x02,
    ALM_RST:    0x04,
};

// 參數地址計算公式: group * 0x0100 + (param - 1)
export function calcParamAddr(group, param) {
    return (group * 0x0100) + (param - 1);
}

// 連線後自動掃描的群組清單
export const SCAN_GROUPS = [
    { group: 0x00, name: '監控資料',  startAddr: 0x0000, qty: 16 },
    { group: 0x01, name: '基本設定',  startAddr: 0x0100, qty: 16 },
    { group: 0x03, name: '轉速設定',  startAddr: 0x0300, qty: 16 },
    { group: 0x04, name: '加減速',    startAddr: 0x0400, qty: 16 },
    { group: 0x08, name: 'DI/DO',    startAddr: 0x0800, qty: 16 },
    { group: 0x0A, name: '通訊設定',  startAddr: 0x0A00, qty: 16 },
    { group: 0x14, name: 'NET-IO',   startAddr: 0x1400, qty: 4  },
];

export const MOTOR_STATUS_MAP = {
    0: { txt: 'STOP',     icon: '⬛', clr: 'text-slate-400' },
    2: { txt: 'RUN',      icon: '🟢', clr: 'text-emerald-400' },
    3: { txt: 'EBRAKE',   icon: '🟠', clr: 'text-orange-400' },
    4: { txt: 'FREE',     icon: '⚪', clr: 'text-slate-400' },
    5: { txt: 'FAULT',    icon: '🔴', clr: 'text-red-400' },
    6: { txt: 'INHIBIT',  icon: '🟡', clr: 'text-yellow-400' },
    7: { txt: 'SERVO-ON', icon: '🟣', clr: 'text-purple-400' },
    8: { txt: 'POS-KEEP', icon: '🔵', clr: 'text-blue-400' },
};

export const MONITOR_DATA_CONFIG = [
    { id: 'D00', addr: 0x0000, name: '馬達狀態',  unit: '',    scale: 1,    note: '0=STOP 2=RUN 5=FAULT' },
    { id: 'D01', addr: 0x0001, name: '指令轉速',  unit: 'RPM', scale: 1,    note: '' },
    { id: 'D02', addr: 0x0002, name: '實際轉速',  unit: 'RPM', scale: 1,    note: '' },
    { id: 'D03', addr: 0x0003, name: 'Alarm No.', unit: '',    scale: 1,    note: '' },
    { id: 'D04', addr: 0x0004, name: '轉向',      unit: '',    scale: 1,    note: '0=CW 1=CCW' },
    { id: 'D05', addr: 0x0005, name: '目標轉速',  unit: 'RPM', scale: 1,    note: '' },
    { id: 'D06', addr: 0x0006, name: '保留',      unit: '',    scale: 1,    note: '' },
    { id: 'D07', addr: 0x0007, name: '輸出功率',  unit: 'W',   scale: 1,    note: '' },
    { id: 'D08', addr: 0x0008, name: 'I/O 狀態', unit: 'bit', scale: 1,    note: '' },
    { id: 'D09', addr: 0x0009, name: 'BUS 電壓', unit: 'V',   scale: 0.01, note: '' },
    { id: 'D10', addr: 0x000A, name: '保留',      unit: '',    scale: 1,    note: '' },
    { id: 'D11', addr: 0x000B, name: '輸出Duty', unit: '%',   scale: 0.1,  note: '' },
    { id: 'D12', addr: 0x000C, name: '輸出電流', unit: 'A',   scale: 0.01, note: '' },
    { id: 'D13', addr: 0x000D, name: '保留',      unit: '',    scale: 1,    note: '' },
    { id: 'D14', addr: 0x000E, name: '保留',      unit: '',    scale: 1,    note: '' },
    { id: 'D15', addr: 0x000F, name: '保留',      unit: '',    scale: 1,    note: '' },
];
