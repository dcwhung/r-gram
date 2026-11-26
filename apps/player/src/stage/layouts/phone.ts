import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../fitStage';
import { circleLeftAt } from '../geometry';
import type { StageLayout } from './types';

/*
 * 手機直度。數值以已確認嘅設計稿做準：_mockups_/home-turntable/src/template.html（第 17 版，用戶 2026-11-25 確認）嘅常數
 *（DISC、PLATTER、HUB、ARM、ORBIT、BTN、BUTTONS、KNOB、SCALE、DIAL、SCREWS、LIST / ARC）同 info() 入面嘅位置。
 * 改數值之前先改設計稿並取得確認；clearance.test.ts 會驗淨空規則同設計稿嘅量度值。
 */
const DISC = { x: 940, y: 1196, r: 700 };
const PLATTER_RADIUS = 716;
const KNOB_Y = 1784;
const KNOB_RADIUS = 76;
const BUTTON_COLUMN_X = 112;
const SCREW_INSET = 62;
const ARM = { x: 900, y: 330, length: 640, base: 92, parkDeg: 176, playDeg: 99, bend: -1 } as const;
/*
 * 左上資訊嘅闊度上限：碟名右邊留返同左邊一樣嘅位（T-035 定）；碟名縮字最細 48。
 * 歌名照設計稿第 18 版 SONG_FIT（CR-005 D51）：連後面嘅心形停喺唱臂底座左邊 SONG_ARM_GAP 之外
 *（SONG_FIT.right = ARM.x − ARM.base − 36）；44 → 32 每次縮 2；斷兩行時第二行到 470（泊位嘅唱臂）。
 */
const INFO_X = 70;
const SONG_ARM_GAP = 36;
const TITLE_MIN_SIZE = 48;
/*
 * 細唱片機（T-048）照設計稿第 18 版 MINI 同 miniTurntable()（B-083 ④ 改擺法，設計稿 bcfc0fc）：
 * 「播放中」基線 y + labelDy（−62）、歌名基線 y + titleDy（−14），兩行都喺歌單第一行（歌單頂 330）上面，
 * 所以歌名可以由右邊向左用到 titleLeft（330）。歌名最細縮到同「播放中」一樣大（titleMin），每次縮 titleStep（S-193）。
 * 拎住另一隻碟時碟名停喺細唱片機左邊 MINI_TITLE_GAP 之外（設計稿 info()：MINI.x − MINI.r − 20）。
 */
const MINI = {
    x: 930,
    y: 322,
    r: 120,
    labelGap: 28,
    hitPad: 300,
    label: { size: 24, dy: -62, spacing: 4 },
    title: { size: 36, dy: -14, minSize: 24, step: 2, left: 330 },
} as const;
const MINI_TITLE_GAP = 20;

/*
 * 拎住嘅碟嘅歌單欄（T-049）照設計稿第 18 版 TRACKLIST。trackPanel() 入面寫死嘅數變成有名常數：
 * 位置條最短 60、每行透明感應範圍闊 right + 20；拖動門檻 6 px 嚟自互動格嘅 pointermove
 */
const HELD_TRACKS = {
    x: 74,
    right: 600,
    top: 330,
    bottomOpen: 1470,
    bottomHeld: 1650,
    size: 28,
    pitch: 66,
    number: { scale: 0.72, width: 56 },
    fade: 100,
    bar: { width: 5, x: 44, minLength: 60 },
    rowReach: 20,
    scrim: { solid: 0, end: DESIGN_WIDTH, opacity: 0.62 },
    dragThresholdPx: 6,
} as const;

/*
 * 弧線歌單（T-037）照設計稿第 18 版 LIST（focus、rest、number、frame、visible）；listLayer()、focusFrame()、dimLayer()
 * 入面寫死嘅數變成有名常數：歌名 x = 歌號 x + 歌號字級 × 1.25 + 18；框左邊圓頭前面 6、線粗 3；淡出指數 1.5、
 * 其他行 × 0.62、未有音檔 × 0.5、最淡 0.06；暗層 0.8。歌名約 8 個中文字（設計稿表格、Functional Spec D23）
 */
const ARC_LIST = {
    focusSize: 42,
    restSize: 32,
    number: { scale: 0.72, gapEm: 1.25, pad: 18 },
    frame: { height: 88, gap: 6, stroke: 3 },
    visible: 4.3,
    fade: { power: 1.5, rest: 0.62, off: 0.5, min: 0.06 },
    veil: 0.8,
    titleChars: 8,
    // 同歌單欄一樣（設計稿互動格嘅拖動門檻）
    dragThresholdPx: 6,
} as const;

/*
 * Preload（T-034）。布料照 _mockups_/r-gram/src/anim.js（v16）嘅 FLAG；logo、進度線同文字照第 18 版 preloadCard()。
 * v16 logo 平放時中心 x = 838 − 240 = 598、闊 640；第 18 版靜止畫面係 540、闊 560：
 * 用第 18 版嘅位同闊度，保留 v16 嘅 58 單位偏移（摺皺會將 logo 拉向旗杆，飄起嚟先喺中間）。
 * 錯誤同重試掣設計稿冇畫：放喺進度線嘅位，同進度線一樣置中，唔撞「R Gram」。
 */
