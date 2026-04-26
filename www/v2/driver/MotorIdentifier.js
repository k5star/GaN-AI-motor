import { bus } from '../core/EventBus.js';

export class MotorIdentifier {
    constructor(profiles) {
        // profiles sorted: generic last
        this._profiles = [...profiles].sort((a, b) =>
            Object.keys(b.fingerprint).length - Object.keys(a.fingerprint).length
        );
    }

    identify(scanResult) {
        // Build flat map: '0xADDR' → raw value
        const flat = this._flatten(scanResult.groups);

        let best = null;
        let bestScore = -1;

        for (const profile of this._profiles) {
            if (profile.id === 'generic') continue;
            const { score, matchedKeys, warnings } = this._score(profile.fingerprint, flat);
            if (score > bestScore) {
                bestScore = score;
                best = { profile, score, matchedKeys, warnings };
            }
        }

        const generic = this._profiles.find(p => p.id === 'generic');

        // Require confidence > 0.6 to accept non-generic
        if (best && bestScore >= 0.6) {
            const result = {
                modelId:    best.profile.id,
                profile:    best.profile,
                confidence: bestScore,
                matchedKeys: best.matchedKeys,
                warnings:   best.warnings,
            };
            bus.emit('identifier:detected', result);
            bus.emit('ui:log', {
                type: 'SYS',
                msg: `識別型號: ${best.profile.name} (信心度 ${(bestScore * 100).toFixed(0)}%)`,
                clr: bestScore >= 0.8 ? 'text-emerald-400' : 'text-amber-400',
            });
            return result;
        }

        const fallback = {
            modelId: 'generic', profile: generic,
            confidence: 0, matchedKeys: [], warnings: ['無法識別型號，使用通用設定'],
        };
        bus.emit('identifier:detected', fallback);
        bus.emit('ui:log', { type: 'WARN', msg: '型號未識別，使用通用設定', clr: 'text-amber-400' });
        return fallback;
    }

    _flatten(groups) {
        const flat = {};
        for (const grp of Object.values(groups)) {
            if (!Array.isArray(grp.values)) continue;
            grp.values.forEach((v, i) => {
                if (v === null) return;
                const addr = grp.startAddr + i;
                flat[`0x${addr.toString(16).toUpperCase().padStart(4,'0')}`] = v;
            });
        }
        return flat;
    }

    _score(fingerprint, flat) {
        let totalWeight = 0;
        let earnedWeight = 0;
        const matchedKeys = [];
        const warnings = [];

        for (const [addrKey, rule] of Object.entries(fingerprint)) {
            const w = rule.weight ?? 1;
            totalWeight += w;
            const key = addrKey.toUpperCase().replace('0X', '0x');
            const v = flat[key];
            if (v === undefined) { warnings.push(`${addrKey} 未讀取到`); continue; }

            let match = false;
            if (rule.expectValue !== undefined) {
                match = Math.abs(v - rule.expectValue) <= (rule.tolerance ?? 0);
            } else if (rule.expectMin !== undefined) {
                match = v >= rule.expectMin && v <= rule.expectMax;
            }

            if (match) { earnedWeight += w; matchedKeys.push(addrKey); }
        }

        const score = totalWeight > 0 ? earnedWeight / totalWeight : 0;
        return { score, matchedKeys, warnings };
    }
}
