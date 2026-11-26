/*
 * 檢查結果（Functional Spec D77）嘅書面語句子：按 `code` 由 zhHant.sync.checks 砌，參數 = check 嘅 params 加行號。
 * TEXT_INVALID：`{reason}` = 歌曲文字錯誤碼嘅句子（同 API-041 一樣），`{place}` = 「第幾行」（檔案層面嘅錯誤冇）。
 * D1 只存碼同參數（albums.checks）；句子喺回應先砌，管理端亦可以按 code 自己砌
 */
import type { Check } from '@r-gram/catalog';
import { fillMessage } from '../i18n/fillMessage';
import { zhHant } from '../i18n/zh-Hant';
import { textReasonMessage } from '../media/errors';

const placeOf = (line: number | undefined): string =>
    line === undefined ? '' : fillMessage(zhHant.sync.linePlace, { line });

const paramsOf = (check: Check) => {
    const base = { ...check.params, ...(check.line !== undefined && { line: check.line }) };
    if (check.code !== 'TEXT_INVALID') return base;
    return {
        ...base,
        reason: textReasonMessage(String(check.params.reason)),
        place: placeOf(check.line),
    };
};

export const checkMessage = (check: Check): string =>
    fillMessage(zhHant.sync.checks[check.code], paramsOf(check));

export const withCheckMessages = (checks: readonly Check[]) =>
    checks.map((check) => ({ ...check, message: checkMessage(check) }));
