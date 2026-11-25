import { zhHant } from './zh-Hant';

/*
 * 介面文字一律書面語（Functional Spec FR-037）：掃晒語言檔每一句，見到廣東話口語字就 fail。
 * 只掃語言檔：歌名、歌詞係資料，可以有口語字。
 */
const COLLOQUIAL = /[嘅咗唔喺嚟啲佢冇睇嗰咁啱俾嘢揾搵乜咩撳㩒㗎囉嘞噉]/u;

const strings = (value: unknown, path: string): [string, string][] => {
    if (typeof value === 'string') return [[path, value]];
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
    return [];
};

describe('player copy', () => {
    it('should use written Chinese only (no Cantonese colloquial characters)', () => {
        const colloquial = strings(zhHant, 'zhHant').filter(([, text]) => COLLOQUIAL.test(text));
        expect(colloquial).toEqual([]);
    });

    it('should not contain empty messages', () => {
        expect(strings(zhHant, 'zhHant').filter(([, text]) => text.trim() === '')).toEqual([]);
    });
});
