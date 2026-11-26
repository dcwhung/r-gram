/*
 * 歌曲 API 嘅錯誤回應同提示：Technical Spec 錯誤格式 + i18n 書面語（zhHant.tracks）。
 * 歌曲文字嘅逐行錯誤：reason = packages/catalog 嘅錯誤碼（同專輯 API 嘅 details[].reason 一樣嘅位）
 */
import {
    CREDIT_MAX_CHARS,
    LYRIC_LINE_MAX_CHARS,
    SONG_TEXT_MAX_BYTES,
    SONG_TEXT_MAX_LINES,
    TITLE_MAX_CHARS,
} from '@r-gram/catalog';
import type { Context } from 'hono';
import { errorResponder, messageBuilder, withMessages, type ErrorKind } from '../api/errors';
import { ERROR_CODE, HTTP_STATUS } from '../config';
import type { MessageParams } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { BODY_PATH, UNKNOWN_FIELDS_MAX } from '../lib/fields';
export type TrackReason = keyof typeof zhHant.tracks.reasons;
export type TrackSituation = keyof typeof zhHant.tracks.errors;
export type HintReason = keyof typeof zhHant.tracks.hints;

const BYTES_PER_KB = 1024;

const SITUATIONS: Record<TrackSituation, ErrorKind> = {
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
    stale: { status: HTTP_STATUS.conflict, code: ERROR_CODE.stale },
    lyricsRemoved: { status: HTTP_STATUS.conflict, code: ERROR_CODE.lyricsRemoved },
    tooLarge: { status: HTTP_STATUS.payloadTooLarge, code: ERROR_CODE.tooLarge },
    fileTooLarge: { status: HTTP_STATUS.conflict, code: ERROR_CODE.fileTooLarge },
    noAudio: { status: HTTP_STATUS.conflict, code: ERROR_CODE.noAudio },
    textConflict: { status: HTTP_STATUS.conflict, code: ERROR_CODE.textConflict },
    trackNotListed: { status: HTTP_STATUS.conflict, code: ERROR_CODE.trackNotListed },
};

const ERROR_PARAMS: Partial<Record<TrackSituation, MessageParams>> = {
    tooLarge: { max: SONG_TEXT_MAX_BYTES / BYTES_PER_KB },
    fileTooLarge: { max: SONG_TEXT_MAX_BYTES / BYTES_PER_KB },
};

/** 句子入面嘅數字跟常數（packages/catalog 嘅上限同管理端共用），唔喺語言檔寫死 */
const REASON_PARAMS: Partial<Record<TrackReason, MessageParams>> = {
    TOO_MANY_UNKNOWN_FIELDS: { max: UNKNOWN_FIELDS_MAX },
    TOO_MANY_LINES: { max: SONG_TEXT_MAX_LINES },
    TITLE_TOO_LONG: { max: TITLE_MAX_CHARS },
    CREDIT_TOO_LONG: { max: CREDIT_MAX_CHARS },
    LINE_TOO_LONG: { max: LYRIC_LINE_MAX_CHARS },
};

export const trackErrorMessage = messageBuilder(zhHant.tracks.errors, ERROR_PARAMS);
export const trackReasonMessage = messageBuilder(zhHant.tracks.reasons, REASON_PARAMS);
export const hintMessage = messageBuilder(zhHant.tracks.hints);

export const trackError = errorResponder(SITUATIONS, trackErrorMessage);

/** details[] 一項：欄位錯誤（path）或者歌曲文字嘅逐行錯誤（path = text，加 line） */
export interface TrackDetail {
    path: string;
    reason: TrackReason;
    line?: number;
}

/** 400 VALIDATION_ERROR：每項加書面語 message */
export const trackValidationError = (c: Context, issues: readonly TrackDetail[]) =>
    trackError(c, 'invalid', withMessages(issues, trackReasonMessage));

export const trackNotAnObject = (c: Context) =>
    trackValidationError(c, [{ path: BODY_PATH, reason: 'NOT_AN_OBJECT' }]);
