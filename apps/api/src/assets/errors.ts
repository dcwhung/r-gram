/* 封面圖 API（API-050 上載、API-071 出圖）嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.assets） */
import type { Context } from 'hono';
import { errorResponder, messageBuilder, withMessages, type ErrorKind } from '../api/errors';
import { COVER_SIDE_PX, ERROR_CODE, HTTP_STATUS, IMAGE_MAX_MB, THUMB_SIDE_PX } from '../config';
import type { MessageParams } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { BODY_PATH } from '../lib/fields';

export type AssetSituation = keyof typeof zhHant.assets.errors;
export type AssetReason = keyof typeof zhHant.assets.reasons;

const SITUATIONS: Record<AssetSituation, ErrorKind> = {
    invalid: { status: HTTP_STATUS.badRequest, code: ERROR_CODE.validation },
    unsupportedType: { status: HTTP_STATUS.unsupportedMediaType, code: ERROR_CODE.unsupportedType },
    tooLarge: { status: HTTP_STATUS.payloadTooLarge, code: ERROR_CODE.tooLarge },
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
};

/** 句子入面嘅數字跟常數，唔喺語言檔寫死 */
const ERROR_PARAMS: Partial<Record<AssetSituation, MessageParams>> = {
    tooLarge: { max: IMAGE_MAX_MB },
};
const REASON_PARAMS: Partial<Record<AssetReason, MessageParams>> = {
    INVALID_DIMENSIONS: { cover: COVER_SIDE_PX, thumb: THUMB_SIDE_PX },
};

export const assetErrorMessage = messageBuilder(zhHant.assets.errors, ERROR_PARAMS);
export const assetReasonMessage = messageBuilder(zhHant.assets.reasons, REASON_PARAMS);

export const assetError = errorResponder(SITUATIONS, assetErrorMessage);

/** 400 VALIDATION_ERROR：講成個 body（path `$`）嘅一個問題 */
export const invalidImage = (c: Context, reason: AssetReason) =>
    assetError(c, 'invalid', withMessages([{ path: BODY_PATH, reason }], assetReasonMessage));
