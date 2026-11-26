/* 歌曲文字（Functional Spec D31、D32、D37；CR-007 D72 刪副題）嘅型別：管理端一首歌一個文字框，儲存時拆返做分開嘅欄位（D33） */
import type { LyricLine, PlainLyricLine } from '../lrc/parseLrc';
import type { TrackCredits } from '../schema/types';

/** `source` = 文字框入面歌詞部分嘅原文（已正規化：每行去尾空白、頭尾空行刪走），D1 `lyrics.source` */
export type SongLyrics =
    | { source: string; synced: true; lines: LyricLine[] }
    | { source: string; synced: false; lines: PlainLyricLine[] };

export interface SongText {
    title: string;
    /** 四項都冇就成個係 null（同 catalog 一樣） */
    credits: TrackCredits | null;
    /** 冇歌詞部分 = null */
    lyrics: SongLyrics | null;
}

/** `formatSongText()` 嘅輸入：D1 儲存嘅欄位（歌詞只要原文）。`SongText` 可以直接傳入 */
export interface SongTextFields {
    title: string;
    credits: TrackCredits | null;
    lyrics: { source: string } | null;
}

export type SongTextErrorCode =
    | 'TOO_LARGE'
    | 'TOO_MANY_LINES'
    | 'TITLE_REQUIRED'
    | 'TITLE_TOO_LONG'
    | 'DUPLICATE_LABEL'
    | 'CREDIT_TOO_LONG'
    | 'LINE_TOO_LONG'
    | 'MIXED_TIMESTAMPS'
    | 'BAD_TIMESTAMP'
    | 'BAD_OFFSET';

export interface SongTextError {
    /** 成段文字入面嘅行號（由 1 開始）；講成段文字嘅錯（`TOO_LARGE`、`TOO_MANY_LINES`）係 0 */
    line: number;
    code: SongTextErrorCode;
    /** 出錯嗰行嘅原文（已 trim） */
    text: string;
}

/** 唔擋儲存嘅提示（CR-007，Functional Spec D72：舊檔嘅 `副題：` 行照認但唔用） */
export type SongTextHintCode = 'SUBTITLE_IGNORED';

export interface SongTextHint {
    line: number;
    code: SongTextHintCode;
}

/** 有 `errors` 就唔可以儲存；欄位係盡量讀到嘅內容（管理端可以照樣顯示）；`hints` 唔擋 */
export interface SongTextResult extends SongText {
    errors: SongTextError[];
    hints: SongTextHint[];
}
