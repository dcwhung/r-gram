/*
 * API-021 可以改嘅歌曲欄位（Functional Spec D37）：只喺管理端用嘅參考欄（歌詞參考連結、備註）
 * 同手動指定音檔 / MV。歌名、副題、credit 經歌曲文字（API-041），歌號經排序（API-023）。
 * 手動指定嘅 R2 key（Technical Spec「安全設計 → R2 key 驗證」）：唔可以有 `..`、唔可以 `/` 開頭；
 * 存唔存在要問 R2，喺 validate.ts 做
 */
import type { zhHant } from '../i18n/zh-Hant';
import {
    charCount,
    fail,
    HIDDEN_CHARACTER,
    nullable,
    ok,
    text,
    type Rule as FieldRule,
} from '../lib/fields';

export type TrackReason = keyof typeof zhHant.tracks.reasons;

type Rule = FieldRule<TrackReason>;

/** 備註：一行文字 */
export const NOTE_MAX_CHARS = 1000;
/** 歌詞參考連結 */
const URL_MAX_CHARS = 2000;
/** R2 object key 嘅上限（UTF-8 byte） */
export const MEDIA_KEY_MAX_BYTES = 1024;
const HTTPS_PREFIX = 'https://';
const PARENT_SEGMENT = '..';
const KEY_ROOT = '/';

/** 空白（trim 之後）當清走 */
const blankAsNull =
    (rule: Rule): Rule =>
    (value) =>
        typeof value === 'string' && value.trim() === '' ? ok(null) : rule(value);

const isHttpsUrl = (value: string): boolean => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname !== '';
    } catch {
        return false;
    }
};

/** 只收 https://（D1 CHECK 一樣）；唔入 catalog，管理端開新分頁用 */
const lyricsSourceUrl: Rule = (value) => {
    if (typeof value !== 'string') return fail('INVALID_URL');
    const url = value.trim();
    const valid =
        url.startsWith(HTTPS_PREFIX) &&
        !HIDDEN_CHARACTER.test(url) &&
        charCount(url) <= URL_MAX_CHARS &&
        isHttpsUrl(url);
    return valid ? ok(url) : fail('INVALID_URL');
};

/** R2 key 原樣存（檔名可以有空格、中文）；唔 trim，key 一定要同 R2 一字不差 */
const mediaKey: Rule = (value) => {
    const valid =
        typeof value === 'string' &&
        value !== '' &&
        !value.startsWith(KEY_ROOT) &&
        !value.includes(PARENT_SEGMENT) &&
        !HIDDEN_CHARACTER.test(value) &&
        new TextEncoder().encode(value).length <= MEDIA_KEY_MAX_BYTES;
    return valid ? ok(value) : fail('INVALID_MEDIA_KEY');
};

export const TRACK_FIELD_RULES = {
    lyricsSourceUrl: nullable(blankAsNull(lyricsSourceUrl)),
    note: nullable(blankAsNull(text(false, NOTE_MAX_CHARS))),
    audio: nullable(mediaKey),
    mv: nullable(mediaKey),
} satisfies Record<string, Rule>;

export type TrackField = keyof typeof TRACK_FIELD_RULES;

/** 手動指定檔案嘅兩個欄：key 欄 + 「手動」旗 */
export const MEDIA_FIELDS = ['audio', 'mv'] as const satisfies readonly TrackField[];
