export default {
    id:   'LTC8116',
    name: 'LTC8116 GaN 驅動器',
    version: '1.0',

    limits: { maxRpm: 3000, minRpm: 0, maxAccMs: 60000, maxDecMs: 60000 },

    // fingerprint: 比對掃描結果，加分制識別
    fingerprint: {
        // 通訊設定 group 0x0A: 第一個暫存器通常為通訊地址 = 1
        '0x0A00': { expectValue: 1, tolerance: 0, weight: 0.3 },
        // 轉速設定 group 0x03: SPD_RAM0 應在 0~3000 範圍內
        '0x0300': { expectMin: 0, expectMax: 3000, weight: 0.3 },
        // 加速時間 group 0x04: 通常 > 0
        '0x0400': { expectMin: 1, expectMax: 60000, weight: 0.2 },
        // NET-IO group 0x14: 應可讀
        '0x1400': { expectMin: 0, expectMax: 255, weight: 0.2 },
    },

    registerMap: {
        NET_IO:   '0x1400',
        SPD_RAM0: '0x0300',
        SPD_RAM1: '0x0301',
        SPD_RAM2: '0x0302',
        SPD_RAM3: '0x0303',
        ACC_RAM0: '0x0400',
        DEC_RAM0: '0x0408',
        ALM_RST:  '0x0A00',
    },

    paramGroups: [
        {
            group: 1, name: '基本設定',
            params: [
                { param: 12, addr: '0x010B', name: 'OP Mode', unit: '', range: [0, 7], default: 0,
                  options: ['AOX','Digital','XHO_PFM','XHO_PWM','Multi-Drive','類比油門','脈波油門','AOX/Digital'] },
            ],
        },
        {
            group: 3, name: '轉速設定',
            params: [
                { param: 1, addr: '0x0300', name: '數位轉速第0段', unit: 'RPM', range: [0, 3000], default: 0 },
                { param: 2, addr: '0x0301', name: '數位轉速第1段', unit: 'RPM', range: [0, 3000], default: 0 },
                { param: 3, addr: '0x0302', name: '數位轉速第2段', unit: 'RPM', range: [0, 3000], default: 0 },
                { param: 4, addr: '0x0303', name: '數位轉速第3段', unit: 'RPM', range: [0, 3000], default: 0 },
            ],
        },
        {
            group: 4, name: '加減速',
            params: [
                { param: 1, addr: '0x0400', name: '加速時間', unit: 'ms', range: [1, 60000], default: 2000 },
                { param: 9, addr: '0x0408', name: '減速時間', unit: 'ms', range: [1, 60000], default: 2000 },
            ],
        },
    ],
};
