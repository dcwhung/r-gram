/*
 * 拎住嘅碟嘅歌單欄嘅幾何（純函數；設計稿第 18 版 panelMetrics()、trackPanel()；Functional Spec FR-044）。
 * 全部以欄頂做 0、設計單位計；`room` = 欄高（欄底 − 欄頂），`scroll` = 向上捲咗幾多。
 */

/** 可捲距離：全部行嘅高度減欄高；放得晒 = 0 */
export const maxScroll = (count: number, pitch: number, room: number): number =>
    Math.max(0, count * pitch - room);

export const clampScroll = (scroll: number, most: number): number =>
    Math.min(Math.max(0, most), Math.max(0, scroll));

/** 第 index 行嘅中線（離欄頂） */
export const rowCentre = (index: number, pitch: number, scroll: number): number =>
    pitch * (index + 0.5) - scroll;

/** focus 到某一行：唔喺欄入面就捲到啱啱見到成行（鍵盤 Tab） */
export const scrollToShow = (
    index: number,
    pitch: number,
    room: number,
    scroll: number,
): number => {
    const rowTop = index * pitch;
    if (rowTop < scroll) return rowTop;
    const rowBottom = rowTop + pitch;
    return rowBottom > scroll + room ? rowBottom - room : scroll;
};

export interface ColumnInput {
    count: number;
    pitch: number;
    room: number;
    scroll: number;
    /** 位置條最短幾長（設計稿寫死 60） */
    minThumb: number;
}

/** 位置條：長度同離欄頂幾遠 */
export interface ScrollBarMetrics {
    length: number;
    offset: number;
}

export interface ColumnMetrics {
    maxScroll: number;
    /** 夾好嘅捲動值 */
    scroll: number;
    /** 頂淡出：捲咗先有；底淡出：下面仲有先有 */
    fadeTop: boolean;
    fadeBottom: boolean;
    /** 放得晒就冇位置條 */
    bar: ScrollBarMetrics | null;
}

/** 位置條長度 = 欄高 × 見到嘅比例（唔短過 minThumb）；位置跟捲動比例 */
const scrollBar = ({ count, pitch, room, minThumb }: ColumnInput, scroll: number, most: number) => {
    const length = Math.max(minThumb, (room * room) / (count * pitch));
    return { length, offset: (room - length) * (scroll / most) };
};

export const columnMetrics = (input: ColumnInput): ColumnMetrics => {
    const most = maxScroll(input.count, input.pitch, input.room);
    const scroll = clampScroll(input.scroll, most);
    return {
        maxScroll: most,
        scroll,
        fadeTop: scroll > 0,
        fadeBottom: scroll < most,
        bar: most > 0 ? scrollBar(input, scroll, most) : null,
    };
};
