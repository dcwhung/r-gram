import {
    clampScroll,
    columnMetrics,
    entranceDelays,
    maxScroll,
    releasedRows,
    rowCentre,
} from './columnLayout';

/* 拎住嘅碟嘅歌單欄（純函數；設計稿第 18 版 panelMetrics()、trackPanel()；Functional Spec FR-044） */
const PITCH = 66;
const ROOM = 1320;
const MIN_THUMB = 60;
const LONG = 30;

const metricsAt = (count: number, scroll: number) =>
    columnMetrics({ count, pitch: PITCH, room: ROOM, scroll, minThumb: MIN_THUMB });

describe('columnLayout', () => {
    it('should have nothing to scroll when every row fits', () => {
        expect(maxScroll(20, PITCH, ROOM)).toBe(0);
        expect(maxScroll(0, PITCH, ROOM)).toBe(0);
    });

    it('should scroll by the rows that do not fit', () => {
        expect(maxScroll(LONG, PITCH, ROOM)).toBe(LONG * PITCH - ROOM);
    });

    it('should keep the scroll between 0 and the most it can scroll', () => {
        expect(clampScroll(-5, 100)).toBe(0);
        expect(clampScroll(50, 100)).toBe(50);
        expect(clampScroll(150, 100)).toBe(100);
        expect(clampScroll(30, 0)).toBe(0);
    });

    it('should place each row in the middle of its pitch, moved up by the scroll', () => {
        expect(rowCentre(0, PITCH, 0)).toBe(PITCH / 2);
        expect(rowCentre(2, PITCH, 0)).toBe(PITCH * 2.5);
        expect(rowCentre(2, PITCH, PITCH)).toBe(PITCH * 1.5);
    });

    it('should fade nothing and show no bar when every row fits', () => {
        expect(metricsAt(10, 0)).toEqual({
            maxScroll: 0,
            scroll: 0,
            fadeTop: false,
            fadeBottom: false,
            bar: null,
        });
    });

    it('should fade the bottom only at the top of a long list', () => {
        const metrics = metricsAt(LONG, 0);
        expect([metrics.fadeTop, metrics.fadeBottom]).toEqual([false, true]);
        expect(metrics.bar).toEqual({ length: (ROOM * ROOM) / (LONG * PITCH), offset: 0 });
    });

    it('should fade both ends in the middle and move the bar with the scroll', () => {
        const metrics = metricsAt(LONG, maxScroll(LONG, PITCH, ROOM) / 2);
        expect([metrics.fadeTop, metrics.fadeBottom]).toEqual([true, true]);
        const length = (ROOM * ROOM) / (LONG * PITCH);
        expect(metrics.bar?.offset).toBeCloseTo((ROOM - length) / 2);
    });

    it('should fade only the top at the end and clamp a scroll past the end', () => {
        const metrics = metricsAt(LONG, Number.MAX_SAFE_INTEGER);
        expect(metrics.scroll).toBe(metrics.maxScroll);
        expect([metrics.fadeTop, metrics.fadeBottom]).toEqual([true, false]);
        expect(metrics.bar?.offset).toBeCloseTo(ROOM - (metrics.bar?.length ?? 0));
    });

    it('should never make the bar shorter than the minimum', () => {
        expect(metricsAt(1000, 0).bar?.length).toBe(MIN_THUMB);
    });

    /*
     * 設計稿第 19 版 trackPanel()：欄入面見到嘅行（連頭尾各多一行）由上至下逐行出發；每行遲 stagger，
     * 行多就縮短，成欄攤開唔超過 spread。欄外嘅行唔使飄
     */
    it('should stagger the visible rows of the entrance within the spread', () => {
        const timing = { staggerMs: 60, spreadMs: 560 };
        expect(entranceDelays(3, PITCH, ROOM, timing)).toEqual([0, 60, 120]);
        const many = entranceDelays(40, PITCH, ROOM, timing);
        const step = Math.min(60, 560 / Math.ceil(ROOM / PITCH));
        // 中線喺欄底之下一行之內都算（設計稿 y > top + room + pitch 先唔畫）
        const last = Math.floor(ROOM / PITCH + 0.5);
        expect(many[1]).toBeCloseTo(step);
        expect(many[last]).toBeCloseTo(last * step);
        expect(many[last + 1]).toBeNull();
        expect(many).toHaveLength(40);
    });

    /* 鬆手（B-086 ⑤）：欄底由 openRoom 縮到 idleRoom，讓出嚟（idleRoom − fade 之下、openRoom 之內）嗰幾行原地淡出 */
    it('should pick the rows given up when the column gets shorter', () => {
        const rows = releasedRows(30, {
            pitch: 66,
            scroll: 0,
            idleRoom: 960,
            openRoom: 1140,
            fade: 100,
        });
        const centres = rows.map((index) => 66 * (index + 0.5));
        expect(centres.every((y) => y > 860 && y <= 1140)).toBe(true);
        expect(rows).toEqual([13, 14, 15, 16]);
        expect(
            releasedRows(3, { pitch: 66, scroll: 0, idleRoom: 960, openRoom: 1140, fade: 100 }),
        ).toEqual([]);
    });
});
