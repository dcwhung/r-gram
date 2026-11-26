import { PHONE_LAYOUT } from '../../stage/layouts';
import { stackOffset, stackSlots } from './stackOrder';

const { shown } = PHONE_LAYOUT.orbit;
/** 畫邊幾隻碟（由底到頂）：[第幾隻, 離而家隻碟幾遠] */
const slots = (count: number, current: number) =>
    stackSlots(count, current, shown).map(({ index, offset }) => [index, offset]);

/*
 * T-110 設計稿第 20 版 stackOffset()、STACK_LOOP、discs()：碟疊頭尾相接，前面一隻、其餘喺後面；
 * 按離而家隻碟幾遠由底畫到頂（下一隻永遠疊喺而家隻碟上面）。見到 −1 至 2，再多畫入嚟同出去嗰隻（透明）
 */
describe('stackOffset', () => {
    it.each([
        [5, 5, 22, 0],
        [6, 5, 22, 1],
        [4, 5, 22, -1],
        [3, 5, 22, 20],
        [0, 21, 22, 1],
        [1, 21, 22, 2],
        [21, 0, 22, -1],
        [0, 0, 1, 0],
    ])(
        'should put disc %d at the offset of the ring from disc %d (%d discs): %d',
        (index, current, count, offset) => {
            expect(stackOffset(index, current, count)).toBe(offset);
        },
    );
});

describe('stackSlots', () => {
    it('should draw the discs around the current one, the next one on top', () => {
        expect(slots(22, 10)).toEqual([
            [8, -2],
            [9, -1],
            [10, 0],
            [11, 1],
            [12, 2],
            [13, 3],
        ]);
    });

    it('should bring the first discs in after ♥', () => {
        expect(slots(22, 21)).toEqual([
            [19, -2],
            [20, -1],
            [21, 0],
            [0, 1],
            [1, 2],
            [2, 3],
        ]);
    });

    it('should put ♥ before the first disc', () => {
        expect(slots(22, 0)).toEqual([
            [20, -2],
            [21, -1],
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
        ]);
    });

    it('should draw every disc once when there are only a few', () => {
        expect(slots(1, 0)).toEqual([[0, 0]]);
        expect(slots(3, 0)).toEqual([
            [2, -1],
            [0, 0],
            [1, 1],
        ]);
        expect(slots(5, 0)).toEqual([
            [4, -1],
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
        ]);
        expect(slots(6, 0).map(([index]) => index)).toEqual([4, 5, 0, 1, 2, 3]);
        expect(slots(0, 0)).toEqual([]);
    });

    // W-037：一格一格轉時，留低嘅碟喺 DOM 入面嘅先後唔變（React 唔使搬佢哋，CSS 過場唔會冇咗）
    it('should keep the order of the discs that stay when turning one step, round the ring', () => {
        const count = 22;
        const order = (current: number) => slots(count, current).map(([index]) => index);
        for (let current = 0; current < count; current += 1) {
            const next = (current + 1) % count;
            const before = order(current);
            const after = order(next);
            const staying = before.filter((index) => after.includes(index));
            expect(after.filter((index) => staying.includes(index))).toEqual(staying);
        }
    });
});
