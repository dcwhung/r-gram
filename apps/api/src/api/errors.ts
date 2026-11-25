/*
 * 內容 API（專輯、歌）共用嘅錯誤回應：情況 → status + code + 語言檔 message；
 * 欄位錯誤（details[]）逐項按 reason 加 message。句子嘅 `{name}` 參數由各 API 嘅常數表填入
 */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ErrorCode } from '../config';
import { fillMessage, type MessageParams } from '../i18n/fillMessage';
import { errorJson } from '../lib/http';

export interface ErrorKind {
    status: ContentfulStatusCode;
    code: ErrorCode;
}

/** 語言檔一組句子 → 按 key 出 message（有參數就填） */
export const messageBuilder =
    <K extends string>(
        messages: Readonly<Record<K, string>>,
        params: Partial<Record<K, MessageParams>> = {},
    ) =>
    (key: K): string =>
        fillMessage(messages[key], params[key]);

/** 情況表 + message → `(c, situation, details?)` 錯誤回應 */
export const errorResponder =
    <S extends string>(kinds: Readonly<Record<S, ErrorKind>>, message: (situation: S) => string) =>
    (c: Context, situation: S, details?: readonly unknown[]) =>
        errorJson(c, kinds[situation].status, kinds[situation].code, message(situation), details);

/** details 每項加書面語 message（按 reason） */
export const withMessages = <R extends string, T extends { reason: R }>(
    issues: readonly T[],
    message: (reason: R) => string,
) => issues.map((issue) => ({ ...issue, message: message(issue.reason) }));
