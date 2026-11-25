/*
 * 公開路由（T-026；Technical Spec API-070、API-072、「安全設計 → 公開路由」）：
 * - catalog.json：max-age=60、ETag = 內容 hash、If-None-Match 啱就 304；未生成過 → 404 NOT_READY
 * - 歌詞 JSON：`<16 hex>.json`、immutable
 * - CORS 只回 PLAYER_ORIGINS，一律 Vary: Origin，公開 ETag（backlog B-035）；HEAD 用 head()、CSP（backlog B-051）；冇 cookie
 */
import { env } from 'cloudflare:test';
import { rebuildCatalog } from '../src/catalog/rebuild';
import { zhHant } from '../src/i18n/zh-Hant';
import { call } from './helpers';
import { insertAlbum } from './albumFixtures';
import { bucketWith, liveDocument } from './catalogFixtures';

const CATALOG = '/catalog/v1/catalog.json';
const LYRICS_NAME = '0123456789abcdef.json';
const LYRICS = `/catalog/v1/lyrics/${LYRICS_NAME}`;
const PLAYER = 'https://player.example.com';
const PUBLIC_CSP = "default-src 'none'; sandbox";
const IMMUTABLE = 'public, max-age=31536000, immutable';
const LYRICS_JSON = '{"synced":false,"lines":[{"text":"一"}]}';

const get = (path: string, headers: Record<string, string> = {}, method = 'GET', bindings = env) =>
    call(path, { method, headers }, bindings);

const generate = async () => {
    await insertAlbum('a', 1);
    return rebuildCatalog(env, 'admin@example.com');
};

const putLyrics = () =>
    env.CATALOG.put(`catalog/v1/lyrics/${LYRICS_NAME}`, LYRICS_JSON, {
        httpMetadata: { contentType: 'text/html' },
    });

const expectPublicHeaders = (response: Response) => {
    expect(response.headers.get('content-security-policy')).toBe(PUBLIC_CSP);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('set-cookie')).toBeNull();
};

describe('GET /catalog/v1/catalog.json', () => {
    it('should answer 404 NOT_READY before the first generation, not cached', async () => {
        const response = await get(CATALOG, { origin: PLAYER });
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: { code: 'NOT_READY', message: zhHant.catalog.errors.notReady },
        });
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('access-control-allow-origin')).toBe(PLAYER);
        expectPublicHeaders(response);
    });

    it('should serve the live document with a 60 second cache and its hash as ETag', async () => {
        const { hash } = await generate();
        const response = await get(CATALOG);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(await liveDocument());
        expect(response.headers.get('content-type')).toBe('application/json');
        expect(response.headers.get('cache-control')).toBe('public, max-age=60');
        expect(response.headers.get('etag')).toBe(`"${hash}"`);
        expectPublicHeaders(response);
    });

    it.each([
        ['the same ETag', (hash: string) => `"${hash}"`],
        ['a weak ETag', (hash: string) => `W/"${hash}"`],
        ['a list holding it', (hash: string) => `"other", "${hash}"`],
        ['a star', () => '*'],
    ])('should answer 304 for If-None-Match with %s', async (_, header) => {
        const { hash } = await generate();
        const response = await get(CATALOG, {
            'if-none-match': header(hash ?? ''),
            origin: PLAYER,
        });
        expect(response.status).toBe(304);
        expect(await response.text()).toBe('');
        expect(response.headers.get('etag')).toBe(`"${hash}"`);
        expect(response.headers.get('cache-control')).toBe('public, max-age=60');
        expect(response.headers.get('access-control-allow-origin')).toBe(PLAYER);
    });

    it('should answer 200 when If-None-Match holds an older ETag', async () => {
        await generate();
        const response = await get(CATALOG, { 'if-none-match': '"old"' });
        expect(response.status).toBe(200);
    });

    it('should allow the player origin only, vary on Origin and expose ETag (B-035)', async () => {
        await generate();
        const player = await get(CATALOG, { origin: PLAYER });
        expect(player.headers.get('access-control-allow-origin')).toBe(PLAYER);
        expect(player.headers.get('access-control-expose-headers')).toMatch(/etag/i);
        expect(player.headers.get('vary')).toMatch(/origin/i);
        const other = await get(CATALOG, { origin: 'https://evil.example' });
        expect(other.status).toBe(200);
        expect(other.headers.get('access-control-allow-origin')).toBeNull();
        expect(other.headers.get('vary')).toMatch(/origin/i);
        const none = await get(CATALOG);
        expect(none.headers.get('vary')).toMatch(/origin/i);
    });

    it('should answer HEAD from head() without reading the body (B-051)', async () => {
        const { hash } = await generate();
        const { bucket, calls } = bucketWith();
        const response = await get(CATALOG, {}, 'HEAD', { ...env, CATALOG: bucket });
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('');
        expect(response.headers.get('etag')).toBe(`"${hash}"`);
        expect(calls.head).toBe(1);
        expect(calls.get).toBeUndefined();
    });

    it('should not serve the document under another method', async () => {
        await generate();
        expect((await get(CATALOG, {}, 'POST')).status).toBe(404);
        expect((await get(CATALOG, {}, 'PUT')).status).toBe(404);
    });
});

describe('GET /catalog/v1/lyrics/:name', () => {
    it('should serve a stored lyrics file as immutable JSON', async () => {
        await putLyrics();
        const response = await get(LYRICS, { origin: PLAYER });
        expect(response.status).toBe(200);
        expect(await response.text()).toBe(LYRICS_JSON);
        expect(response.headers.get('content-type')).toBe('application/json');
        expect(response.headers.get('cache-control')).toBe(IMMUTABLE);
        expect(response.headers.get('etag')).toMatch(/^".+"$/);
        expect(response.headers.get('access-control-allow-origin')).toBe(PLAYER);
        expectPublicHeaders(response);
    });

    it('should answer 304 for a matching If-None-Match', async () => {
        await putLyrics();
        const etag = (await get(LYRICS)).headers.get('etag') ?? '';
        const response = await get(LYRICS, { 'if-none-match': etag });
        expect(response.status).toBe(304);
        expect(response.headers.get('cache-control')).toBe(IMMUTABLE);
    });

    it('should answer HEAD from head()', async () => {
        await putLyrics();
        const { bucket, calls } = bucketWith();
        const response = await get(LYRICS, {}, 'HEAD', { ...env, CATALOG: bucket });
        expect(response.status).toBe(200);
        expect(calls.get).toBeUndefined();
    });

    it('should answer 404 NOT_FOUND for a valid name that is not stored', async () => {
        const response = await get(LYRICS);
        expect(response.status).toBe(404);
        const body = await response.json<{ error: { code: string; message: string } }>();
        expect(body.error).toEqual({ code: 'NOT_FOUND', message: zhHant.catalog.errors.notFound });
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it.each([
        '0123456789ABCDEF.json',
        '0123456789abcde.json',
        '0123456789abcdef.txt',
        '0123456789abcdef.json.html',
        '..%2Fcatalog.json',
        '%2E%2E%2F%2E%2E%2Fcatalog%2Fv1%2Fcatalog.json',
    ])('should answer 404 for a name that is not <hash>.json: %s', async (name) => {
        await generate();
        await env.CATALOG.put(`catalog/v1/lyrics/${decodeURIComponent(name)}`, '{"secret":1}');
        const response = await get(`/catalog/v1/lyrics/${name}`);
        expect(response.status).toBe(404);
        const text = await response.text();
        expect(text).not.toContain('secret');
        expect(text).not.toContain('albums');
    });
});
