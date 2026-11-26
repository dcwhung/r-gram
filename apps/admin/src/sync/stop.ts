/* session 過期（或者唔再係管理員）：之後每個請求都會 401，成個同步停低，叫管理員重新登入 */
import { ApiError } from '../api/client';

/** Worker 嘅錯誤碼；runner 停低時 summary.stopped 就係呢個 */
export const UNAUTHORIZED = 'UNAUTHORIZED';

export const isUnauthorized = (error: unknown): boolean =>
    error instanceof ApiError && error.code === UNAUTHORIZED;
