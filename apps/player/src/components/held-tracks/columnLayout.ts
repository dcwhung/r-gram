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

export interface EntranceTiming {
    staggerMs: number;
    spreadMs: number;
}

/**
 * 歌單欄出現時每行遲幾耐出發（設計稿第 19 版 trackPanel() 嘅 panel-row-in）：中線喺欄底之下一行之內嘅行
 * 由上至下逐行出發，每行遲 stagger；行多就縮短，成欄攤開唔超過 spread。欄外更遠嘅行 = null（唔使飄）
 */
export const entranceDelays = (
    count: number,
    pitch: number,
    room: number,
    { staggerMs, spreadMs }: EntranceTiming,
): (number | null)[] => {
    const shownRows = Math.min(count, Math.ceil(room / pitch));
    const stagger = Math.min(staggerMs, spreadMs / Math.max(1, shownRows));
    return Array.from({ length: count }, (_, index) =>
        rowCentre(index, pitch, 0) <= room + pitch ? index * stagger : null,
    );
};

export interface ReleaseInput {
    pitch: number;
    scroll: number;
    /** 鬆手之後（較短）同字母盤開住（較長）嘅欄高 */
    idleRoom: number;
    openRoom: number;
    /** 欄底淡出高度：淡出區入面嘅行都算讓出 */
    fade: number;
}

/** 鬆手時欄底縮短（B-086 ⑤）：讓出嚟嘅行（中線喺新欄底淡出區或者之下、舊欄底之內），原地淡出 */
export const releasedRows = (
    count: number,
    { pitch, scroll, idleRoom, openRoom, fade }: ReleaseInput,
): number[] =>
    Array.from({ length: count }, (_, index) => index).filter((index) => {
        const centre = rowCentre(index, pitch, scroll);
        return centre > idleRoom - fade && centre <= openRoom;
    });
