/* 語言檔句子嘅 `{name}` 參數 */
import { fillMessage } from '../src/i18n/fillMessage';

describe('fillMessage', () => {
    it('should replace every placeholder that has a parameter', () => {
        expect(fillMessage('最多 {max} 個字元，至少 {min} 個', { max: 64, min: '1' })).toBe(
            '最多 64 個字元，至少 1 個',
        );
    });

    it('should keep a placeholder without a parameter and leave plain text alone', () => {
        expect(fillMessage('最多 {max} 個字元')).toBe('最多 {max} 個字元');
        expect(fillMessage('必須填寫。', { max: 1 })).toBe('必須填寫。');
    });
});
