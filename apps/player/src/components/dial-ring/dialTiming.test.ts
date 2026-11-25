import { MOTION } from '../../config/motion';
import { dialKeyDelayMs } from './dialTiming';

const { discChangeMs, dialKeyMs, dialKeyOpenStepMs, dialKeyCloseStepMs } = MOTION.scene;

describe('dialKeyDelayMs', () => {
    it('should open the first letter at once and close it last', () => {
        expect(dialKeyDelayMs(0, 22, true)).toBe(0);
        expect(dialKeyDelayMs(0, 22, false)).toBeGreaterThan(dialKeyDelayMs(20, 22, false));
        expect(dialKeyDelayMs(20, 22, false)).toBe(0);
    });

    // Technical Spec CR-003：打開嘅總時間固定 0.5 秒，每格最多遲 14ms
    it.each([4, 9, 18, 22, 30])(
        'should finish opening within the disc-change time for %d positions',
        (positions) => {
            const lastKey = positions - 2;
            expect(dialKeyDelayMs(lastKey, positions, true) + dialKeyMs).toBeLessThanOrEqual(
                discChangeMs,
            );
            expect(dialKeyDelayMs(1, positions, true)).toBeLessThanOrEqual(dialKeyOpenStepMs);
            expect(dialKeyDelayMs(lastKey - 1, positions, false)).toBeLessThanOrEqual(
                dialKeyCloseStepMs,
            );
        },
    );

    // 設計稿第 18 版：22 格時頭尾字母打開相差約 238ms、收返約 136ms
    it('should spread 22 positions like mockup version 18', () => {
        expect(dialKeyDelayMs(20, 22, true)).toBeCloseTo(240, 0);
        expect(dialKeyDelayMs(0, 22, false)).toBeCloseTo(137, 0);
    });

    it('should not stagger when there is one album or none', () => {
        expect(dialKeyDelayMs(0, 2, true)).toBe(0);
        expect(dialKeyDelayMs(0, 2, false)).toBe(0);
        expect(dialKeyDelayMs(0, 1, true)).toBe(0);
    });
});
