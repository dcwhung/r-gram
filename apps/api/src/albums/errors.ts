/* 專輯 API 嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.albums） */
import type { Context } from 'hono';
import { RELEASE_CATEGORIES } from '@r-gram/catalog';
import { ERROR_CODE, HTTP_STATUS } from '../config';
import { errorResponder, messageBuilder, withMessages, type ErrorKind } from '../api/errors';
import { zhHant } from '../i18n/zh-Hant';
import type { MessageParams } from '../i18n/fillMessage';
import { BODY_PATH, UNKNOWN_FIELDS_MAX } from '../lib/fields';
import { CATEGORY_NO_MAX, type Reason } from './fieldRules';
import { ALBUM_ID_MAX_CHARS, type FieldIssue } from './validate';

type Situation = keyof typeof zhHant.albums.errors;

/** 按情況，唔係按 code：CONFLICT 有兩個情況 */
const SITUATIONS: Record<Situation, ErrorKind> = {
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
    stale: { status: HTTP_STATUS.conflict, code: ERROR_CODE.stale },
    idTaken: { status: HTTP_STATUS.conflict, code: ERROR_CODE.conflict },
    orderChanged: { status: HTTP_STATUS.conflict, code: ERROR_CODE.conflict },
    idRemoved: { status: HTTP_STATUS.conflict, code: ERROR_CODE.idRemoved },
};

/** 句子入面嘅參數（`{max}` 等）：數字跟常數，唔喺語言檔寫死 */
const REASON_PARAMS: Partial<Record<Reason, MessageParams>> = {
    INVALID_ID: { max: ALBUM_ID_MAX_CHARS },
    INVALID_CATEGORY: { list: RELEASE_CATEGORIES.join('、') },
    INVALID_ORDINAL: { max: CATEGORY_NO_MAX },
    TOO_MANY_UNKNOWN_FIELDS: { max: UNKNOWN_FIELDS_MAX },
};

export const reasonMessage = messageBuilder(zhHant.albums.reasons, REASON_PARAMS);

export const albumError = errorResponder(SITUATIONS, messageBuilder(zhHant.albums.errors));

/** 400 VALIDATION_ERROR：每個欄位錯誤加埋書面語 message */
export const validationError = (c: Context, issues: readonly FieldIssue[]) =>
    albumError(c, 'invalid', withMessages(issues, reasonMessage));

/** 同一個類別入面已經有專輯用緊呢個序號（FR-124） */
export const ordinalTaken = (c: Context) =>
    validationError(c, [{ path: 'categoryNo', reason: 'ORDINAL_TAKEN' }]);

/** 冇畀序號，而嗰個類別已經用到 CATEGORY_NO_MAX（S-118）：同畀咗超上限嘅序號一樣報 INVALID_ORDINAL */
export const ordinalFull = (c: Context) =>
    validationError(c, [{ path: 'categoryNo', reason: 'INVALID_ORDINAL' }]);

/** body 唔係 JSON object */
export const notAnObject = (c: Context) =>
    validationError(c, [{ path: BODY_PATH, reason: 'NOT_AN_OBJECT' }]);
