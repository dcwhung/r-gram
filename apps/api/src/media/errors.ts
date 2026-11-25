/*
 * 掃描 API（API-030、API-031、API-032）嘅錯誤回應同 message：Technical Spec 錯誤格式 + i18n 書面語（zhHant.scan）。
 * 歌曲文字檔嘅逐行錯誤 reason = packages/catalog 嘅錯誤碼，message 同 API-041 一樣（zhHant.tracks.reasons）；
 * 檔案層面嘅 BAD_ENCODING、FILE_NOT_FOUND 喺 zhHant.scan.reasons
 */
import { TRACK_NO_MAX, TRACK_NO_MIN } from '@r-gram/catalog';
import type { Context } from 'hono';
import { errorResponder, messageBuilder, withMessages, type ErrorKind } from '../api/errors';
import { ERROR_CODE, HTTP_STATUS, SCAN_APPLY_MAX_ITEMS } from '../config';
import type { MessageParams } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { BODY_PATH, UNKNOWN_FIELDS_MAX } from '../lib/fields';
import { trackReasonMessage, type TrackReason } from '../tracks/errors';

export type ScanReason = keyof typeof zhHant.scan.reasons;
export type ScanSituation = keyof typeof zhHant.scan.errors;
export type ItemCode = keyof typeof zhHant.scan.items;

const SITUATIONS: Record<ScanSituation, ErrorKind> = {
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
    folderEmpty: { status: HTTP_STATUS.notFound, code: ERROR_CODE.folderEmpty },
};

const REASON_PARAMS: Partial<Record<ScanReason, MessageParams>> = {
    TOO_MANY_UNKNOWN_FIELDS: { max: UNKNOWN_FIELDS_MAX },
    INVALID_NUMBER: { min: TRACK_NO_MIN, max: TRACK_NO_MAX },
    TOO_MANY_ITEMS: { max: SCAN_APPLY_MAX_ITEMS },
};

export const scanReasonMessage = messageBuilder(zhHant.scan.reasons, REASON_PARAMS);
export const scanErrorMessage = messageBuilder(zhHant.scan.errors);
export const itemMessage = messageBuilder(zhHant.scan.items);

export const scanError = errorResponder(SITUATIONS, scanErrorMessage);

export interface ScanDetail {
    path: string;
    reason: ScanReason;
}

export const scanValidationError = (c: Context, issues: readonly ScanDetail[]) =>
    scanError(c, 'invalid', withMessages(issues, scanReasonMessage));

export const scanNotAnObject = (c: Context) =>
    scanValidationError(c, [{ path: BODY_PATH, reason: 'NOT_AN_OBJECT' }]);

/** 歌曲文字檔嘅錯誤：行號（檔案層面 = 0）+ reason + message */
export type TextErrorReason = TrackReason | Extract<ScanReason, 'BAD_ENCODING' | 'FILE_NOT_FOUND'>;

export interface TextError {
    line: number;
    reason: TextErrorReason;
    message: string;
}

const isScanReason = (reason: TextErrorReason): reason is TextErrorReason & ScanReason =>
    Object.hasOwn(zhHant.scan.reasons, reason);

export const textError = (line: number, reason: TextErrorReason): TextError => ({
    line,
    reason,
    message: isScanReason(reason) ? scanReasonMessage(reason) : trackReasonMessage(reason),
});

/** 有 reason 嘅項目（skipped、unmatchedFiles）加 message */
export const withReasonMessages = <T extends { reason: ScanReason }>(items: readonly T[]) =>
    withMessages(items, scanReasonMessage);
