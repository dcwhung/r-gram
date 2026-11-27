import { loadLyrics } from './loadLyrics';

const URL = 'https://api.example/catalog/v1/lyrics/0123456789abcdef.json';
const PLAIN = { synced: false, lines: [{ text: '佔位一' }] };

const respond = (body: unknown, status = 200) =>
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));

/* Technical Spec API-072：歌詞 JSON；攞唔到一律 null，唔 reject */
describe('loadLyrics', () => {
    it('should fetch and read the lyrics with cors', async () => {
        const fetch = respond(PLAIN);
        await expect(loadLyrics(URL, { fetch, timeoutMs: 1000 })).resolves.toEqual(PLAIN);
        expect(fetch).toHaveBeenCalledWith(URL, expect.objectContaining({ mode: 'cors' }));
    });

    it.each([
        ['an HTTP error', respond(PLAIN, 404)],
        ['a file of the wrong shape', respond({ lines: 'x' })],
        ['a body that is not JSON', vi.fn(() => Promise.resolve(new Response('<html>')))],
        ['a network error', vi.fn(() => Promise.reject(new TypeError('offline')))],
    ])('should give null on %s', async (_case, fetch) => {
        await expect(loadLyrics(URL, { fetch, timeoutMs: 1000 })).resolves.toBeNull();
    });

    it('should give up after the timeout', async () => {
        vi.useFakeTimers();
        const fetch = vi.fn(
            (_url: string, init: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    init.signal?.addEventListener('abort', () =>
                        reject(new DOMException('', 'AbortError')),
                    );
                }),
        );
        const result = loadLyrics(URL, { fetch, timeoutMs: 8000 });
        await vi.advanceTimersByTimeAsync(8000);
        await expect(result).resolves.toBeNull();
        vi.useRealTimers();
    });

    it('should stop when the caller no longer wants the lyrics', async () => {
        const fetch = vi.fn(
            (_url: string, init: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    init.signal?.addEventListener('abort', () =>
                        reject(new DOMException('', 'AbortError')),
                    );
                }),
        );
        const caller = new AbortController();
        const result = loadLyrics(URL, { fetch, timeoutMs: 8000, signal: caller.signal });
        caller.abort();
        await expect(result).resolves.toBeNull();
    });
});
