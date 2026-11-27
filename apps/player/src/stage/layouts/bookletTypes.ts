/*
 * 歌書嘅幾何表型別（T-072；設計稿第 18 版「歌書（㩒 i）」booklet()、CREDITS、dimLayer()、focusFrame()）。
 * 全部係 1080 × 1920 嘅設計單位；曲詞編監跟貼頂組，框線同歌詞跟碟（貼底組）。
 */

/**
 * 曲詞編監：左邊一欄，冇資料嘅項目唔顯示（下面嘅行向上補位）。第一行基線 `y`，行距 `pitch`；
 * 「曲／詞／編／監」字級 `label`（專輯著燈色），名喺佢右邊 `valueDx`、字級 `value`。
 * 名太長（設計稿冇畫）：縮字最細 `minSize`（每次 `step`），再放唔落先用「…」；右邊停喺轉盤邊
 *（clearance.platter）之外，轉盤上面嘅高度就停喺 `maxRight`
 */
export interface BookletCreditsLayout {
    x: number;
    y: number;
    pitch: number;
    label: number;
    value: number;
    valueDx: number;
    minSize: number;
    step: number;
    maxRight: number;
}

/** 白色框線（接住唱片夾）：高、左邊圓頭前面留 `gap`、線粗（CSS px，唔跟縮放） */
export interface BookletFrameLayout {
    height: number;
    gap: number;
    stroke: number;
}

/** 其他行越遠越淡：離框 1 行係 `near`，之後每行減 `step`，最淡 `min` */
export interface LyricFade {
    near: number;
    step: number;
    min: number;
}

/**
 * 有時間標記、而家嗰行一列放得落（設計稿第 18 版 ARC）：而家嗰行字級 `now`，放唔落先縮（每次 `nowStep`，
 * 最細 `nowMin`）；其他行字級 `other`，沿弧線（arc.r、arc.stepDeg）上下各 `around` 行
 */
export interface ArcLyricsLayout {
    now: number;
    nowMin: number;
    nowStep: number;
    other: number;
    around: number;
    fade: LyricFade;
}

/**
 * 有時間標記、而家嗰行縮到最細都放唔落（設計稿第 17 版 LONG）：喺框入面斷成幾列（字級 `size`、列距 `pitch`），
 * 框高 = 列數 × pitch + `pad`；最多 `maxRows` 列（設計稿冇畫：再長嘅最後一列唔斷，放唔落嘅部分喺右邊淡出）。
 * 其他行由框線邊隔 `gap` 起計，字級 `other`、行距 `otherPitch`，上下各 `around` 行
 */
export interface LongLyricsLayout {
    size: number;
    pitch: number;
    pad: number;
    maxRows: number;
    gap: number;
    other: number;
    otherPitch: number;
    around: number;
    fade: LyricFade;
}

/**
 * 冇時間標記（設計稿第 17 版 PLAIN_LAYOUT、PLAIN）：直身一欄，左邊 `x`、頂 `top`（跟貼頂組）、底 `bottom`
 *（跟貼底組）、字級 `size`、行距 = 字級 × `pitch`、續行縮入 `indentEm` 個字；頂底淡出高 `fade`
 */
export interface PlainLyricsLayout {
    x: number;
    top: number;
    bottom: number;
    size: number;
    pitch: number;
    indentEm: number;
    fade: number;
}

/**
 * 歌書歌詞（T-082）。右邊界：同唱片夾同一個高度（離碟心高度少過唱片夾窿半徑 + `hubGap`）嘅行同純文字欄
 * 去到唱片夾窿左邊 `hubGap`；其餘行去到畫面右邊 `edgeGap`。其他行放唔落嘅部分喺右邊淡出（闊 `cutFade`）。
 * 框入面：字離框線左邊 `inset`、唱片夾窿邊留 `rim`（框內闊，設計稿 = 410）
 */
export interface BookletLyricsLayout {
    hubGap: number;
    edgeGap: number;
    cutFade: number;
    inset: number;
    rim: number;
    arc: ArcLyricsLayout;
    long: LongLyricsLayout;
    plain: PlainLyricsLayout;
}

export interface BookletLayout {
    /** 暗層：成個舞台黑色幾多（中間留唱片夾個窿） */
    veil: number;
    credits: BookletCreditsLayout;
    frame: BookletFrameLayout;
    lyrics: BookletLyricsLayout;
}
