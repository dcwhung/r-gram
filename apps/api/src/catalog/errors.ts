/* catalog 生成（API-061）同公開內容（API-070、API-072）嘅錯誤回應：Technical Spec 錯誤格式 + i18n 書面語（zhHant.catalog） */
import { errorResponder, messageBuilder, type ErrorKind } from '../api/errors';
import { ERROR_CODE, HTTP_STATUS } from '../config';
import { zhHant } from '../i18n/zh-Hant';
import type { CatalogFailure } from './state';

export type CatalogSituation = keyof typeof zhHant.catalog.errors;

const SITUATIONS: Record<CatalogSituation, ErrorKind> = {
    notReady: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notReady },
    notFound: { status: HTTP_STATUS.notFound, code: ERROR_CODE.notFound },
    invalidDocument: { status: HTTP_STATUS.unprocessable, code: ERROR_CODE.invalidDocument },
    writeFailed: { status: HTTP_STATUS.badGateway, code: ERROR_CODE.catalogWriteFailed },
};

export const catalogError = errorResponder(SITUATIONS, messageBuilder(zhHant.catalog.errors));

/** 生成失敗嘅種類 → 回應嘅情況 */
export const FAILURE_SITUATION: Record<CatalogFailure, CatalogSituation> = {
    [ERROR_CODE.invalidDocument]: 'invalidDocument',
    [ERROR_CODE.catalogWriteFailed]: 'writeFailed',
};
