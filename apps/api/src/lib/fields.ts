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

/**
 * 文字欄共用嘅字元規則：控制字元（Cc：換行、tab）、格式字元（Cf：零寬空格、RTL override、BOM）、
 * 行分隔（Zl，U+2028）、段分隔（Zp，U+2029）。畫面上睇唔到或者會亂排版，亦可以砌出假 log 行。
 * 普通空格同全形空格（Zs）照收
 */
export const HIDDEN_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export const ok = (value: unknown): { ok: true; value: unknown } => ({ ok: true, value });
export const fail = <R extends string>(reason: R): { ok: false; reason: R } => ({
    ok: false,
    reason,
});

/** 按字（code point）計，中文字同 emoji 都當一個字 */
export const charCount = (value: string): number => [...value].length;

export type TextReason = 'INVALID_TEXT' | 'REQUIRED' | 'TOO_LONG';

/** 文字欄：trim 之後存；`required` = 唔可以係空 */
export const text =
    (required: boolean, maxChars: number): Rule<TextReason> =>
    (value) => {
        if (typeof value !== 'string' || HIDDEN_CHARACTER.test(value)) return fail('INVALID_TEXT');
        const trimmed = value.trim();
        if (required && trimmed === '') return fail('REQUIRED');
        return charCount(trimmed) > maxChars ? fail('TOO_LONG') : ok(trimmed);
    };

/** `null` = 清走；其他值交畀 `rule` */
export const nullable =
    <R extends string>(rule: Rule<R>): Rule<R> =>
    (value) =>
        value === null ? ok(null) : rule(value);

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
