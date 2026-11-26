/*
 * 歌曲 API 嘅 body 驗證：API-041 嘅 `{ text }`。
 * CR-007（D71）：歌號、參考欄、手動指定拎走（API-020、API-021 取消），`text` 以外嘅 key 一律 NOT_EDITABLE
 */
import type { JsonObject } from '../lib/http';
import { parseFieldsWith, type FieldIssue } from '../lib/fields';
import type { zhHant } from '../i18n/zh-Hant';

export type TrackReason = keyof typeof zhHant.tracks.reasons;
export type TrackIssue = FieldIssue<TrackReason>;

const TEXT_KEY = 'text';
const NO_RULES = {};

export interface TextBody {
    text?: string;
    issues: TrackIssue[];
}

export const readTextBody = (body: JsonObject): TextBody => {
    const { issues } = parseFieldsWith<never, TrackReason>(NO_RULES, body, [TEXT_KEY]);
    const value = body[TEXT_KEY];
    if (typeof value === 'string') return { text: value, issues };
    const reason = value === undefined ? 'REQUIRED' : 'NOT_TEXT';
    return { issues: [{ path: TEXT_KEY, reason }, ...issues] };
};
