import { WHEEL_KEY_FALLBACK, wheelKeyFor } from './wheelKeyFor';

describe('wheelKeyFor', () => {
    // 初始資料 21 個發行（apps/api/seed/discography.json，CR-004）入面幾種碟名 → 字母盤標記
    it.each([
        ['Apollo 18', 'A'],
        ['Beaming', 'B'],
        ['RubberBand Concert #1', 'R'],
        ['Dedicated To…', 'D'],
        ['¿Frank?', 'F'],
        ['We Are RubberBand', 'W'],
        ['i', 'I'],
        ['JUNTOS', 'J'],
        ['電影《逆流大叔》原聲大碟', '電'],
        ['呢度', '呢'],
        ['橡芽', '橡'],
        ['終於好天氣（方皓玟 × RubberBand）', '終'],
    ])('should map %j to %j', (title, expected) => {
        expect(wheelKeyFor(title)).toBe(expected);
    });

    it('should skip leading spaces and punctuation', () => {
        expect(wheelKeyFor('  《木漏日》')).toBe('木');
    });

    it('should keep a leading digit', () => {
        expect(wheelKeyFor('18 Songs')).toBe('1');
    });

    // S-156：有啲字轉大楷之後變幾個字（ﬃ → FFI、ß → SS、ΐ → 3 個 code point）；validator 只收 2 個字
    it.each([
        ['ﬃ Records', 'F'],
        ['ßtraße', 'S'],
        ['ΐ', 'Ι'],
        ['𝒜lpha', '𝒜'],
    ])('should keep the key of %j to one character (%j)', (title, expected) => {
        const key = wheelKeyFor(title);
        expect(key).toBe(expected);
        expect([...key]).toHaveLength(1);
    });

    it.each(['', '   ', '…?!'])('should fall back when %j has no letter or digit', (title) => {
        expect(wheelKeyFor(title)).toBe(WHEEL_KEY_FALLBACK);
    });
});
