import { nextRowIndex, stepRowIndex } from './rowStep';

/* 歌單欄（T-049）同弧線歌單（T-037）共用：鍵盤、滾輪喺播得嘅行之間移，灰色行跳過 */
describe('rowStep', () => {
    const playable = [0, 2, 3, 7];

    it('should step to the nearest playable row in the direction of travel', () => {
        expect(stepRowIndex(0, 1, playable)).toBe(2);
        expect(stepRowIndex(3, 2, playable)).toBe(7);
        expect(stepRowIndex(7, -2, playable)).toBe(3);
        expect(stepRowIndex(2, -1, playable)).toBe(0);
    });

    it('should stop at the last or first playable row at either end', () => {
        expect(stepRowIndex(7, 4, playable)).toBe(7);
        expect(stepRowIndex(0, -4, playable)).toBe(0);
        expect(stepRowIndex(1, 1, [])).toBeNull();
        expect(stepRowIndex(1, -1, [])).toBeNull();
    });

    it('should turn the arrow, page, home and end keys into rows and ignore other keys', () => {
        expect(nextRowIndex('ArrowDown', 0, playable, 4)).toBe(2);
        expect(nextRowIndex('ArrowUp', 3, playable, 4)).toBe(2);
        expect(nextRowIndex('PageDown', 0, playable, 4)).toBe(7);
        expect(nextRowIndex('PageUp', 7, playable, 4)).toBe(3);
        expect(nextRowIndex('Home', 7, playable, 4)).toBe(0);
        expect(nextRowIndex('End', 0, playable, 4)).toBe(7);
        expect(nextRowIndex('Home', 0, [], 4)).toBeNull();
        expect(nextRowIndex('End', 0, [], 4)).toBeNull();
        expect(nextRowIndex('Enter', 0, playable, 4)).toBeNull();
        expect(nextRowIndex('toString', 0, playable, 4)).toBeNull();
    });
});
