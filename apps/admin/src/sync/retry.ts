/*
 * 連唔到或者 server 出錯（ApiError.retriable）先再試，最多 MAX_ATTEMPTS 次，每次等耐啲；
 * 4xx（例如 409 DUPLICATE_ALBUM_ID、400 WRONG_SIZE）再試都一樣，即刻放棄
 */
import { ApiError } from '../api/client';

export const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export type Wait = (ms: number) => Promise<void>;

export const realWait: Wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriable = (error: unknown) => error instanceof ApiError && error.retriable;

/** onRetry(attempt, error)：第 attempt 次失敗咗，準備再試 */
export const withRetry = async <T>(
    call: () => Promise<T>,
    wait: Wait,
    onRetry: (attempt: number, error: unknown) => void,
): Promise<T> => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await call();
        } catch (error) {
            if (attempt >= MAX_ATTEMPTS || !isRetriable(error)) throw error;
            onRetry(attempt, error);
            await wait(RETRY_DELAY_MS * attempt);
        }
    }
};
