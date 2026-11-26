/* 問 bucket 有冇某個檔：先 HEAD；HEAD 畀拒絕或者網絡錯誤就改用 1 byte 嘅 ranged GET */

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface ProbeResult {
    found: boolean;
    /** HTTP 狀態；網絡錯誤（連 CORS）= null */
    status: number | null;
    method: 'HEAD' | 'GET';
    error?: string;
}

/** 呢啲狀態代表「唔收 HEAD」，唔代表冇個檔 */
const HEAD_REFUSED = new Set([403, 405, 501]);
const FIRST_BYTE = 'bytes=0-0';

export const errorText = (error: unknown): string =>
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const attempt = async (
    fetcher: Fetcher,
    url: string,
    method: ProbeResult['method'],
): Promise<ProbeResult> => {
    const init: RequestInit =
        method === 'HEAD'
            ? { method, cache: 'no-store' }
            : { method, cache: 'no-store', headers: { Range: FIRST_BYTE } };
    try {
        const response = await fetcher(url, init);
        return { found: response.ok, status: response.status, method };
    } catch (error) {
        return { found: false, status: null, method, error: errorText(error) };
    }
};

export const probe = async (url: string, fetcher: Fetcher = fetch): Promise<ProbeResult> => {
    const head = await attempt(fetcher, url, 'HEAD');
    if (head.status !== null && !HEAD_REFUSED.has(head.status)) return head;
    return attempt(fetcher, url, 'GET');
};
