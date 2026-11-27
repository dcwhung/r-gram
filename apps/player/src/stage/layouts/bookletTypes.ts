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

export interface BookletLayout {
    /** 暗層：成個舞台黑色幾多（中間留唱片夾個窿） */
    veil: number;
    credits: BookletCreditsLayout;
    frame: BookletFrameLayout;
}
