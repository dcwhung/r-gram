/*
 * 檢查結果（Functional Spec D77、FR-130；Technical Spec「CR-007 → 資料模型」`albums.checks`、「API 一覽嘅變化」嘅碼）。
 * 兩個級別：error = 需要處理，warning = 提示。全部唔擋同步，只係講畀管理員知。
 * 訊息由各 app 嘅語言檔按 `code` 同 `params` 砌（書面語）；呢度只有碼同級別
 */

/** 檢查結果嘅碼；`INFO_*` 由 `parseAlbumInfo()` 出，其餘由同步（T-105）同封面結果（T-106）出 */
export const CHECK_LEVELS = {
    INVALID_FOLDER_NAME: 'error',
    DUPLICATE_ALBUM_ID: 'error',
    DUPLICATE_ORDINAL: 'warning',
    NO_INFO: 'warning',
    INFO_BAD_ENCODING: 'error',
    INFO_TOO_LARGE: 'error',
    INFO_UNKNOWN_LINE: 'warning',
    INFO_DUPLICATE_LABEL: 'warning',
    INFO_DUPLICATE_NUMBER: 'warning',
    INFO_BAD_YEAR: 'warning',
    INFO_NO_TITLE: 'warning',
    INFO_TOO_LONG: 'warning',
    AUDIO_NOT_LISTED: 'error',
    FILE_WITHOUT_TRACK: 'warning',
    NO_AUDIO: 'warning',
    TITLE_MISMATCH: 'warning',
    TEXT_INVALID: 'error',
    AUDIO_CONFLICT: 'error',
    MV_CONFLICT: 'error',
    TEXT_CONFLICT: 'error',
    COVER_CONFLICT: 'error',
    NO_FIRST_COVER: 'warning',
    COVER_FAILED: 'error',
    COVER_NOT_SQUARE: 'warning',
    SUBTITLE_IGNORED: 'warning',
} as const;

export type CheckCode = keyof typeof CHECK_LEVELS;
export type CheckLevel = (typeof CHECK_LEVELS)[CheckCode];

export interface Check {
    level: CheckLevel;
    code: CheckCode;
    /** 邊個檔（R2 key）；`parseAlbumInfo()` 唔知 key，由同步補 */
    key?: string;
    /** 檔入面第幾行（由 1 開始）；講成個檔嘅冇 */
    line?: number;
    /** 邊首歌（歌號） */
    no?: number;
    /** 砌訊息用嘅值（例如 `{ no: 5 }`、`{ max: 200 }`） */
    params: Record<string, string | number>;
}

/** 照碼揀級別，唔使每個地方自己寫 */
export const checkOf = (
    code: CheckCode,
    place: Pick<Check, 'key' | 'line' | 'no'> = {},
    params: Check['params'] = {},
): Check => ({ level: CHECK_LEVELS[code], code, ...place, params });
