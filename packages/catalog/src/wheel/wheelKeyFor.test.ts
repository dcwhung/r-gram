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

    it.each(['', '   ', '…?!'])('should fall back when %j has no letter or digit', (title) => {
        expect(wheelKeyFor(title)).toBe(WHEEL_KEY_FALLBACK);
    });
});
