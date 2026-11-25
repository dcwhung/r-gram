/* 專輯 API 嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.albums） */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ERROR_CODE, HTTP_STATUS, type ErrorCode } from '../config';
import { fillMessage, type MessageParams } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { UNKNOWN_FIELDS_MAX } from '../lib/fields';
import { errorJson } from '../lib/http';
import type { Reason } from './fieldRules';
import { ALBUM_ID_MAX_CHARS, type FieldIssue } from './validate';

type Situation = keyof typeof zhHant.albums.errors;

const SITUATIONS: Record<Situation, { status: ContentfulStatusCode; code: ErrorCode }> = {
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
    stale: { status: HTTP_STATUS.conflict, code: ERROR_CODE.stale },
    idTaken: { status: HTTP_STATUS.conflict, code: ERROR_CODE.conflict },
    orderChanged: { status: HTTP_STATUS.conflict, code: ERROR_CODE.conflict },
    idRemoved: { status: HTTP_STATUS.conflict, code: ERROR_CODE.idRemoved },
};

export const albumError = (c: Context, situation: Situation, details?: readonly unknown[]) => {
    const { status, code } = SITUATIONS[situation];
    return errorJson(c, status, code, zhHant.albums.errors[situation], details);
};

/** 句子入面嘅參數（`{max}` 等）：數字跟常數，唔喺語言檔寫死 */
const REASON_PARAMS: Partial<Record<Reason, MessageParams>> = {
    INVALID_ID: { max: ALBUM_ID_MAX_CHARS },
    TOO_MANY_UNKNOWN_FIELDS: { max: UNKNOWN_FIELDS_MAX },
};

export const reasonMessage = (reason: Reason): string =>
    fillMessage(zhHant.albums.reasons[reason], REASON_PARAMS[reason]);

/** 400 VALIDATION_ERROR：每個欄位錯誤加埋書面語 message */
export const validationError = (c: Context, issues: readonly FieldIssue[]) =>
    albumError(
        c,
        'invalid',
        issues.map((issue) => ({ ...issue, message: reasonMessage(issue.reason) })),
    );

/** body 唔係 JSON object */
export const notAnObject = (c: Context) =>
    validationError(c, [{ path: '$', reason: 'NOT_AN_OBJECT' }]);
