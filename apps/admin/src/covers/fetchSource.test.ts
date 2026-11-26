import { CoverError } from './coverError';
import { fetchCoverSource } from './fetchSource';
import { SOURCE_MAX_BYTES } from './limits';

const BASE = 'https://media.example.com/';
const JOB = { slot: 'cover' as const, key: 'album-11-komorebi/cover 1.jpg', etag: '"e"', bytes: 4 };

describe('fetchCoverSource', () => {
    it('should fetch the encoded public URL without credentials', async () => {
        const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response('jpeg'));
        const blob = await fetchCoverSource(fetchImpl, BASE, JOB);
        expect(await blob.text()).toBe('jpeg');
        const [url, init] = fetchImpl.mock.calls[0] ?? [];
        expect(url).toBe('https://media.example.com/album-11-komorebi/cover%201.jpg');
        expect(init).toMatchObject({ mode: 'cors', credentials: 'omit', cache: 'no-store' });
    });

    it('should not download a source over the size limit', async () => {
        const fetchImpl = vi.fn();
        const job = { ...JOB, bytes: SOURCE_MAX_BYTES + 1 };
        await expect(fetchCoverSource(fetchImpl, BASE, job)).rejects.toMatchObject({
            code: 'COVER_SOURCE_TOO_LARGE',
        });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('should report an HTTP failure with its status', async () => {
        const fetchImpl = async () => new Response('', { status: 403 });
        await expect(fetchCoverSource(fetchImpl, BASE, JOB)).rejects.toMatchObject({
            code: 'COVER_FETCH_FAILED',
            detail: '403',
        });
    });

    // 媒體 bucket 冇設 CORS（U-1 ②）：瀏覽器只會畀一個 TypeError
    it('should report a blocked or failed request as COVER_FETCH_FAILED', async () => {
        const fetchImpl = async () => Promise.reject(new TypeError('Failed to fetch'));
        const error = await fetchCoverSource(fetchImpl, BASE, JOB).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(CoverError);
        expect(error).toMatchObject({ code: 'COVER_FETCH_FAILED', detail: 'NETWORK' });
    });
});
