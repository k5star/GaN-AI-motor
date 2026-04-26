export const MOTOR_CMD_SCHEMA = {
    version: '1.1',
    actions: {
        run:        { required: ['rpm', 'dir'], rpm: [0, 3000], dir: ['CW', 'CCW'] },
        stop:       { required: [] },
        setSpeed:   { required: ['rpm'],        rpm: [0, 3000] },
        setDir:     { required: ['dir'],                        dir: ['CW', 'CCW'] },
        setAcc:     { required: ['ms'],         ms:  [1, 60000] },
        setDec:     { required: ['ms'],         ms:  [1, 60000] },
        alarmReset: { required: [] },
        query:      { required: ['question'] },
        sequence:   { required: ['steps'] },
        repeat:     { required: ['count', 'steps'], count: [1, 999] },
        none:       { required: [] },
    },
};

export const ACTION_WHITELIST = new Set(Object.keys(MOTOR_CMD_SCHEMA.actions));
