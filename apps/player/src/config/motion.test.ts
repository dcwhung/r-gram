import { FEEDBACK_MAX_MS, MOTION } from './motion';

describe('motion tokens', () => {
    it('should keep every feedback duration within the 300 ms rule', () => {
        const tooLong = Object.entries(MOTION.feedback).filter(([, ms]) => ms > FEEDBACK_MAX_MS);
        expect(FEEDBACK_MAX_MS).toBe(300);
        expect(tooLong).toEqual([]);
    });

    it('should use the scene durations confirmed in the mockup (Functional Spec CR-002)', () => {
        expect(MOTION.scene).toMatchObject({
            discChangeMs: 500,
            tonearmMs: 650,
            needleDropMs: 160,
            bookletOpenMs: 400,
            bookletCloseMs: 240,
            tvRiseMs: 800,
            crtOnMs: 220,
            crtOffMs: 150,
            tvDropMs: 450,
        });
    });

    it('should fit the staggered dial letters inside the disc-change duration', () => {
        const { dialKeyMs, dialKeyOpenStepMs, discChangeMs } = MOTION.scene;
        const DIAL_POSITIONS = 18;
        expect((DIAL_POSITIONS - 1) * dialKeyOpenStepMs + dialKeyMs).toBeLessThanOrEqual(
            discChangeMs,
        );
    });

    it('should only hold positive whole milliseconds', () => {
        const all = [...Object.values(MOTION.feedback), ...Object.values(MOTION.scene)];
        expect(all.every((ms) => Number.isInteger(ms) && ms > 0)).toBe(true);
    });
});
