import { createAdminApi } from './adminApi';

interface Call {
    path: string;
    method: string;
    body: unknown;
    type: string | null;
}

/** 假 Worker：按 `METHOD path` 回 JSON（冇就 404），記低每個請求 */
const fakeWorker = (routes: Record<string, [number, unknown]>) => {
    const calls: Call[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const path = String(input);
        const method = init.method ?? 'GET';
        const type = new Headers(init.headers).get('content-type');
        calls.push({ path, method, body: init.body, type });
        const [status, body] = routes[`${method} ${path}`] ?? [404, { error: { code: 'X' } }];
        if (status === 204) return new Response(null, { status });
        return new Response(JSON.stringify(body), { status });
    });
    return { api: createAdminApi(fetchImpl), calls };
};

describe('createAdminApi', () => {
    it('should read the signed-in email', async () => {
        const { api } = fakeWorker({ 'GET /api/me': [200, { email: 'admin@example.com' }] });
        await expect(api.me()).resolves.toBe('admin@example.com');
    });

    it('should answer null when nobody is signed in', async () => {
        const { api } = fakeWorker({ 'GET /api/me': [401, { error: { code: 'UNAUTHORIZED' } }] });
        await expect(api.me()).resolves.toBeNull();
    });

    it('should pass other failures of /api/me on', async () => {
        const { api } = fakeWorker({ 'GET /api/me': [500, { error: { code: 'INTERNAL' } }] });
        await expect(api.me()).rejects.toMatchObject({ code: 'INTERNAL' });
    });

    it('should sign out with a POST to the Worker', async () => {
        const { api, calls } = fakeWorker({ 'POST /auth/logout': [204, null] });
        await api.logout();
        expect(calls).toEqual([expect.objectContaining({ path: '/auth/logout', method: 'POST' })]);
    });

    it('should read the sync overview', async () => {
        const overview = { folders: [], mediaBase: 'https://media.example.com/' };
        const { api } = fakeWorker({ 'GET /api/sync': [200, overview] });
        await expect(api.syncOverview()).resolves.toEqual(overview);
    });

    it('should sync one folder, encoding its name and passing from', async () => {
        const { api, calls } = fakeWorker({
            'POST /api/sync/folders/album-11-komorebi': [200, { more: false }],
            'POST /api/sync/folders/album-11-komorebi?from=7': [200, { more: false }],
        });
        await api.syncFolder('album-11-komorebi');
        await api.syncFolder('album-11-komorebi', 7);
        expect(calls.map(({ path }) => path)).toEqual([
            '/api/sync/folders/album-11-komorebi',
            '/api/sync/folders/album-11-komorebi?from=7',
        ]);
    });

    it('should upload an image as its own content type', async () => {
        const { api, calls } = fakeWorker({ 'PUT /api/assets': [200, { name: 'a.webp' }] });
        const blob = new Blob(['x'], { type: 'image/webp' });
        await expect(api.uploadImage(blob)).resolves.toEqual({ name: 'a.webp' });
        expect(calls[0]).toMatchObject({ body: blob, type: 'image/webp' });
    });

    it('should store a cover result for an album', async () => {
        const { api, calls } = fakeWorker({
            'PUT /api/albums/komorebi/cover': [200, { album: {}, checks: [] }],
        });
        const body = {
            slot: 'cover' as const,
            cover: 'a.webp',
            thumb: 'b.webp',
            sourceKey: 'album-11-komorebi/cover.jpg',
            sourceEtag: '"e"',
            accent: '#123456',
            notSquare: false,
        };
        await api.putCover('komorebi', body);
        expect(JSON.parse(String(calls[0]?.body))).toEqual(body);
    });

    it('should read the site statistics', async () => {
        const stats = { albums: 1, tracks: 2 };
        const { api } = fakeWorker({ 'GET /api/albums': [200, { albums: [], stats }] });
        await expect(api.stats()).resolves.toEqual(stats);
    });

    // 移除要管理員逐項剔選、確認先做（Functional Spec D73、D76）：呢個同步頁冇確認畫面，所以 client 根本冇呢個 call
    it('should not offer the removals endpoint at all', () => {
        const { api } = fakeWorker({});
        expect(Object.keys(api).sort()).toEqual([
            'logout',
            'me',
            'putCover',
            'stats',
            'syncFolder',
            'syncOverview',
            'uploadImage',
        ]);
    });
});
