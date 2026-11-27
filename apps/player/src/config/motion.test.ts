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

    // 設計稿第 19 版 LIST_FLOAT：由歌單欄開弧線歌單：每行 560ms、遲 80ms；暗層 360ms；框 280ms 後 300ms；餘下嘅行 240ms 淡出
    it('should use the list float of mockup version 19', () => {
        expect(MOTION.scene).toMatchObject({
            listRowFloatMs: 560,
            listRowStaggerMs: 80,
            listVeilMs: 360,
            listFrameDelayMs: 280,
            listFrameMs: 300,
            listGhostOutMs: 240,
        });
    });

    // S-152（B-083 ①）：㩒住旋鈕幾耐先開字母盤（輸入規則，減少動態效果都一樣）
    it('should open the dial after a short hold', () => {
        expect(MOTION.input.dialHoldMs).toBe(180);
    });

    // D99（用戶確認 3 秒）：播完最後一首隔幾耐變返未揀歌；Technical Spec 建議 endedReleaseMs
    it('should put the disc down 3 seconds after the last track', () => {
        expect(MOTION.input.endedReleaseMs).toBe(3000);
    });

    it('should only hold positive whole milliseconds', () => {
        const all = [
            ...Object.values(MOTION.feedback),
            ...Object.values(MOTION.scene),
            ...Object.values(MOTION.input),
        ];
        expect(all.every((ms) => Number.isInteger(ms) && ms > 0)).toBe(true);
    });

    // T-060：設計稿「MV 電視」嘅 CSS（tvRise、antennaOut／In、crtOn、crt-white、crtOff、tvDrop、tv-veil）同 TV_CLOSE_MS
    it('should use the TV timings of the mockup (rise, antenna, switch-on, switch-off, drop, veil)', () => {
        expect(MOTION.scene).toMatchObject({
            tvRiseMs: 800,
            tvAntennaOutMs: 350,
            tvAntennaOutDelayMs: 500,
            tvAntennaInMs: 150,
            crtOnDelayMs: 700,
            crtOnMs: 220,
            crtFlashOutMs: 200,
            crtFlashOutDelayMs: 720,
            crtFlashInMs: 100,
            crtOffMs: 150,
            tvDropDelayMs: 170,
            tvDropMs: 450,
            tvVeilInMs: 500,
            tvVeilOutMs: 450,
            tvCloseMs: 630,
        });
    });

    it('should not put the TV away before the switch-off and the drop have finished', () => {
        const { crtOffMs, tvDropDelayMs, tvDropMs, tvCloseMs } = MOTION.scene;
        expect(tvDropDelayMs).toBeGreaterThanOrEqual(crtOffMs);
        expect(tvCloseMs).toBeGreaterThanOrEqual(tvDropDelayMs + tvDropMs);
    });

    // T-072：設計稿第 18 版 book-in／book-out（暗層、框線、曲詞編監）
    it('should use the booklet part timings of mockup version 18', () => {
        expect(MOTION.scene).toMatchObject({
            bookletVeilInMs: 300,
            bookletFrameOutMs: 300,
            bookletCreditInMs: 240,
            bookletCreditDelayMs: 40,
            bookletCreditStepMs: 40,
            bookletVeilOutMs: 240,
            bookletFrameInMs: 220,
            bookletCreditOutMs: 160,
        });
    });

    // 收返完先轉場景狀態：每部分都喺 bookletCloseMs 之內完；打開最遲嗰行曲詞編監（第 4 行）喺 bookletOpenMs 完
    it('should fit every booklet part inside the open and close durations', () => {
        const { scene } = MOTION;
        const LAST_CREDIT = 3;
        const lastCreditEnd =
            scene.bookletCreditDelayMs +
            LAST_CREDIT * scene.bookletCreditStepMs +
            scene.bookletCreditInMs;
        expect(lastCreditEnd).toBe(scene.bookletOpenMs);
        expect(Math.max(scene.bookletVeilInMs, scene.bookletFrameOutMs)).toBeLessThanOrEqual(
            scene.bookletOpenMs,
        );
        const closing = [scene.bookletVeilOutMs, scene.bookletFrameInMs, scene.bookletCreditOutMs];
        expect(Math.max(...closing)).toBe(scene.bookletCloseMs);
    });

    // T-082：設計稿 book-in／book-out 嘅歌詞部分；換行過場 0.3 秒（設計稿冇定）
    it('should use the booklet lyric timings and fit them inside the open and close durations', () => {
        const { scene } = MOTION;
        expect(scene).toMatchObject({
            bookletLineFanMs: 340,
            bookletLineFanDelayMs: 60,
            bookletLineFoldMs: 220,
            bookletPlainInMs: 300,
            bookletPlainInDelayMs: 80,
            bookletPlainOutMs: 200,
            lyricAdvanceMs: 300,
        });
        expect(scene.bookletLineFanDelayMs + scene.bookletLineFanMs).toBe(scene.bookletOpenMs);
        expect(scene.bookletPlainInDelayMs + scene.bookletPlainInMs).toBeLessThanOrEqual(
            scene.bookletOpenMs,
        );
        expect(Math.max(scene.bookletLineFoldMs, scene.bookletPlainOutMs)).toBeLessThanOrEqual(
            scene.bookletCloseMs,
        );
    });

    // T-109：設計稿第 20 版 versionGlow（成粒版本掣一明一暗，1.4 秒一個來回）
    it('should blink the update button with the period of mockup version 20', () => {
        expect(MOTION.loop.updateBlinkMs).toBe(1400);
    });
});
