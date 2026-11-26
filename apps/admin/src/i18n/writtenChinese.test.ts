import { zhHant } from './zh-Hant';

/*
 * 介面文字一律書面語（Functional Spec FR-037）：掃晒語言檔每一句，見到廣東話口語字就 fail（同播放端一樣嘅字表）
 */
const COLLOQUIAL =
    /[嘅咗唔喺嚟啲佢冇睇嗰咁啱俾畀嘢揾搵乜咩撳㩒㗎囉嘞噉哋諗攞]|而家|點解|幾時|邊度/u;

const strings = (value: unknown, path: string): [string, string][] => {
    if (typeof value === 'string') return [[path, value]];
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
    return [];
};

describe('admin copy', () => {
    it('should use written Chinese only (no Cantonese colloquial characters)', () => {
        const colloquial = strings(zhHant, 'zhHant').filter(([, text]) => COLLOQUIAL.test(text));
        expect(colloquial).toEqual([]);
    });

    it('should not contain empty messages', () => {
        expect(strings(zhHant, 'zhHant').filter(([, text]) => text.trim() === '')).toEqual([]);
    });
});
