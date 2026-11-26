/*
 * 同步 API（API-033、034、035）嘅錯誤回應同逐項結果：Technical Spec 錯誤格式 + i18n 書面語（zhHant.sync）
 */
import { TRACK_NO_MAX, TRACK_NO_MIN } from '@r-gram/catalog';
import type { Context } from 'hono';
import { errorResponder, messageBuilder, withMessages, type ErrorKind } from '../api/errors';
import { ERROR_CODE, HTTP_STATUS, SYNC_REMOVALS_MAX } from '../config';
import type { MessageParams } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { BODY_PATH, UNKNOWN_FIELDS_MAX } from '../lib/fields';

export type SyncReason = keyof typeof zhHant.sync.reasons;
export type SyncSituation = keyof typeof zhHant.sync.errors;
export type ItemCode = keyof typeof zhHant.sync.items;

const SITUATIONS: Record<SyncSituation, ErrorKind> = {
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    invalidFolder: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.invalidFolder },
    folderEmpty: { status: HTTP_STATUS.notFound, code: ERROR_CODE.folderEmpty },
    duplicateAlbumId: { status: HTTP_STATUS.conflict, code: ERROR_CODE.duplicateAlbumId },
    folderMismatch: { status: HTTP_STATUS.conflict, code: ERROR_CODE.folderMismatch },
};

const REASON_PARAMS: Partial<Record<SyncReason, MessageParams>> = {
    TOO_MANY_UNKNOWN_FIELDS: { max: UNKNOWN_FIELDS_MAX },
    INVALID_NUMBER: { min: TRACK_NO_MIN, max: TRACK_NO_MAX },
    TOO_MANY_ITEMS: { max: SYNC_REMOVALS_MAX },
};

export const syncReasonMessage = messageBuilder(zhHant.sync.reasons, REASON_PARAMS);
export const itemMessage = messageBuilder(zhHant.sync.items);

export const syncError = errorResponder(SITUATIONS, messageBuilder(zhHant.sync.errors));

export interface SyncDetail {
    path: string;
    reason: SyncReason;
}

export const syncValidationError = (c: Context, issues: readonly SyncDetail[]) =>
    syncError(c, 'invalid', withMessages(issues, syncReasonMessage));

export const syncNotAnObject = (c: Context) =>
    syncValidationError(c, [{ path: BODY_PATH, reason: 'NOT_AN_OBJECT' }]);

export interface FailedItem {
    ok: false;
    code: ItemCode;
    message: string;
}

export const failedItem = (code: ItemCode): FailedItem => ({
    ok: false,
    code,
    message: itemMessage(code),
});