const PRELOAD_CENTRE = DESIGN_WIDTH / 2;
const PRELOAD_BAR_Y = 1640;
const PRELOAD = {
    flag: {
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
    },
    logo: { x: PRELOAD_CENTRE, y: 860, width: 560, drift: 58 },
    bar: { x: 340, y: PRELOAD_BAR_Y, width: 400, stroke: 4, trackOpacity: 0.25 },
    percent: { x: PRELOAD_CENTRE, y: PRELOAD_BAR_Y + 56, size: 30, spacing: 6 },
    name: { x: PRELOAD_CENTRE, y: 1802, size: 34, spacing: 2 },
    notice: { x: PRELOAD_CENTRE, y: 1846, size: 22, spacing: 3 },
    failure: {
        message: { x: PRELOAD_CENTRE, y: 1590, size: 30, spacing: 3 },
        retry: {
            x: PRELOAD_CENTRE,
            y: 1680,
            size: 30,
            spacing: 6,
            width: 240,
            height: 76,
            stroke: 3,
            hit: 124,
        },
    },
} as const;

export const PHONE_LAYOUT: StageLayout = {
    id: 'phone',
    disc: DISC,
    platter: { r: PLATTER_RADIUS },
    hub: { clear: 0.16, clamp: 0.118, rim: 0.972 },
    arm: ARM,
    orbit: {
        r: 1000,
        startDeg: -48,
        stepDeg: 30,
        scale: 0.72,
        veil: 0.42,
        spread: 0.9,
        shown: { from: -1, to: 2 },
    },
    buttons: {
        r: 44,
        ringGap: 9,
        ringWidth: 3.5,
        iconSize: 52,
        items: [
            { id: 'booklet', x: BUTTON_COLUMN_X, y: 1380 },
            { id: 'mv', x: BUTTON_COLUMN_X, y: 1510 },
            { id: 'mode', x: BUTTON_COLUMN_X, y: 1640 },
        ],
    },
    // 旋鈕喺畫面左邊同轉盤邊嘅正中間：位置由轉盤計出嚟，唔寫死
    knob: {
        x: Math.round(circleLeftAt(DISC, PLATTER_RADIUS, KNOB_Y) / 2),
        y: KNOB_Y,
        r: KNOB_RADIUS,
        heartHitGap: 10,
        // 設計稿冇（佢用㩒一下開關）：真機拖動嘅死區，T-036 定
        turnDeadZone: 0.3,
        // S-152：未㩒夠時間就開始擰，郁過幾多 CSS px 即刻開字母盤（同歌單拖動門檻一樣，設計稿互動格嘅 6）
        turnThresholdPx: 6,
    },
    scale: {
        fromDeg: 185,
        toDeg: 376.25,
        inner: 92,
        outer: 104,
        long: 112,
        heart: 26,
        heartGap: 18,
    },
    dial: {
        inner: 186,
        outer: 288,
        letters: 237,
        current: 46,
        other: 28,
        // 18 格（17 張 + ♥）時一格 = 11.25°（設計稿 DIAL_CLEARANCE = DIAL.letters × rad(11.25) × 1.3）
        letterRule: { allUpTo: 18, maxLetters: 9, clearanceStepDeg: 11.25, clearanceFactor: 1.3 },
        dotR: 2.2,
        plateFrom: 0.42,
        keyFrom: 0.5,
    },
    screws: {
        // 右下角喺碟底下，見唔到，所以得三粒
        points: [
            { x: SCREW_INSET, y: SCREW_INSET },
            { x: SCREW_INSET, y: DESIGN_HEIGHT - SCREW_INSET },
            { x: DESIGN_WIDTH - SCREW_INSET, y: SCREW_INSET },
        ],
        zoneIndex: 1,
    },
    info: {
        title: {
            x: INFO_X,
            latin: { y: 192, size: 88, spacing: 1 },
            cjk: { y: 188, size: 80, spacing: 4 },
            minSize: TITLE_MIN_SIZE,
            maxRight: DESIGN_WIDTH - INFO_X,
            rightWhenHeld: MINI.x - MINI.r - MINI_TITLE_GAP,
        },
        year: { x: 74, y: 244, size: 29, spacing: 6 },
        rule: { gap: 22, y: 234, length: 98, width: 3.5 },
        song: {
            x: 128,
            y: 318,
            size: 44,
            minSize: 32,
            step: 2,
            maxRight: ARM.x - ARM.base - SONG_ARM_GAP,
            lift: 22,
            pitch: 38,
            secondRight: 470,
        },
        bars: {
            x: 74,
            step: 13,
            width: 8,
            height: 30,
            corner: 1.5,
            lift: 2,
            levels: [0.72, 1, 0.5],
        },
        heart: { gap: 46, size: 50, rise: 0.364, stroke: 2.6 },
        track: { x: 74, y: 368, size: 22, spacing: 3 },
        // 歌單開住（設計稿 infoParts() st.list）：框入面嗰首嘅歌號，slab 32、喺歌名第一行基線上面 2
        listNumber: { x: 74, size: 32, lift: 2 },
        version: { x: 1008, y: 118, size: 22, spacing: 3 },
    },
    miniTurntable: MINI,
    heldTracks: HELD_TRACKS,
    preload: PRELOAD,
    arc: { r: 556, stepDeg: 9.2 },
    list: ARC_LIST,
    clearance: { cd: 16, platter: 40, controlGap: 40, screwZone: 120, hitPt: 44, viewportPt: 390 },
};
