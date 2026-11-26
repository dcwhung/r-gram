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

    // T-048：設計稿第 18 版 MINI = { x: 930, y: 322, r: 120, labelGap: 28, hitPad: 300, label: 24, title: 36,
    // titleMin: 24, titleStep: 2, labelDy: −62, titleDy: −14, titleLeft: 330 }（B-083 ④，設計稿 bcfc0fc）：
    // 兩行字推上咗喺歌單第一行上面，歌名向左用到 330；「播放中」字距 4（miniTurntable()）
    it('should carry the mini turntable of the mockup', () => {
        expect(PHONE_LAYOUT.miniTurntable).toEqual({
            x: 930,
            y: 322,
            r: 120,
            labelGap: 28,
            hitPad: 300,
            label: { size: 24, dy: -62, spacing: 4 },
            title: { size: 36, dy: -14, minSize: 24, step: 2, left: 330 },
        });
    });

    /*
     * 設計稿第 19 版 TRACKLIST = { x: 74, right: 600, top: 330, bottomOpen: 1470, bottomIdle: 1290,
     * size: 28, pitch: 66, number: 0.72, numberW: 56, fade: 100, bar: 5, barX: 44, scrimSolid: 0, scrimEnd: W,
     * scrimOpacity: 0.62, rowPad: 20 }；trackPanel() 寫死嘅位置條最短 60、拖動門檻 6 px；
     * PANEL_FLOAT 嘅 dx 170、dy −62（每行由右上飄落）
     */
    it('should carry the held track column of the mockup', () => {
        expect(PHONE_LAYOUT.heldTracks).toEqual({
            x: 74,
            right: 600,
            top: 330,
            bottomOpen: 1470,
            bottomIdle: 1290,
            size: 28,
            pitch: 66,
            number: { scale: 0.72, width: 56 },
            fade: 100,
            bar: { width: 5, x: 44, minLength: 60 },
            rowReach: 20,
            scrim: { solid: 0, end: 1080, opacity: 0.62 },
            dragThresholdPx: 6,
            entrance: { dx: 170, dy: -62 },
        });
    });

    // 設計稿 info()：拎住另一隻碟時碟名闊度到 MINI.x − MINI.r − 20
    it('should narrow the album title to the left of the mini turntable while holding', () => {
        expect(PHONE_LAYOUT.info.title.rightWhenHeld).toBe(790);
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

    // T-034：設計稿第 18 版 preloadCard()：logo 560 闊、中心 (540, 860)；BAR = { x: 340, y: 1640, w: 400 }；
    // 百分比 BAR.y + 56、「R Gram」1802、非官方 · 版本 1846
    it('should carry the Preload text and progress line of the mockup', () => {
        const { preload } = PHONE_LAYOUT;
        expect(preload.bar).toEqual({ x: 340, y: 1640, width: 400, stroke: 4, trackOpacity: 0.25 });
        expect(preload.percent).toEqual({ x: 540, y: 1696, size: 30, spacing: 6 });
        expect(preload.name).toEqual({ x: 540, y: 1802, size: 34, spacing: 2 });
        expect(preload.notice).toEqual({ x: 540, y: 1846, size: 22, spacing: 3 });
        expect(preload.logo).toMatchObject({ x: 540, y: 860, width: 560 });
    });

    // v16 anim.js FLAG：布料 1760 × 2400、由 (−240, −240) 起、30 × 40 格、光暗圖 90 × 120、波幅 122、焦距 1500；
    // logo 喺 v16 平放時嘅中心係 x = 838 − 240 = 598：布料摺皺會將佢拉返去畫面中間（第 18 版嘅 540）
    it('should carry the cloth of the v16 flag and its logo offset', () => {
        const { flag, logo } = PHONE_LAYOUT.preload;
        expect(flag).toEqual({
            width: 1760,
            height: 2400,
            x: -240,
            y: -240,
            cols: 30,
            rows: 40,
            lightCols: 90,
            lightRows: 120,
            amp: 122,
            focal: 1500,
        });
        expect(logo.x + logo.drift).toBe(838 + flag.x);
    });

    // 冇 catalog 嘅錯誤同重試掣（設計稿冇畫，T-034 定）：喺進度線嘅位，唔撞「R Gram」；掣嘅感應範圍夠 44pt
    it('should keep the retry button clear of the app name with a 44pt touch area', () => {
        const { failure, name } = PHONE_LAYOUT.preload;
        const { hitPt, viewportPt } = PHONE_LAYOUT.clearance;
        const minHit = (hitPt * 1080) / viewportPt;
        expect(failure.retry.hit).toBeGreaterThanOrEqual(minHit);
        expect(failure.retry.y + failure.retry.hit / 2).toBeLessThan(name.y - name.size);
        expect(failure.message.y).toBeLessThan(failure.retry.y - failure.retry.hit / 2);
    });

    /*
     * T-037：設計稿第 18 版 LIST = { r: 556, step: 9.2, focus: 42, rest: 32, number: 0.72, frame: 88, visible: 4.3 }；
     * listLayer()、focusFrame()、dimLayer() 寫死嘅數：歌名喺歌號後面 numberSize × 1.25 + 18；框左邊圓頭前面留 6、
     * 線粗 3；越遠越淡 = (1 − |k| ÷ visible)^1.5，唔係揀中嗰行 × 0.62，未有音檔再 × 0.5，最淡 0.06；暗層 80% 黑。
     * 歌名約 8 個中文字（以揀中嗰行嘅字級計，設計稿表格「歌名最多約 8 個中文字」）；拖動門檻同歌單欄一樣 6 px（互動格）。
     * 第 20 版 LIST_LOOP = { markW: 230, markStroke: 5, dot: 9, gap: 8, minOpacity: 0.45 }：接駁位嘅點同短線
     */
    it('should carry the arc track list of the mockup', () => {
        expect(PHONE_LAYOUT.arc).toEqual({ r: 556, stepDeg: 9.2 });
        expect(PHONE_LAYOUT.list).toEqual({
            focusSize: 42,
            restSize: 32,
            number: { scale: 0.72, gapEm: 1.25, pad: 18 },
            frame: { height: 88, gap: 6, stroke: 3 },
            visible: 4.3,
            fade: { power: 1.5, rest: 0.62, off: 0.5, min: 0.06 },
            veil: 0.8,
            titleChars: 8,
            dragThresholdPx: 6,
            seam: { dot: 9, gap: 8, length: 230, stroke: 5, minOpacity: 0.45 },
        });
    });
});
