import { clampScroll, columnMetrics, maxScroll, rowCentre, scrollToShow } from './columnLayout';

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

    it('should scroll just enough to show a focused row', () => {
        expect(scrollToShow(0, PITCH, ROOM, 0)).toBe(0);
        expect(scrollToShow(25, PITCH, ROOM, 0)).toBe(26 * PITCH - ROOM);
        expect(scrollToShow(3, PITCH, ROOM, 5 * PITCH)).toBe(3 * PITCH);
        expect(scrollToShow(4, PITCH, ROOM, 2 * PITCH)).toBe(2 * PITCH);
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
});
