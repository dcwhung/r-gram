/*
 * 幾何資料表嘅型別。版面數字係資料唔係 code：每種裝置一份表，元件只讀表。
 * 所有長度係設計單位（1080 × 1920 基準）；角度係度，0° 向右、順時針為正（y 向下）。
 */
export type LayoutId = 'phone';

export interface Point {
    x: number;
    y: number;
}

export type ButtonId = 'booklet' | 'mv' | 'mode';

/** 一行字：位置（基線）、字級、字距 */
export interface TextLine extends Point {
    size: number;
    spacing: number;
}

/** 左上資訊同右上版本號（設計稿 info()）。`minSize` = 放唔落時最細縮到幾多；`maxRight` = 字最遠去到邊（x） */
export interface InfoLayout {
    /** 碟名：英文數字用 slab（latin），其他用 Noto Sans HK 900（cjk）；兩款嘅基線同字級唔同 */
    title: {
        x: number;
        latin: { y: number; size: number; spacing: number };
        cjk: { y: number; size: number; spacing: number };
        minSize: number;
        maxRight: number;
        /** 拎住另一隻碟時（細唱片機喺右上角）碟名最遠去到邊（T-048） */
        rightWhenHeld: number;
    };
    year: TextLine;
    /** 年份後面嘅專輯色橫線：離年份幾遠、高度、長度、線粗 */
    rule: { gap: number; y: number; length: number; width: number };
    /**
     * 歌名（設計稿第 18 版 SONG_FIT；Functional Spec D51）：放唔落先每次縮 `step`，最細 `minSize`；
     * 仍然放唔落就斷兩行：第一行向上移 `lift`、行距 `pitch`（「第 nn 首」行唔郁），
     * 第二行字最遠去到 `secondRight`（唱臂喺泊位時喺嗰個高度橫過）。`maxRight` = 一行時連心形最遠去到邊
     */
    song: Point & {
        size: number;
        minSize: number;
        step: number;
        maxRight: number;
        lift: number;
        pitch: number;
        secondRight: number;
    };
    /** 歌名前面三條專輯色棒：位置、間距、闊、最高、圓角、底部離基線幾多、各條高度（× height） */
    bars: {
        x: number;
        step: number;
        width: number;
        height: number;
        corner: number;
        lift: number;
        levels: readonly number[];
    };
    /** 歌名後面嘅心形：離歌名尾幾遠（到心形中心）、大細、中心比基線高幾多（× 歌名字級）、空心線粗（icon 格單位） */
    heart: { gap: number; size: number; rise: number; stroke: number };
    /** 「第 nn 首 · m:ss」 */
    track: TextLine;
    /** 歌單開住時框入面嗰首嘅歌號（專輯色 slab）：x、字級、喺歌名第一行基線上面幾多 */
    listNumber: { x: number; size: number; lift: number };
    /** 右上版本號（靠右對齊：x 係右邊） */
    version: TextLine;
}

/**
 * Preload（T-034）：旗幟布料（設計稿 r-gram v16 FLAG）同底部文字、進度線（第 18 版 preloadCard()）。
 * 底部嘅嘢貼底（高身手機向下移）；布料同 logo 跟畫面高度伸（見 components/flag/flagScene.ts）。
 */
export interface PreloadLayout {
    /**
     * 布料（平放時）：大細、左上角（離畫面頂同左邊，負數 = 喺畫面外）、網格格數、光暗圖解像度、
     * 波幅同透視焦距（z 向鏡頭為正）
     */
    flag: {
        width: number;
        height: number;
        x: number;
        y: number;
        cols: number;
        rows: number;
        lightCols: number;
        lightRows: number;
        amp: number;
        focal: number;
    };
    /**
     * 旗上嘅 logo：畫面上嘅中心同闊度（第 18 版）；`drift` = 平放時要向右移幾多（v16：布料摺皺會將佢拉向旗杆）
     */
    logo: Point & { width: number; drift: number };
    /** 進度線：起點（左端）、長度、線粗、未完成部分嘅透明度 */
    bar: Point & { width: number; stroke: number; trackOpacity: number };
    /** 三位數百分比、「R Gram」、「歌迷自製 非官方 · 版本」：置中（x 係中線） */
    percent: TextLine;
    name: TextLine;
    notice: TextLine;
    /** 冇 catalog：錯誤訊息同重試掣（置中）；`hit` = 感應範圍嘅高度（闊度連埋外框） */
    failure: {
        message: TextLine;
        retry: TextLine & { width: number; height: number; stroke: number; hit: number };
    };
}

