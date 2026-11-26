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

    // T-034：Preload 旗幟嘅時間線（設計稿 r-gram v16 anim.js 嘅 T：loadStart 0.25 → loadEnd 1.85 → flagFade 2.05–2.8）
    it('should use the preload timings of the v16 flag mockup', () => {
        expect(MOTION.scene).toMatchObject({
            flagFadeMs: 750,
            preloadHoldMs: 200,
            flagGustMs: 1000,
            preloadBarDelayMs: 200,
            preloadBarInMs: 300,
        });
        // v16 進度線由 0 行到 100 用 1.6 秒；真實進度有三項，每一步行三分之一
        const V16_FILL_MS = 1600;
        const ITEMS = 3;
        expect(MOTION.scene.preloadStepMs).toBe(Math.round(V16_FILL_MS / ITEMS / 10) * 10);
    });

    // T-036：設計稿第 18 版 SWAP_FADE_MS（唱臂、細掣、左上歌名淡出淡入）同 CSS 嘅字母盤淡入
    it('should use the chrome fade and dial fades of mockup version 18', () => {
        expect(MOTION.scene).toMatchObject({
            chromeFadeMs: 320,
            dialPlateFadeMs: 220,
            dialKeyFadeMs: 180,
        });
    });

    it('should fit the staggered dial letters inside the disc-change duration', () => {
        const { dialKeyMs, dialKeyOpenStepMs, discChangeMs } = MOTION.scene;
        const DIAL_POSITIONS = 18;
        expect((DIAL_POSITIONS - 1) * dialKeyOpenStepMs + dialKeyMs).toBeLessThanOrEqual(
            discChangeMs,
        );
    });

    // 設計稿第 19 版 PANEL_FLOAT：歌單欄逐行飄落 460ms、每行遲 60ms、成欄最多攤開 560ms；停定 140ms 先出
    it('should use the track column entrance of mockup version 19', () => {
        expect(MOTION.scene).toMatchObject({
            columnRowInMs: 460,
            columnRowStaggerMs: 60,
            columnRowSpreadMs: 560,
        });
        expect(MOTION.input.columnSettleMs).toBe(140);
    });

    // S-152（B-083 ①）：㩒住旋鈕幾耐先開字母盤（輸入規則，減少動態效果都一樣）
    it('should open the dial after a short hold', () => {
        expect(MOTION.input.dialHoldMs).toBe(180);
    });

    it('should only hold positive whole milliseconds', () => {
        const all = [
            ...Object.values(MOTION.feedback),
            ...Object.values(MOTION.scene),
            ...Object.values(MOTION.input),
        ];
        expect(all.every((ms) => Number.isInteger(ms) && ms > 0)).toBe(true);
    });
});
