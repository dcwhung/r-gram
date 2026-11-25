/*
 * 錯誤回應（Technical Spec「API 設計 → 錯誤格式」）：{ "error": { "code", "message", "details"? } }。
 * message 一律係 i18n/zh-Hant.ts 嘅中文書面語（backlog B-044），包括守門同通用錯誤；
 * 管理端可以直接顯示，亦可以按 code / reason 用自己嘅語言檔出字。
 * 另外：JSON body 同 If-Match 嘅讀法（內容 API 共用）
 */
import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ERROR_CODE, HTTP_STATUS, type ErrorCode } from '../config';
import { zhHant } from '../i18n/zh-Hant';

export const errorJson = (
    c: Context,
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    details?: readonly unknown[],
) => c.json({ error: details ? { code, message, details } : { code, message } }, status);

export const handleNotFound: NotFoundHandler = (c) =>
    errorJson(c, HTTP_STATUS.notFound, ERROR_CODE.notFound, zhHant.errors.notFound);

/**
 * 冇人接嘅 error：回 500，唔將 error 內容畀 client。
 * log 只記 error 類別同 method + route pattern：message 可以夾住用戶資料（email、JSON 片段），query 可以有 OAuth code；
 * 請求嘅 path 係 decode 咗嘅，可以有換行（砌出假 log 行），所以記 pattern（例如 `/api/*`）唔記 path
 */
export const handleError: ErrorHandler = (error, c) => {
    console.error('[api] unhandled error', error.name, `${c.req.method} ${c.req.routePath}`);
    const message = zhHant.errors.internal;
    return errorJson(c, HTTP_STATUS.internalError, ERROR_CODE.internal, message);
};

export type JsonObject = Record<string, unknown>;

export const isJsonObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** body 唔係 JSON object（壞 JSON、array、null、冇 body）→ undefined */
export const readJsonObject = async (c: Context): Promise<JsonObject | undefined> => {
    try {
        const body: unknown = await c.req.json();
        return isJsonObject(body) ? body : undefined;
    } catch {
        return undefined;
    }
};

/** body 太大：唔 parse，直接 413 */
export const BODY_TOO_LARGE = Symbol('body too large');

/**
 * 有上限嘅 JSON object body：字元數（UTF-16）超過 `maxChars` → BODY_TOO_LARGE（未 parse 就擋，
 * 20 MB 嘅貼上唔使行 JSON parser，backlog B-040）；唔係 JSON object → undefined
 */
export const readBoundedJsonObject = async (
    c: Context,
    maxChars: number,
): Promise<JsonObject | undefined | typeof BODY_TOO_LARGE> => {
    const raw = await c.req.text();
    if (raw.length > maxChars) return BODY_TOO_LARGE;
    try {
        const body: unknown = JSON.parse(raw);
        return isJsonObject(body) ? body : undefined;
    } catch {
        return undefined;
    }
};

/** If-Match 嘅值（去 `W/` 同引號）；冇 header → undefined */
export const readIfMatch = (c: Context): string | undefined => {
    const header = c.req.header('if-match');
    if (header === undefined) return undefined;
    return header
        .trim()
        .replace(/^W\//, '')
        .replace(/^"(.*)"$/, '$1');
};
