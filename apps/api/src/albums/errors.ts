/*
 * 專輯 API 嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.albums）。
 * CR-007 之後專輯由同步建立；T-106：`info.txt` 文字框（API-019）同封面結果（API-017）先有 400、409、413
 */
import { INFO_TEXT_MAX_BYTES, INFO_TEXT_MAX_LINES } from '@r-gram/catalog';
import type { Context } from 'hono';
import { errorResponder, messageBuilder, withMessages, type ErrorKind } from '../api/errors';
import { COVER_SIDE_PX, ERROR_CODE, HTTP_STATUS, THUMB_SIDE_PX } from '../config';
import type { MessageParams } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { UNKNOWN_FIELDS_MAX } from '../lib/fields';

export type AlbumSituation = keyof typeof zhHant.albums.errors;
export type AlbumReason = keyof typeof zhHant.albums.reasons;

const SITUATIONS: Record<AlbumSituation, ErrorKind> = {
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    stale: { status: HTTP_STATUS.conflict, code: ERROR_CODE.stale },
    tooLarge: { status: HTTP_STATUS.payloadTooLarge, code: ERROR_CODE.tooLarge },
    noFirstCover: { status: HTTP_STATUS.conflict, code: ERROR_CODE.noFirstCover },
};

const ERROR_PARAMS: Partial<Record<AlbumSituation, MessageParams>> = {
    tooLarge: { maxBytes: INFO_TEXT_MAX_BYTES, maxLines: INFO_TEXT_MAX_LINES },
};
const REASON_PARAMS: Partial<Record<AlbumReason, MessageParams>> = {
    TOO_MANY_UNKNOWN_FIELDS: { max: UNKNOWN_FIELDS_MAX },
    WRONG_SIZE: { cover: COVER_SIDE_PX, thumb: THUMB_SIDE_PX },
};

export const albumErrorMessage = messageBuilder(zhHant.albums.errors, ERROR_PARAMS);
export const albumReasonMessage = messageBuilder(zhHant.albums.reasons, REASON_PARAMS);

export const albumError = errorResponder(SITUATIONS, albumErrorMessage);

export interface AlbumDetail {
    path: string;
    reason: AlbumReason;
}

export const albumValidationError = (c: Context, issues: readonly AlbumDetail[]) =>
    albumError(c, 'invalid', withMessages(issues, albumReasonMessage));
