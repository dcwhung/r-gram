import { ApiError, createClient, NETWORK_ERROR } from './client';

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });

const fakeFetch = (response: Response | Error) =>
    vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
        if (response instanceof Error) throw response;
        return response;
    });

describe('createClient', () => {
    it('should send same-origin requests with credentials and a JSON body', async () => {
        const fetchImpl = fakeFetch(jsonResponse({ ok: true }));
        const client = createClient(fetchImpl);
        await expect(client.request('/api/x', { method: 'POST', json: { a: 1 } })).resolves.toEqual(
            { ok: true },
        );
        const [path, init] = fetchImpl.mock.calls[0] ?? [];
        expect(path).toBe('/api/x');
        expect(init?.method).toBe('POST');
        expect(init?.credentials).toBe('same-origin');
        expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
        expect(init?.body).toBe('{"a":1}');
    });

    it('should send a binary body with its own type', async () => {
        const fetchImpl = fakeFetch(jsonResponse({ name: 'a.webp' }));
        const blob = new Blob(['x'], { type: 'image/webp' });
        await createClient(fetchImpl).request('/api/assets', { method: 'PUT', body: blob });
        const init = fetchImpl.mock.calls[0]?.[1];
        expect(init?.body).toBe(blob);
        expect(new Headers(init?.headers).get('content-type')).toBe('image/webp');
    });

    it('should add query parameters and skip undefined ones', async () => {
        const fetchImpl = fakeFetch(jsonResponse({}));
        const client = createClient(fetchImpl);
        await client.request('/api/sync/folders/a', { query: { from: 3, skip: undefined } });
        expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/sync/folders/a?from=3');
    });

    it.each(['https://evil.example.com/api', '//evil.example.com/api', 'api/x', '/\\evil'])(
        'should refuse to call anything but a same-origin path (%s)',
        async (path) => {
            const fetchImpl = fakeFetch(jsonResponse({}));
            await expect(createClient(fetchImpl).request(path)).rejects.toThrow(TypeError);
            expect(fetchImpl).not.toHaveBeenCalled();
        },
    );

    it('should map the Worker error format to ApiError', async () => {
        const body = {
            error: {
                code: 'VALIDATION_ERROR',
                message: '資料不正確。',
                details: [{ path: 'cover', reason: 'WRONG_SIZE', message: '尺寸不符。' }],
            },
        };
        const client = createClient(fakeFetch(jsonResponse(body, 400)));
        const error = await client.request('/api/x').catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: '資料不正確。',
            details: [{ path: 'cover', reason: 'WRONG_SIZE' }],
            retriable: false,
        });
    });

    it('should name an error without a JSON body by its status', async () => {
        const client = createClient(fakeFetch(new Response('Bad gateway', { status: 502 })));
        await expect(client.request('/api/x')).rejects.toMatchObject({
            status: 502,
            code: 'HTTP_502',
            retriable: true,
        });
    });

    it('should turn a network failure into a retriable NETWORK error', async () => {
        const client = createClient(fakeFetch(new TypeError('Failed to fetch')));
        await expect(client.request('/api/x')).rejects.toMatchObject({
            status: 0,
            code: NETWORK_ERROR,
            retriable: true,
        });
    });

    it('should answer null for 204 No Content', async () => {
        const client = createClient(fakeFetch(new Response(null, { status: 204 })));
        await expect(client.request('/auth/logout', { method: 'POST' })).resolves.toBeNull();
    });

    it('should use the global fetch by default', async () => {
        const fetchImpl = fakeFetch(jsonResponse({ email: 'a@example.com' }));
        vi.stubGlobal('fetch', fetchImpl);
        await expect(createClient().request('/api/me')).resolves.toEqual({
            email: 'a@example.com',
        });
    });
});
