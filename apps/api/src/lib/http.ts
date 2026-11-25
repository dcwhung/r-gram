/*
 * 錯誤回應（Technical Spec「API 設計 → 錯誤格式」）：{ "error": { "code", "message" } }。
 * message 係畀開發者睇嘅英文；畫面文字由管理端按 code 出
 */
import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ERROR_CODE, HTTP_STATUS, type ErrorCode } from '../config';

export const errorJson = (
    c: Context,
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
) => c.json({ error: { code, message } }, status);

export const handleNotFound: NotFoundHandler = (c) =>
    errorJson(c, HTTP_STATUS.notFound, ERROR_CODE.notFound, 'not found');

/**
 * 冇人接嘅 error：回 500，唔將 error 內容畀 client。
 * log 只記 error 類別同 method + route pattern：message 可以夾住用戶資料（email、JSON 片段），query 可以有 OAuth code；
 * 請求嘅 path 係 decode 咗嘅，可以有換行（砌出假 log 行），所以記 pattern（例如 `/api/*`）唔記 path
 */
export const handleError: ErrorHandler = (error, c) => {
    console.error('[api] unhandled error', error.name, `${c.req.method} ${c.req.routePath}`);
    return errorJson(c, HTTP_STATUS.internalError, ERROR_CODE.internal, 'internal error');
};
