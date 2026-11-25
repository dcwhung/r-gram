/* 歌曲 API 嘅 body 驗證：API-021 欄位（連 R2 存在檢查）、API-020 嘅 `{ no?, text }`、API-041 嘅 `{ text }` */
import type { JsonObject } from '../lib/http';
import { parseFieldsWith, type FieldIssue, type ParsedFields, type Rule } from '../lib/fields';
import { MEDIA_FIELDS, TRACK_FIELD_RULES, type TrackField, type TrackReason } from './fieldRules';

export type TrackIssue = FieldIssue<TrackReason>;
export type TrackFields = Partial<Record<TrackField, unknown>>;

const TEXT_KEY = 'text';
/** `text` 以外可以帶嘅欄（API-041：冇；API-020：`no`） */
export type TextBodyRules = Readonly<Partial<Record<TrackField, Rule<TrackReason>>>>;
export const NO_RULES: TextBodyRules = {};

export interface TextBody {
    text?: string;
    fields: TrackFields;
    issues: TrackIssue[];
}

export const parseTrackFields = (body: JsonObject): ParsedFields<TrackField, TrackReason> =>
    parseFieldsWith(TRACK_FIELD_RULES, body);

/** 手動指定嘅檔案要喺媒體 bucket（rb-discography）入面（Technical Spec「安全設計」：儲存前 MEDIA.head(key)） */
export const missingMediaIssues = async (
    media: R2Bucket,
    fields: TrackFields,
): Promise<TrackIssue[]> => {
    const named = MEDIA_FIELDS.filter((field) => typeof fields[field] === 'string');
    const found = await Promise.all(named.map((field) => media.head(fields[field] as string)));
    return named
        .filter((_, index) => found[index] === null)
        .map((field) => ({ path: field, reason: 'MEDIA_NOT_FOUND' }));
};

/** `{ text: string }` + `rules` 嘅欄；其他 key 一律 NOT_EDITABLE（歌曲文字以外嘅欄位經 API-021） */
export const readTextBody = (body: JsonObject, rules: TextBodyRules = NO_RULES): TextBody => {
    const { fields, issues } = parseFieldsWith(
        rules as Readonly<Record<TrackField, Rule<TrackReason>>>,
        body,
        [TEXT_KEY],
    );
    const value = body[TEXT_KEY];
    if (typeof value === 'string') return { text: value, fields, issues };
    const reason = value === undefined ? 'REQUIRED' : 'NOT_TEXT';
    return { fields, issues: [{ path: TEXT_KEY, reason }, ...issues] };
};
