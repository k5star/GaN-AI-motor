export default {
    id:   'generic',
    name: '未知驅動器（通用設定）',
    version: '1.0',

    limits: { maxRpm: 3000, minRpm: 0, maxAccMs: 60000, maxDecMs: 60000 },

    fingerprint: {}, // no fingerprint — always lowest priority

    registerMap: {
        NET_IO:   '0x1400',
        SPD_RAM0: '0x0300',
        ACC_RAM0: '0x0400',
        DEC_RAM0: '0x0408',
        ALM_RST:  '0x0A00',
    },

    paramGroups: [],
};
