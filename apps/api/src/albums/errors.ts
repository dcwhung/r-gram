/* 專輯 API 嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.albums） */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ERROR_CODE, HTTP_STATUS, type ErrorCode } from '../config';
import { zhHant } from '../i18n/zh-Hant';
import { errorJson } from '../lib/http';
import type { FieldIssue } from './validate';

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

/** 400 VALIDATION_ERROR：每個欄位錯誤加埋書面語 message */
export const validationError = (c: Context, issues: readonly FieldIssue[]) =>
    albumError(
        c,
        'invalid',
        issues.map((issue) => ({ ...issue, message: zhHant.albums.reasons[issue.reason] })),
    );

/** body 唔係 JSON object */
export const notAnObject = (c: Context) =>
    validationError(c, [{ path: '$', reason: 'NOT_AN_OBJECT' }]);