/**
 * 右上角細唱片機（設計稿第 18 版 MINI、miniTurntable()；T-048）：碟心同半徑（成部唱片機按 r ÷ 轉盤半徑縮細）；
 * 兩行字靠右對齊喺碟左邊 `labelGap`：「播放中」基線喺 y + `label.dy`、歌名基線喺 y + `title.dy`（都喺歌單第一行上面）；
 * 感應範圍 = 碟（2r × 2r）再向左伸 `hitPad`，連埋兩行字。歌名最左去到 `title.left`：放唔落就每次縮 `step`，
 * 最細 `minSize`，再唔得先「…」
 */
export interface MiniTurntableLayout extends Point {
    r: number;
    labelGap: number;
    hitPad: number;
    label: { size: number; dy: number; spacing: number };
    title: { size: number; dy: number; minSize: number; step: number; left: number };
}

/**
 * 碟名下面嘅歌單欄（設計稿第 19 版 TRACKLIST、trackPanel()、listScrim()、PANEL_FLOAT；T-049、B-086）：
 * 一欄靠左對齊，由 `x` 起、字最遠去到 `right`；欄頂 `top`，欄底字母盤開住時 `bottomOpen`、鬆手之後 `bottomIdle`
 *（讓位畀三粒細掣）
 *（呢兩個係設計高度嘅值，高身手機跟貼底組向下移）。字級 `size`、行距 `pitch`；歌號字級 = size × `number.scale`，
 * 歌名喺 x + `number.width`。頂底淡出高 `fade`；位置條（左邊）闊 `bar.width`、x `bar.x`、最短 `bar.minLength`。
 * 一行嘅透明範圍由 0 伸到 right + `rowReach`（唔係掣，擋住下面嘅碟面）。出現時每行由 (`entrance.dx`, `entrance.dy`)
 * 飄落自己嘅位置。半透明層（舞台底色）：由左邊 `scrim.opacity`（到 `scrim.solid`）
 * 直線淡到 `scrim.end` 嘅 0。拖動要過 `dragThresholdPx`（CSS px，唔係設計單位）先當拖，拖過唔當㩒
 */
export interface HeldTracksLayout {
    x: number;
    right: number;
    top: number;
    bottomOpen: number;
    bottomIdle: number;
    size: number;
    pitch: number;
    number: { scale: number; width: number };
    fade: number;
    bar: { width: number; x: number; minLength: number };
    rowReach: number;
    scrim: { solid: number; end: number; opacity: number };
    dragThresholdPx: number;
    entrance: { dx: number; dy: number };
}

/**
 * 弧線歌單（設計稿第 18 版 LIST、listLayer()、focusFrame()、dimLayer()；T-037）。弧線半徑同每行角度喺 `arc`。
 * 揀中嗰行（框入面）字級 `focusSize`，其他 `restSize`；歌號字級 = 行字級 × `number.scale`，歌名喺歌號後面
 * 歌號字級 × `number.gapEm` + `number.pad`。框高 `frame.height`、左邊圓頭前面留 `frame.gap`、線粗 `frame.stroke`
 *（CSS px，唔跟縮放）。越遠越淡：(1 − |k| ÷ `visible`)^`fade.power`，唔係揀中 × `fade.rest`，未有音檔 × `fade.off`，
 * 最淡 `fade.min`；|k| > `visible` 唔畫。暗層黑色 `veil`。歌名放唔落 `titleChars` 個（揀中字級）全形字就「…」。
 * 拖動要過 `dragThresholdPx`（CSS px）先當拖
 */
export interface ArcListLayout {
    focusSize: number;
    restSize: number;
    number: { scale: number; gapEm: number; pad: number };
    frame: { height: number; gap: number; stroke: number };
    visible: number;
    fade: { power: number; rest: number; off: number; min: number };
    veil: number;
    titleChars: number;
    /** 拖動要過幾多 CSS px 先當拖（拖過唔當㩒） */
    dragThresholdPx: number;
    /**
     * 接駁位（頭尾相接，最後一首之後）：專輯色嘅點（半徑 dot）+ 隔 gap 之後一條短線（長 length、粗 stroke）；
     * 最淡 minOpacity
     */
    seam: { dot: number; gap: number; length: number; stroke: number; minOpacity: number };
}

