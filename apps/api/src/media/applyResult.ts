/* API-031 逐項結果：成功 `{ ok: true }`；失敗 `{ ok: false, code, message, details? }`（message = zhHant.scan.items） */
import { itemMessage, type ItemCode, type TextError } from './errors';

export interface FailedItem {
    ok: false;
    code: ItemCode;
    message: string;
    details?: readonly TextError[];
}

export const failedItem = (code: ItemCode, details?: readonly TextError[]): FailedItem => ({
    ok: false,
    code,
    message: itemMessage(code),
    ...(details && { details }),
});
