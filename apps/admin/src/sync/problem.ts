/*
 * 記錄入面「問題」嘅碼：Worker 嘅錯誤碼（連 details 嘅欄位同 reason，例如 WRONG_SIZE、IMAGE_NOT_FOUND）、
 * 封面處理嘅碼，其餘 = UNKNOWN。碼係資料，唔翻譯
 */
import { ApiError } from '../api/client';
import { CoverError } from '../covers/coverError';

export const UNKNOWN_PROBLEM = 'UNKNOWN';

const withNote = (code: string, note: string | undefined) => (note ? `${code} (${note})` : code);

export const problemCode = (error: unknown): string => {
    if (error instanceof ApiError) {
        const reasons = error.details.map(({ path, reason }) => `${path}: ${reason}`);
        return withNote(error.code, reasons.join(', '));
    }
    if (error instanceof CoverError) return withNote(error.code, error.detail);
    return UNKNOWN_PROBLEM;
};
