/* Worker 出嘅頁面文字：書面語，唔可以有口語字（FR-037；同管理端 / 播放端嘅 writtenChinese.test 同一張字表） */
import { zhHant } from '../src/i18n/zh-Hant';

const COLLOQUIAL = /[嘅咗唔喺嚟啲佢冇睇嗰咁啱俾嘢揾搵乜咩撳㩒㗎囉嘞噉]/u;

const stringsOf = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : Object.values(value as object).flatMap(stringsOf);

describe('zh-Hant page text', () => {
    it('should cover the three auth pages', () => {
        expect(Object.keys(zhHant.auth)).toEqual(['denied', 'loginExpired', 'loginFailed']);
        expect(stringsOf(zhHant).length).toBeGreaterThanOrEqual(9);
    });

    it('should be written Chinese without colloquial characters', () => {
        for (const text of stringsOf(zhHant)) expect(text, text).not.toMatch(COLLOQUIAL);
    });

    it('should word the no-permission page as specified', () => {
        expect(zhHant.auth.denied.title).toBe('沒有權限');
        expect(zhHant.auth.denied.message).toBe('此帳戶沒有管理權限。');
    });
});
