/*
 * 寫入之後嘅後置步驟（Technical Spec API-061：每個成功嘅 /api 寫入請求之後 rebuildCatalog()，各 route 唔使自己叫）。
 * T-022 只做接口：預設係 no-op；T-026 換做 rebuildCatalog()，回應 JSON 加 `catalog`
 */
import { Hono } from 'hono';
import { afterWrite, noPostWrite, type PostWriteHook } from '../src/api/afterWrite';
import type { AppEnv } from '../src/app';
import { api, insertAlbum } from './albumFixtures';

const appWith = (hook: PostWriteHook) => {
    const app = new Hono<AppEnv>();
    app.use('*', afterWrite(hook));
    app.post('/ok', (c) => c.json({ saved: true }));
    app.post('/fail', (c) => c.json({ error: {} }, 400));
    app.post('/text', (c) => c.text('plain'));
    app.post('/list', (c) => c.json([1]));
    app.get('/read', (c) => c.json({ read: true }));
    return app;
};

const send = (app: Hono<AppEnv>, method: string, path: string) => app.request(path, { method });

describe('afterWrite', () => {
    it('should run the hook after a successful write and add its result as catalog', async () => {
        const hook = vi.fn<PostWriteHook>(async () => ({ ok: false }));
        const response = await send(appWith(hook), 'POST', '/ok');
        expect(hook).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ saved: true, catalog: { ok: false } });
    });

    it('should skip reads and failed writes', async () => {
        const hook = vi.fn<PostWriteHook>(async () => ({ ok: true }));
        const app = appWith(hook);
        expect(await (await send(app, 'GET', '/read')).json()).toEqual({ read: true });
        expect((await send(app, 'POST', '/fail')).status).toBe(400);
        expect(hook).not.toHaveBeenCalled();
    });

    it('should leave a body that is not a JSON object as it is', async () => {
        const app = appWith(async () => ({ ok: true }));
        expect(await (await send(app, 'POST', '/text')).text()).toBe('plain');
        expect(await (await send(app, 'POST', '/list')).json()).toEqual([1]);
    });

    it('should leave the response alone when the hook has nothing to add', async () => {
        const response = await send(appWith(noPostWrite), 'POST', '/ok');
        expect(await response.json()).toEqual({ saved: true });
    });

    it('should be wired into /api with the no-op hook until T-026', async () => {
        await insertAlbum('a', 1);
        const response = await api('PUT', '/api/albums/order', { ids: ['a'] });
        expect(await response.json()).toEqual({ ids: ['a'] });
    });
});