export interface StageLayout {
    id: LayoutId;
    /** 主頁嘅碟（圓心、半徑） */
    disc: Point & { r: number };
    /** 轉盤：淺色車床鋁面，碟放上去只見到外面一圈 */
    platter: { r: number };
    /** 碟芯（以碟半徑做 1）：透明膠圈外徑、碟孔（= 唱片夾）、銀邊內徑 */
    hub: { clear: number; clamp: number; rim: number };
    /** 唱臂：軸心、長度、底座半徑、泊位同落針角度；`bend` = 針頭殼向邊一邊彎（−1：臂向右伸時向上，即係向碟心） */
    arm: Point & {
        length: number;
        base: number;
        parkDeg: number;
        playDeg: number;
        bend: 1 | -1;
    };
    /**
     * 轉碟時其他碟沿弧線排（設計稿 discPose()）：弧線半徑、第一張嘅角度、每張隔幾多度、縮細比例、白紗透明度、
     * 字母盤閂埋時每張碟再散開幾多（× stepDeg）；`shown` = 字母盤打開時見到嘅碟（離揀中嗰張 from 至 to 張）
     */
    orbit: {
        r: number;
        startDeg: number;
        stepDeg: number;
        scale: number;
        veil: number;
        spread: number;
        shown: { from: number; to: number };
    };
    /** 三粒細掣：半徑、光圈、icon 大細同位置 */
    buttons: {
        r: number;
        ringGap: number;
        ringWidth: number;
        iconSize: number;
        items: readonly (Point & { id: ButtonId })[];
    };
    /**
     * 轉碟旋鈕；`heartHitGap` = ♥ 嘅感應方格離旋鈕邊幾遠（方格由旋鈕邊向外伸，唔同旋鈕重疊）；
     * `turnDeadZone` = 拖動時 pointer 離旋鈕中心少過幾多（× 感應半徑）唔計角度（太近中心，角度會亂跳）；
     * `turnThresholdPx` = 未㩒夠時間，pointer 郁過幾多 CSS px 就當開始擰（即刻開字母盤，S-152）
     */
    knob: Point & { r: number; heartHitGap: number; turnDeadZone: number; turnThresholdPx: number };
    /** 刻度弧：固定由 fromDeg 去到 toDeg；每張專輯一格平均分佈，最尾一格（toDeg）係 ♥ */
    scale: {
        fromDeg: number;
        toDeg: number;
        inner: number;
        outer: number;
        long: number;
        heart: number;
        heartGap: number;
    };
    /**
     * 轉碟時環繞旋鈕嘅字母盤（設計稿 DIAL、DIAL_ALL_UP_TO、DIAL_MAX_LETTERS、DIAL_CLEARANCE、DIAL_DOT、DIAL_MOTION）：
     * 底盤內外半徑、字母半徑、揀中同其他字母嘅字級；`letterRule` = 碟多時嘅字母規則（Functional Spec D28）：
     * 幾多格或以下每格都出字母、最多幾個字母、淨空 = 字母半徑 × clearanceStepDeg 嘅弧長 × clearanceFactor；
     * `dotR` = 冇出字母嗰格嘅細點半徑；`plateFrom`、`keyFrom` = 打開過場嘅起點（底盤 scale、字母嘅半徑同 scale）
     */
    dial: {
        inner: number;
        outer: number;
        letters: number;
        current: number;
        other: number;
        letterRule: {
            allUpTo: number;
            maxLetters: number;
            clearanceStepDeg: number;
            clearanceFactor: number;
        };
        dotR: number;
        plateFrom: number;
        keyFrom: number;
    };
    /** 螺絲；`zoneIndex` 嗰粒（左下）周圍唔放控件 */
    screws: { points: readonly Point[]; zoneIndex: number };
    /** 左上資訊、右上版本號（貼頂組） */
    info: InfoLayout;
    /** 拎住另一隻碟時右上角嘅細唱片機（貼頂組） */
    miniTurntable: MiniTurntableLayout;
    /** 碟名下面嘅歌單欄同碟上面嘅半透明層 */
    heldTracks: HeldTracksLayout;
    /** Preload 旗幟畫面 */
    preload: PreloadLayout;
    /** 歌單同歌書：沿住同碟同心嘅弧線排 */
    arc: { r: number; stepDeg: number };
    /** 弧線歌單（㩒碟面；T-037） */
    list: ArcListLayout;
    /** 淨空同感應範圍規則（Functional Spec CR-002） */
    clearance: {
        /** 掣（連光圈）同 CD */
        cd: number;
        /** 任何控件同轉盤邊 */
        platter: number;
        /** 細掣（連光圈）同旋鈕刻度 */
        controlGap: number;
        /** 左下螺絲周圍 */
        screwZone: number;
        /** 最細感應範圍（pt）同呢個版面嘅參考闊度（pt）：用嚟將 pt 換算做設計單位 */
        hitPt: number;
        viewportPt: number;
    };
}
