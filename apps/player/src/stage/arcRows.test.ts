import { arcRowPitch, arcRows, arcRowSpec } from './arcRows';
import { PHONE_LAYOUT } from './layouts/phone';

/*
 * 期望值用設計稿第 18 版 listLayer() 嘅公式（polar(DISC, LIST.r, 180 − k × LIST.step)、
 * fade = max(0.06, (1 − |k| ÷ 4.3)^1.5 × (揀中 ? 1 : 0.62) × (未有音檔 ? 0.5 : 1))）另外計好：
 * 碟心 (940, 1196)、半徑 556、每行 9.2°。行嘅感應範圍上下邊 = 前後半行（k ± 0.5）嘅高度
 */
const spec = arcRowSpec(PHONE_LAYOUT);
const none = () => false;
const close = (value: number | undefined, expected: number) =>
    expect(value).toBeCloseTo(expected, 2);

describe('arcRows', () => {
    it('should put the focused row in the frame at 180°, full size and fully shown', () => {
        const row = arcRows(12, 6, spec, none).find(({ index }) => index === 6);
        expect(row).toMatchObject({ y: 1196, size: 42, opacity: 1, near: 1 });
        close(row?.x, 384);
        close(row?.top, 1151.409);
        close(row?.bottom, 1240.591);
    });

    it('should place the next row one step further round the arc, smaller and fainter', () => {
        const row = arcRows(12, 6, spec, none).find(({ index }) => index === 7);
        close(row?.x, 391.152);
        close(row?.y, 1284.894);
        expect(row?.size).toBe(32);
        expect(row?.near).toBe(0);
        expect(row?.opacity).toBeCloseTo(0.4168, 3);
        close(row?.top, 1240.591);
        close(row?.bottom, 1328.625);
    });

    it('should halve rows without audio and never go below the faintest level', () => {
        const rows = arcRows(12, 6, spec, (index) => index === 3);
        const off = rows.find(({ index }) => index === 3);
        close(off?.x, 447.271);
        close(off?.y, 938.407);
        expect(off?.opacity).toBe(0.06);
        expect(rows.find(({ index }) => index === 10)?.opacity).toBe(0.06);
        const half = arcRows(12, 6, spec, (index) => index === 7).find((row) => row.index === 7);
        expect(half?.opacity).toBeCloseTo(0.2084, 3);
    });

    it('should only return the rows within the visible span, in order', () => {
        expect(arcRows(12, 6, spec, none).map(({ index }) => index)).toEqual([
            2, 3, 4, 5, 6, 7, 8, 9, 10,
        ]);
        expect(arcRows(3, 0, spec, none).map(({ index }) => index)).toEqual([0, 1, 2]);
        expect(arcRows(0, 0, spec, none)).toEqual([]);
    });

    // 捲動中途（設計稿 v16 drawList()：字級同淡出按離中心幾近線性過渡）；停喺整數時同第 18 版一樣
    it('should blend size and fade between rows while scrolling', () => {
        const rows = arcRows(12, 6.5, spec, none);
        const [six, seven] = [6, 7].map((index) => rows.find((row) => row.index === index));
        close(six?.x, 385.791);
        close(six?.y, 1151.409);
        close(seven?.y, 1240.591);
        expect(six?.size).toBe(37);
        expect(six?.near).toBe(0.5);
        expect(six?.opacity).toBeCloseTo(0.6729, 3);
    });

    it('should move one row per arc length of one step', () => {
        expect(arcRowPitch(spec)).toBeCloseTo(89.277, 2);
    });
});
