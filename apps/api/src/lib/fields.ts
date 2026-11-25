/*
 * 內容 API 共用嘅 body 欄位驗證（專輯、歌）：每個欄位一條 rule（驗證 + 正規化），錯誤一次過列晒（path + reason）。
 * 未知欄位一律 NOT_EDITABLE；欄位名同數目都有上限，巨大嘅請求唔會變成巨大嘅錯誤回應（S-053、backlog B-046 ①）
 */
import type { JsonObject } from './http';

export type RuleResult<R extends string> = { ok: true; value: unknown } | { ok: false; reason: R };

export type Rule<R extends string> = (value: unknown) => RuleResult<R>;

export interface FieldIssue<R extends string> {
    path: string;
    reason: R;
}

export type UnknownFieldReason = 'NOT_EDITABLE' | 'TOO_MANY_UNKNOWN_FIELDS';

/** 未知欄位名原樣回傳做 details[].path 時嘅上限：100 KB 嘅 key 唔可以變成 100 KB 嘅錯誤回應 */
export const UNKNOWN_KEY_MAX_CHARS = 64;
/** 逐個列出嘅未知欄位上限；再多就只加一條總結（path `$`、reason TOO_MANY_UNKNOWN_FIELDS） */
export const UNKNOWN_FIELDS_MAX = 20;
/** 講成個 body 嘅錯誤用嘅 path */
export const BODY_PATH = '$';

/** 按字（code point）截短，唔會切開 emoji / 罕見字嘅 surrogate pair */
const boundedPath = (key: string): string => [...key].slice(0, UNKNOWN_KEY_MAX_CHARS).join('');

export interface ParsedFields<F extends string, R extends string> {
    fields: Partial<Record<F, unknown>>;
    issues: FieldIssue<R | UnknownFieldReason>[];
}

/** body 入面除咗 `skip` 之外嘅 key：`rules` 有嘅就驗，其他一律 NOT_EDITABLE（最多列 UNKNOWN_FIELDS_MAX 個） */
export const parseFieldsWith = <F extends string, R extends string>(
    rules: Readonly<Record<F, Rule<R>>>,
    body: JsonObject,
    skip: readonly string[] = [],
): ParsedFields<F, R> => {
    const fields: Partial<Record<F, unknown>> = {};
    const issues: FieldIssue<R | UnknownFieldReason>[] = [];
    let unknownCount = 0;
    for (const [key, value] of Object.entries(body)) {
        if (skip.includes(key)) continue;
        if (!Object.hasOwn(rules, key)) {
            unknownCount += 1;
            if (unknownCount <= UNKNOWN_FIELDS_MAX)
                issues.push({ path: boundedPath(key), reason: 'NOT_EDITABLE' });
            continue;
        }
        const result = rules[key as F](value);
        if (result.ok) fields[key as F] = result.value;
        else issues.push({ path: key, reason: result.reason });
    }
    if (unknownCount > UNKNOWN_FIELDS_MAX)
        issues.push({ path: BODY_PATH, reason: 'TOO_MANY_UNKNOWN_FIELDS' });
    return { fields, issues };
};
