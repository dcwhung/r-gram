/* 專輯 API 嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.albums）。CR-007 之後唯讀，只有 404 */
import { errorResponder, messageBuilder, type ErrorKind } from '../api/errors';
import { ERROR_CODE, HTTP_STATUS } from '../config';
import { zhHant } from '../i18n/zh-Hant';

type Situation = keyof typeof zhHant.albums.errors;

const SITUATIONS: Record<Situation, ErrorKind> = {
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
};

export const albumError = errorResponder(SITUATIONS, messageBuilder(zhHant.albums.errors));
