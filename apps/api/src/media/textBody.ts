/*
 * 兩個文字框嘅儲存 body（T-106；API-019 `info.txt`、API-041 歌曲文字）：`{ text, etag }`。
 * `text` 一定係字串；`etag` = 讀入時嘅 ETag（R2 httpEtag，有引號）或者 null（新檔）。其他欄 = NOT_EDITABLE。
 * body 字元數先擋（未 parse JSON，backlog B-040）：每個字都可以寫成 `\uXXXX`，加 `{"text":"","etag":…}` 嘅位
 */
import type { Context } from 'hono';
import { BODY_PATH, ok, parseFieldsWith, type FieldIssue, type Rule } from '../lib/fields';
import { BODY_TOO_LARGE, readBoundedJsonObject, type JsonObject } from '../lib/http';
import { MEDIA_ETAG } from './writeText';

const JSON_ESCAPE_CHARS = 6;
const BODY_ENVELOPE_CHARS = 1024;

/** 文字上限 `maxBytes` 嘅 body 最多幾多字元 */
export const textBodyMaxChars = (maxBytes: number): number =>
    maxBytes * JSON_ESCAPE_CHARS + BODY_ENVELOPE_CHARS;

export type TextBodyReason =
    | 'REQUIRED'
    | 'NOT_AN_OBJECT'
    | 'NOT_TEXT'
    | 'INVALID_VALUE'
    | 'NOT_EDITABLE'
    | 'TOO_MANY_UNKNOWN_FIELDS';

export type TextBodyIssue = FieldIssue<TextBodyReason>;

export type TextBody =
    { ok: true; text: string; etag: string | null } | { ok: false; issues: TextBodyIssue[] };

const RULES: Readonly<Record<'text' | 'etag', Rule<TextBodyReason>>> = {
    text: (value) => (typeof value === 'string' ? ok(value) : { ok: false, reason: 'NOT_TEXT' }),
    etag: (value) =>
        value === null || (typeof value === 'string' && MEDIA_ETAG.test(value))
            ? ok(value)
            : { ok: false, reason: 'INVALID_VALUE' },
};

export const readTextFields = (body: JsonObject): TextBody => {
    const { fields, issues } = parseFieldsWith(RULES, body);
    const missing = (['text', 'etag'] as const)
        .filter((field) => !(field in body))
        .map((path): TextBodyIssue => ({ path, reason: 'REQUIRED' }));
    const all = [...missing, ...issues];
    if (all.length > 0) return { ok: false, issues: all };
    return { ok: true, text: fields.text as string, etag: fields.etag as string | null };
};

/** 請求 body → `{ text, etag }`；太大 → 'tooLarge'（未 parse） */
export const readTextRequest = async (
    c: Context,
    maxBytes: number,
): Promise<TextBody | 'tooLarge'> => {
    const body = await readBoundedJsonObject(c, textBodyMaxChars(maxBytes));
    if (body === BODY_TOO_LARGE) return 'tooLarge';
    if (!body) return { ok: false, issues: [{ path: BODY_PATH, reason: 'NOT_AN_OBJECT' }] };
    return readTextFields(body);
};
