/*
 * 由媒體 bucket 公開網址攞封面來源（Technical Spec「管理端（T-055）點樣行」；要 bucket CORS 容許管理端 origin，U-1 ②）。
 * 呢個係同步頁唯一一個唔同源嘅請求：只係 GET 公開檔，唔帶 cookie；網址 = mediaBase + key（每段各自 encode）
 */
import type { CoverJob } from '@r-gram/catalog';
import { mediaUrl } from '@r-gram/catalog';
import { CoverError } from './coverError';
import { SOURCE_MAX_BYTES } from './limits';

export type MediaFetch = (url: string, init?: RequestInit) => Promise<Response>;

const NETWORK_DETAIL = 'NETWORK';

export const fetchCoverSource = async (
    fetchImpl: MediaFetch,
    mediaBase: string,
    job: CoverJob,
): Promise<Blob> => {
    if (job.bytes > SOURCE_MAX_BYTES) throw new CoverError('COVER_SOURCE_TOO_LARGE');
    let response: Response;
    try {
        // no-store：同一個 key 換咗圖（新 ETag）唔好用返瀏覽器 cache 嘅舊圖
        const init: RequestInit = { mode: 'cors', credentials: 'omit', cache: 'no-store' };
        response = await fetchImpl(mediaUrl(mediaBase, job.key), init);
    } catch {
        throw new CoverError('COVER_FETCH_FAILED', NETWORK_DETAIL);
    }
    if (!response.ok) throw new CoverError('COVER_FETCH_FAILED', String(response.status));
    return response.blob();
};
