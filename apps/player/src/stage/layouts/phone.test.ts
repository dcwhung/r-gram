import { PHONE_LAYOUT } from './phone';

/* 幾何表嘅數值以設計稿 template.html 嘅常數做準 */
describe('PHONE_LAYOUT', () => {
    // W-009：設計稿 ARM = { x: 900, y: 330, len: 640, base: 92, park: 176, play: 99, bend: -1 }
    it('should carry every tonearm constant of the mockup, including the bend', () => {
        expect(PHONE_LAYOUT.arm).toEqual({
            x: 900,
            y: 330,
            length: 640,
            base: 92,
            parkDeg: 176,
            playDeg: 99,
            bend: -1,
        });
    });

    // CR-003 決定 2：設計稿 SCALE = { from: 185, to: 376.25, … }；弧固定，唔再有每格固定角度
    it('should carry the fixed scale arc of the mockup', () => {
        expect(PHONE_LAYOUT.scale).toEqual({
            fromDeg: 185,
            toDeg: 376.25,
            inner: 92,
            outer: 104,
            long: 112,
            heart: 26,
            heartGap: 18,
        });
    });

    // T-035：左上資訊同版本號，數值照設計稿 info()（第 17 版）
    it('should carry the top-left info block and the version text of the mockup', () => {
        const { info } = PHONE_LAYOUT;
        expect(info.title).toMatchObject({
            x: 70,
            latin: { y: 192, size: 88, spacing: 1 },
            cjk: { y: 188, size: 80, spacing: 4 },
        });
        expect(info.year).toEqual({ x: 74, y: 244, size: 29, spacing: 6 });
        expect(info.rule).toEqual({ gap: 22, y: 234, length: 98, width: 3.5 });
        expect(info.song).toMatchObject({ x: 128, y: 318, size: 44 });
        expect(info.bars).toEqual({
            x: 74,
            step: 13,
            width: 8,
            height: 30,
            corner: 1.5,
            lift: 2,
            levels: [0.72, 1, 0.5],
        });
        // 第 18 版 SONG_FIT：heart 71 = 心形中心離歌名尾 46 + 半個心形 25；heartRise 0.364 × 字級
        expect(info.heart).toEqual({ gap: 46, size: 50, rise: 0.364, stroke: 2.6 });
        expect(info.track).toEqual({ x: 74, y: 368, size: 22, spacing: 3 });
        expect(info.version).toEqual({ x: 1008, y: 118, size: 22, spacing: 3 });
    });

    // 碟名右邊留返同左邊一樣嘅位（T-035）；歌名連心形停喺唱臂底座 36 之外（第 18 版 SONG_FIT.right）
    it('should keep the title within the right margin and the song line clear of the tonearm base', () => {
        const { info, arm } = PHONE_LAYOUT;
        expect(info.title.maxRight).toBe(1080 - info.title.x);
        expect(info.song.maxRight).toBe(arm.x - arm.base - 36);
    });

    // CR-005 D51；第 18 版 SONG_FIT = { size: 44, min: 32, step: 2, pitch: 38, lift: 22, secondRight: 470 }
    it('should carry the two-line song title constants of the mockup', () => {
        expect(PHONE_LAYOUT.info.song).toEqual({
            x: 128,
            y: 318,
            size: 44,
            minSize: 32,
            step: 2,
            maxRight: 772,
            lift: 22,
            pitch: 38,
            secondRight: 470,
        });
    });
});
