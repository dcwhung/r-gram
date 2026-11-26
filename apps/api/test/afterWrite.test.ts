/*
 * 寫入之後嘅後置步驟（Technical Spec API-061：每個成功嘅 /api 寫入請求之後 rebuildCatalog()，各 route 唔使自己叫）。
 * T-022 只做接口；T-026 接上 rebuildCatalog()，回應 JSON 加 `catalog`（同 GET /api/albums 嘅 `catalog` 同一個形狀，backlog B-046 ②）
 */
import { Hono } from 'hono';
import { afterWrite, noPostWrite, skipPostWrite, type PostWriteHook } from '../src/api/afterWrite';
import type { AppEnv } from '../src/app';
import type { CatalogStatus } from '../src/catalog/state';
import { insertAlbum, insertTrack } from './albumFixtures';
import { mirrorAlbumToMedia, saveSongText } from './trackFixtures';

const STATUS: CatalogStatus = {
    ok: false,
    hash: null,
    generatedAt: null,
    albumCount: null,
    trackCount: null,
    updatedAt: '2026-11-25T00:00:00.000Z',
    error: 'CATALOG_WRITE_FAILED',
};

/** hook 意外 throw：照樣係同一個形狀，error = INTERNAL */
const THROWN = { ...STATUS, updatedAt: expect.any(String), error: 'INTERNAL' };

const appWith = (hook: PostWriteHook) => {
    const app = new Hono<AppEnv>();
    app.use('*', afterWrite(hook));
    app.post('/ok', (c) => c.json({ saved: true }));
    app.post('/fail', (c) => c.json({ error: {} }, 400));
    app.post('/text', (c) => c.text('plain'));
    app.post('/list', (c) => c.json([1]));
    app.get('/read', (c) => c.json({ read: true }));
    app.put('/skipped', skipPostWrite, (c) => c.json({ stored: true }));
    return app;
};

const send = (app: Hono<AppEnv>, method: string, path: string) => app.request(path, { method });

describe('afterWrite', () => {
    it('should run the hook after a successful write and add its result as catalog', async () => {
        const hook = vi.fn<PostWriteHook>(async () => STATUS);
        const response = await send(appWith(hook), 'POST', '/ok');
        expect(hook).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ saved: true, catalog: STATUS });
    });

    it('should skip reads and failed writes', async () => {
        const hook = vi.fn<PostWriteHook>(async () => STATUS);
        const app = appWith(hook);
        expect(await (await send(app, 'GET', '/read')).json()).toEqual({ read: true });
        expect((await send(app, 'POST', '/fail')).status).toBe(400);
        expect(hook).not.toHaveBeenCalled();
    });

    it('should leave a body that is not a JSON object as it is', async () => {
        const app = appWith(async () => STATUS);
        expect(await (await send(app, 'POST', '/text')).text()).toBe('plain');
        expect(await (await send(app, 'POST', '/list')).json()).toEqual([1]);
    });

    it('should keep the saved write successful with catalog ok false when the hook throws', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const failure = new TypeError('secret detail');
        const response = await send(
            appWith(async () => {
                throw failure;
            }),
            'POST',
            '/ok',
        );
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ saved: true, catalog: THROWN });
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0]).toContain('TypeError');
        expect(JSON.stringify(log.mock.calls)).not.toContain('secret detail');
        expect(log.mock.calls.flat()).not.toContain(failure);
        log.mockRestore();
    });

    it('should log only the kind of value when the hook throws something that is not an Error', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const app = appWith(() => Promise.reject('secret detail'));
        expect((await send(app, 'POST', '/ok')).status).toBe(200);
        expect(log).toHaveBeenCalledWith('[api] post-write step failed', 'string');
        log.mockRestore();
    });

    // T-024 / backlog B-043 ③：上載圖唔改 catalog 內容（要 PATCH 專輯先引用），唔行後置步驟
    it('should not run the hook for a route that opts out with skipPostWrite', async () => {
        const hook = vi.fn<PostWriteHook>(async () => STATUS);
        const response = await send(appWith(hook), 'PUT', '/skipped');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ stored: true });
        expect(hook).not.toHaveBeenCalled();
    });

    it('should leave the response alone when the hook has nothing to add', async () => {
        const response = await send(appWith(noPostWrite), 'POST', '/ok');
        expect(await response.json()).toEqual({ saved: true });
    });

    it('should be wired into /api with rebuildCatalog()', async () => {
        await insertAlbum('a', 1);
        await insertTrack('a-01', 'a', 1);
        await mirrorAlbumToMedia('a');
        const response = await saveSongText('a-01', '歌名');
        expect(await response.json()).toMatchObject({
            trackId: 'a-01',
            catalog: expect.objectContaining({ ok: true, albumCount: 1, error: null }),
        });
    });
});
