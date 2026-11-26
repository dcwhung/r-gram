import { arcRing, arcRowPitch, arcRowSpec, loopWindow } from './arcRows';
import { PHONE_LAYOUT } from './layouts/phone';

/*
 * 期望值用設計稿第 18 版 listLayer() 嘅公式（polar(DISC, LIST.r, 180 − k × LIST.step)、
 * fade = max(0.06, (1 − |k| ÷ 4.3)^1.5 × (揀中 ? 1 : 0.62) × (未有音檔 ? 0.5 : 1))）另外計好：
 * 碟心 (940, 1196)、半徑 556、每行 9.2°。行嘅感應範圍上下邊 = 前後半行（k ± 0.5）嘅高度
 */
const spec = arcRowSpec(PHONE_LAYOUT);
const none = () => false;
/** 見到嘅行（由上到下） */
const arcRows = (count: number, offset: number, isOff: (index: number) => boolean = none) =>
    arcRing(count, offset, spec, isOff).rows;
const close = (value: number | undefined, expected: number) =>
    expect(value).toBeCloseTo(expected, 2);

describe('arcRows', () => {
    it('should put the focused row in the frame at 180°, full size and fully shown', () => {
        const row = arcRows(12, 6).find(({ index }) => index === 6);
        expect(row).toMatchObject({ y: 1196, size: 42, opacity: 1, near: 1 });
        close(row?.x, 384);
        close(row?.top, 1151.409);
        close(row?.bottom, 1240.591);
    });

    it('should place the next row one step further round the arc, smaller and fainter', () => {
        const row = arcRows(12, 6).find(({ index }) => index === 7);
        close(row?.x, 391.152);
        close(row?.y, 1284.894);
        expect(row?.size).toBe(32);
        expect(row?.near).toBe(0);
        expect(row?.opacity).toBeCloseTo(0.4168, 3);
        close(row?.top, 1240.591);
        close(row?.bottom, 1328.625);
    });

    it('should halve rows without audio and never go below the faintest level', () => {
        const rows = arcRows(12, 6, (index) => index === 3);
        const off = rows.find(({ index }) => index === 3);
        close(off?.x, 447.271);
        close(off?.y, 938.407);
        expect(off?.opacity).toBe(0.06);
        expect(rows.find(({ index }) => index === 10)?.opacity).toBe(0.06);
        const half = arcRows(12, 6, (index) => index === 7).find((row) => row.index === 7);
        expect(half?.opacity).toBeCloseTo(0.2084, 3);
    });

    it('should only return the rows within the visible span, in order', () => {
        expect(arcRows(12, 6).map(({ index }) => index)).toEqual([
            2, 3, 4, 5, 6, 7, 8, 9, 10,
        ]);
        expect(arcRows(3, 0).map(({ index }) => index)).toEqual([0, 1, 2]);
        expect(arcRows(0, 0)).toEqual([]);
    });

    // 捲動中途（設計稿 v16 drawList()：字級同淡出按離中心幾近線性過渡）；停喺整數時同第 18 版一樣
    it('should blend size and fade between rows while scrolling', () => {
        const rows = arcRows(12, 6.5);
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

/*
 * 設計稿第 20 版「弧線歌單頭尾相接」（LIST_LOOP、loopWindow()、listLayer()）：圈 = 全部歌 + 一格接駁位（最後一首之後）。
 * 每首歌同一時間只出現一次：框上面 min(4, floor(N ÷ 2)) 行、下面 min(4, N − 上面)；接駁位淡出得比歌名慢，最淡 0.45
 */
describe('arcRing', () => {
    const indexes = (count: number, offset: number) =>
        arcRing(count, offset, spec, none).rows.map(({ index }) => index);
    const seamOpacity = (k: number) => 0.45 + 0.55 * (1 - Math.abs(k) / 4.3);

    it.each([
        [0, 0, 0],
        [1, 0, 1],
        [2, 1, 1],
        [3, 1, 2],
        [9, 4, 4],
        [30, 4, 4],
    ])('should show each of %d tracks at most once (%d above, %d below)', (count, above, below) => {
        expect(loopWindow(count, 4)).toEqual({ above, below });
    });

    it('should put the seam and the last tracks above the first track', () => {
        const { rows, seam } = arcRing(12, 0, spec, none);
        expect(rows.map(({ index }) => index)).toEqual([9, 10, 11, 0, 1, 2, 3, 4]);
        expect(rows.filter(({ wrapped }) => wrapped).map(({ index }) => index)).toEqual([
            9, 10, 11,
        ]);
        close(seam?.x, 391.152);
        close(seam?.y, 1107.106);
        close(seam?.top, 1063.375);
        close(seam?.bottom, 1151.409);
        expect(seam?.opacity).toBeCloseTo(seamOpacity(1), 3);
    });

    it('should put the seam and then the first tracks below the last track', () => {
        const { rows, seam } = arcRing(12, 11, spec, none);
        expect(rows.map(({ index }) => index)).toEqual([7, 8, 9, 10, 11, 0, 1, 2]);
        expect(rows.filter(({ wrapped }) => wrapped).map(({ index }) => index)).toEqual([0, 1, 2]);
        close(seam?.y, 1284.894);
    });

    it('should show only the seam above the first of three tracks', () => {
        const { rows, seam } = arcRing(3, 0, spec, none);
        expect(rows.map(({ index }) => index)).toEqual([0, 1, 2]);
        expect(rows.some(({ wrapped }) => wrapped)).toBe(false);
        close(seam?.y, 1107.106);
    });

    it('should show a single track with the seam under it, and nothing for no tracks', () => {
        const single = arcRing(1, 0, spec, none);
        expect(single.rows.map(({ index }) => index)).toEqual([0]);
        close(single.seam?.y, 1284.894);
        expect(indexes(2, 0)).toEqual([0, 1]);
        expect(arcRing(0, 0, spec, none)).toEqual({ rows: [], seam: null });
    });

    it('should leave the seam out when it is too far from the frame', () => {
        expect(arcRing(30, 15, spec, none).seam).toBeNull();
        expect(indexes(30, 15)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
    });

    // 捲緊經過接駁位：位置可以係圈上任何一點（負數、超過一圈都摺返）
    it('should follow a scroll across the seam, wherever the offset is on the ring', () => {
        const { rows, seam } = arcRing(12, 12.6, spec, none);
        expect(seam?.opacity).toBeCloseTo(seamOpacity(0.6), 3);
        expect(rows.find(({ index }) => index === 0)?.near).toBeCloseTo(0.6);
        expect(arcRing(12, -0.4, spec, none)).toEqual(arcRing(12, 12.6, spec, none));
        expect(arcRing(12, 13 * 3 + 2, spec, none)).toEqual(arcRing(12, 2, spec, none));
    });

    it('should never draw a track or the seam twice, at any offset', () => {
        for (const count of [1, 2, 3, 9, 30]) {
            for (let tenth = -20; tenth <= (count + 1) * 10; tenth += 1) {
                const shown = indexes(count, tenth / 10);
                expect(new Set(shown).size).toBe(shown.length);
            }
        }
    });

    it('should fade the seam more slowly than the titles and never below 0.45', () => {
        const far = arcRing(9, 5, spec, none);
        expect(far.seam?.opacity).toBeCloseTo(seamOpacity(4), 3);
        const lowest = Math.min(...far.rows.map(({ opacity }) => opacity));
        expect(far.seam?.opacity ?? 0).toBeGreaterThan(lowest);
        expect(far.seam?.opacity ?? 0).toBeGreaterThanOrEqual(0.45);
    });
});
