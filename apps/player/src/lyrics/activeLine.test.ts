import { activeLine, BEFORE_FIRST_LINE } from './activeLine';

const lines = [0, 2000, 2000, 5500, 9000].map((t) => ({ t }));

/* Technical Spec 實現注意事項 8：`activeLine(lines, ms)` 係 binary search */
describe('activeLine', () => {
    it('should find the last line that has started', () => {
        expect(activeLine(lines, 0)).toBe(0);
        expect(activeLine(lines, 1999)).toBe(0);
        expect(activeLine(lines, 5499)).toBe(2);
        expect(activeLine(lines, 5500)).toBe(3);
        expect(activeLine(lines, 600_000)).toBe(4);
    });

    // 同一個時間有兩行（LRC 一行多個時間標記拆出嚟）：用後面嗰行
    it('should take the later of two lines with the same time', () => {
        expect(activeLine(lines, 2000)).toBe(2);
    });

    it('should be before the first line until it starts', () => {
        const late = [{ t: 12_300 }, { t: 16_800 }];
        expect(activeLine(late, 12_299)).toBe(BEFORE_FIRST_LINE);
        expect(activeLine([], 1000)).toBe(BEFORE_FIRST_LINE);
    });

    it('should cope with a long song', () => {
        const many = Array.from({ length: 1000 }, (_, i) => ({ t: i * 3000 }));
        expect(activeLine(many, 1_500_001)).toBe(500);
    });
});
