import { PHONE_LAYOUT } from '../stage/layouts';
import { plainColumn, plainRows } from './plainColumn';

/** 全形空格（一行歌詞入面分隔幾句） */
const SP = '\u3000';

const perChar = (text: string, size: number) => [...text].length * size;
const PH = (count: number) => '歌詞佔位文字'.repeat(20).slice(0, count);

/* 設計稿第 17 版 PLAIN_LAYOUT = { x: 230, right: 808, top: 690, bottom: 1650, size: 30 }、PLAIN.pitch 1.45 */
describe('plainColumn', () => {
    it('should place the column right of the small buttons and stop before the spindle', () => {
        expect(plainColumn(PHONE_LAYOUT, 0)).toEqual({
            x: 230,
            right: 940 - 700 * 0.16 - 20,
            top: 690,
            bottom: 1650,
            size: 30,
            pitch: 30 * 1.45,
        });
    });

    // 高身手機：頂跟貼頂組、底跟貼底組，多出嚟嘅高度畀歌詞欄
    it('should give the extra height of a tall phone to the column', () => {
        const tall = plainColumn(PHONE_LAYOUT, 166);
        expect(tall.top).toBe(690);
        expect(tall.bottom).toBe(1650 + 166);
    });
});

describe('plainRows', () => {
    // 欄闊 578 = 19 個 30 號字；續列縮入一個字
    it('should wrap each line and keep the blank lines as paragraph breaks', () => {
        const verse = `${PH(7)}${SP}${PH(6)}${SP}${PH(10)}`;
        const rows = plainRows(
            [{ text: verse }, { text: '' }, { text: PH(5) }],
            PHONE_LAYOUT,
            perChar,
        );
        expect(rows).toEqual([
            { text: `${PH(7)}${SP}${PH(6)}`, indent: 0 },
            { text: PH(10), indent: 30 },
            { text: '', indent: 0 },
            { text: PH(5), indent: 0 },
        ]);
    });
});
