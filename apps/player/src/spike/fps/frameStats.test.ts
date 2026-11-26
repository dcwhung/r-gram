import { formatFrameStats, frameStats } from './frameStats';

const FRAME = 1000 / 60;
const steady = (count: number, step = FRAME) =>
    Array.from({ length: count }, (_, index) => index * step);

describe('frameStats', () => {
    it('should report 60 fps and no dropped frames for a steady 60 Hz run', () => {
        const stats = frameStats(steady(301));
        expect(stats.frames).toBe(300);
        expect(stats.averageFps).toBeCloseTo(60, 5);
        expect(stats.worstMs).toBeCloseTo(FRAME, 5);
        expect(stats.droppedPercent).toBe(0);
    });

    it('should count the frames a long gap swallowed', () => {
        // 10 格正常，之後一格隔咗 4 格咁耐 = 漏咗 3 格
        const times = [...steady(11), 10 * FRAME + 4 * FRAME];
        const stats = frameStats(times);
        expect(stats.frames).toBe(11);
        expect(stats.droppedFrames).toBe(3);
        expect(stats.droppedPercent).toBeCloseTo((3 / 14) * 100, 5);
        expect(stats.worstMs).toBeCloseTo(4 * FRAME, 5);
    });

    it('should not call a 120 Hz frame or a little jitter a dropped frame', () => {
        expect(frameStats(steady(241, FRAME / 2)).droppedFrames).toBe(0);
        expect(frameStats([0, 17, 34, 52, 68]).droppedFrames).toBe(0);
    });

    it('should return zeros with fewer than two timestamps', () => {
        expect(frameStats([5])).toEqual({
            frames: 0,
            durationMs: 0,
            averageFps: 0,
            worstMs: 0,
            droppedFrames: 0,
            droppedPercent: 0,
        });
    });
});

describe('formatFrameStats', () => {
    it('should give one readable line', () => {
        expect(formatFrameStats(frameStats(steady(301)))).toBe(
            '平均 60.0 fps · 最慢一格 16.7 ms · 掉格 0.0%（300 格 / 5.00 秒）',
        );
    });
});
