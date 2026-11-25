/*
 * API-071 GET /catalog/v1/img/:name（T-024）：公開出封面圖。檔名一定係 `<16 hex>.<webp|jpg|png>`（擋 path traversal），
 * 內容 hash 檔名 = 永久 cache（immutable）；CORS 只回 PLAYER_ORIGINS；冇 cookie、唔使 session
 */
import { env } from 'cloudflare:test';
import { bucketWith } from './catalogFixtures';
import { call } from './helpers';
import { webpVp8l } from './imageFixtures';

const NAME = '0123456789abcdef.webp';
const PLAYER = 'https://player.example.com';
const IMMUTABLE = 'public, max-age=31536000, immutable';

const putImage = (name: string, bytes: Uint8Array, contentType = 'image/webp') =>
    env.CATALOG.put(`catalog/v1/img/${name}`, bytes, { httpMetadata: { contentType } });

const get = (path: string, headers: Record<string, string> = {}, method = 'GET', bindings = env) =>
    call(path, { method, headers }, bindings);

describe('GET /catalog/v1/img/:name', () => {
    it('should serve a stored image with immutable cache, nosniff and an ETag', async () => {
        const bytes = webpVp8l(320, 320);
        await putImage(NAME, bytes);
        const response = await get(`/catalog/v1/img/${NAME}`);
        expect(response.status).toBe(200);
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('cache-control')).toBe(IMMUTABLE);
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('etag')).toMatch(/^".+"$/);
        expect(response.headers.get('x-robots-tag')).toBe('noindex');
        expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('should take the content type from the file extension, not from stored metadata', async () => {
        await putImage('0123456789abcdef.jpg', webpVp8l(320, 320), 'text/html');
        await putImage('0123456789abcdef.png', webpVp8l(320, 320), 'text/html');
        const jpg = await get('/catalog/v1/img/0123456789abcdef.jpg');
        const png = await get('/catalog/v1/img/0123456789abcdef.png');
        expect(jpg.headers.get('content-type')).toBe('image/jpeg');
        expect(png.headers.get('content-type')).toBe('image/png');
    });

    it('should allow the player origin and no other', async () => {
        await putImage(NAME, webpVp8l(320, 320));
        const player = await get(`/catalog/v1/img/${NAME}`, { origin: PLAYER });
        expect(player.headers.get('access-control-allow-origin')).toBe(PLAYER);
        expect(player.headers.get('vary')).toMatch(/origin/i);
        const other = await get(`/catalog/v1/img/${NAME}`, { origin: 'https://evil.example' });
        expect(other.status).toBe(200);
        expect(other.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('should answer HEAD without a body', async () => {
        await putImage(NAME, webpVp8l(320, 320));
        const response = await get(`/catalog/v1/img/${NAME}`, {}, 'HEAD');
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe(IMMUTABLE);
        expect(await response.text()).toBe('');
    });

    // backlog B-051：HEAD 唔下載成個檔
    it('should answer HEAD from head() without reading the image', async () => {
        await putImage(NAME, webpVp8l(320, 320));
        const { bucket, calls } = bucketWith();
        const response = await get(`/catalog/v1/img/${NAME}`, {}, 'HEAD', {
            ...env,
            CATALOG: bucket,
        });
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('etag')).toMatch(/^".+"$/);
        expect(calls.head).toBe(1);
        expect(calls.get).toBeUndefined();
    });

    // backlog B-051：圖同管理端同一個 origin，直接開都唔可以行 script
    it('should send a restrictive CSP and support If-None-Match', async () => {
        await putImage(NAME, webpVp8l(320, 320));
        const response = await get(`/catalog/v1/img/${NAME}`);
        expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
        const etag = response.headers.get('etag') ?? '';
        const again = await get(`/catalog/v1/img/${NAME}`, { 'if-none-match': etag });
        expect(again.status).toBe(304);
        expect(await again.text()).toBe('');
    });

    it('should answer 404 NOT_FOUND for a valid name that is not stored', async () => {
        const response = await get(`/catalog/v1/img/${NAME}`);
        expect(response.status).toBe(404);
        const body = await response.json<{ error: { code: string; message: string } }>();
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toMatch(/\p{Script=Han}/u);
        expect(response.headers.get('cache-control')).not.toBe(IMMUTABLE);
    });

    it.each([
        'catalog.json',
        '0123456789ABCDEF.webp',
        '0123456789abcde.webp',
        '0123456789abcdef.gif',
        '0123456789abcdef.webp.html',
        '..%2Fcatalog.json',
        '%2E%2E%2F%2E%2E%2Fcatalog%2Fv1%2Fcatalog.json',
    ])('should answer 404 for a name that is not <hash>.<ext>: %s', async (name) => {
        await env.CATALOG.put('catalog/v1/catalog.json', '{"secret":true}');
        await env.CATALOG.put(`catalog/v1/img/${decodeURIComponent(name)}`, 'x');
        const response = await get(`/catalog/v1/img/${name}`);
        expect(response.status).toBe(404);
        expect(await response.text()).not.toContain('secret');
    });

    it('should not serve the image route under another method', async () => {
        await putImage(NAME, webpVp8l(320, 320));
        expect((await get(`/catalog/v1/img/${NAME}`, {}, 'PUT')).status).toBe(404);
        expect((await get(`/catalog/v1/img/${NAME}`, {}, 'DELETE')).status).toBe(404);
    });
});
