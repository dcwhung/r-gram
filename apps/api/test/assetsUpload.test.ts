/*
 * API-050 PUT /api/assets（T-024）：封面圖上載。管理端喺瀏覽器裁好、轉好兩個尺寸（1200 / 320），逐張上載；
 * Worker 按檔頭 magic bytes 認格式（唔信 Content-Type 同檔名）、驗大細同尺寸、以內容 hash 命名寫 R2，再記 assets
 */
import { env } from 'cloudflare:test';
import { api, albumRow, countOf, insertAlbum, json } from './albumFixtures';
import { ORIGIN, call, loginCookie } from './helpers';
import { jpegOf, pngOf, textBytes, webpVp8, webpVp8l, webpVp8x } from './imageFixtures';

const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const HASH_NAME = /^[0-9a-f]{16}\.(webp|jpg|png)$/;

/** 已登入、同站嘅 binary 上載（albumFixtures.api 會將 body 轉 JSON，呢度要原始 bytes） */
const upload = async (
    body: Uint8Array,
    contentType = 'image/webp',
    headers: Record<string, string> = {},
) => {
    const base = { cookie: await loginCookie(), origin: ORIGIN };
    const all =
        contentType === ''
            ? { ...base, ...headers }
            : { ...base, 'content-type': contentType, ...headers };
    return call('/api/assets', { method: 'PUT', body, headers: all });
};

const sha16 = async (bytes: Uint8Array) =>
    [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);

const assetRow = (name: string) =>
    env.DB.prepare('SELECT * FROM assets WHERE name = ?')
        .bind(name)
        .first<Record<string, unknown>>();

interface ErrorBody {
    error: { code: string; message: string; details?: { path: string; reason: string }[] };
}

describe('PUT /api/assets', () => {
    it('should store a 1200 × 1200 WebP under its content hash and record it', async () => {
        const bytes = webpVp8l(1200, 1200);
        const response = await upload(bytes);
        expect(response.status).toBe(200);
        const body = await json<{ name: string; bytes: number }>(response);
        expect(body).toEqual({ name: `${await sha16(bytes)}.webp`, bytes: bytes.length });
        const object = await env.CATALOG.get(`catalog/v1/img/${body.name}`);
        expect(new Uint8Array(await object!.arrayBuffer())).toEqual(bytes);
        expect(object!.httpMetadata?.contentType).toBe('image/webp');
        expect(await assetRow(body.name)).toMatchObject({
            content_type: 'image/webp',
            bytes: bytes.length,
        });
    });

    it('should accept the 320 × 320 thumbnail and every WebP flavour', async () => {
        for (const bytes of [webpVp8(320, 320), webpVp8l(320, 320), webpVp8x(1200, 1200)]) {
            const response = await upload(bytes);
            expect(response.status).toBe(200);
            expect((await json<{ name: string }>(response)).name).toMatch(HASH_NAME);
        }
        expect(await countOf('assets')).toBe(3);
    });

    it('should accept JPEG and PNG and name them by the format found in the bytes', async () => {
        const jpeg = await json<{ name: string }>(await upload(jpegOf(1200, 1200), 'image/jpeg'));
        const png = await json<{ name: string }>(await upload(pngOf(320, 320), 'image/png'));
        expect(jpeg.name).toMatch(/\.jpg$/);
        expect(png.name).toMatch(/\.png$/);
        expect((await assetRow(jpeg.name))?.content_type).toBe('image/jpeg');
        expect((await assetRow(png.name))?.content_type).toBe('image/png');
    });

    it('should read the media type case-insensitively and ignore parameters', async () => {
        const response = await upload(webpVp8l(320, 320), 'Image/WebP; charset=binary');
        expect(response.status).toBe(200);
    });

    it('should return the same name for the same bytes and keep one row', async () => {
        const bytes = webpVp8l(320, 320, 7);
        const first = await json<{ name: string }>(await upload(bytes));
        const second = await upload(bytes);
        expect(second.status).toBe(200);
        expect(await json(second)).toEqual({ name: first.name, bytes: bytes.length });
        expect(await countOf('assets')).toBe(1);
    });

    it('should write the bytes again when the row exists but the object is gone', async () => {
        const bytes = webpVp8l(320, 320, 8);
        const { name } = await json<{ name: string }>(await upload(bytes));
        await env.CATALOG.delete(`catalog/v1/img/${name}`);
        expect((await upload(bytes)).status).toBe(200);
        expect(await env.CATALOG.head(`catalog/v1/img/${name}`)).not.toBeNull();
    });

    it.each<[string, string]>([
        ['a missing content type', ''],
        ['a type that is not an image', 'application/octet-stream'],
        ['an image type that is not accepted', 'image/gif'],
        ['SVG', 'image/svg+xml'],
    ])('should answer 415 for %s', async (_label, contentType) => {
        const response = await upload(webpVp8l(320, 320), contentType);
        expect(response.status).toBe(415);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('UNSUPPORTED_TYPE');
        expect(body.error.message).toMatch(/\p{Script=Han}/u);
        expect(await countOf('assets')).toBe(0);
    });

    it('should answer 415 when the bytes are not WebP, JPEG or PNG whatever the declared type', async () => {
        const html = textBytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        for (const type of ['image/webp', 'image/jpeg', 'image/png']) {
            expect((await upload(html, type)).status).toBe(415);
        }
        expect((await upload(new Uint8Array(), 'image/webp')).status).toBe(415);
        expect((await env.CATALOG.list()).objects).toHaveLength(0);
    });

    it('should answer 415 when the bytes are a different format from the declared type', async () => {
        const response = await upload(pngOf(320, 320), 'image/webp');
        expect(response.status).toBe(415);
        expect((await json<ErrorBody>(response)).error.code).toBe('UNSUPPORTED_TYPE');
        expect(await countOf('assets')).toBe(0);
    });

    it('should answer 400 INVALID_IMAGE when the magic is right but the header is broken', async () => {
        const broken = webpVp8l(320, 320);
        broken[20] = 0;
        const response = await upload(broken);
        expect(response.status).toBe(400);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.details).toEqual([
            expect.objectContaining({ path: '$', reason: 'INVALID_IMAGE' }),
        ]);
        expect(await countOf('assets')).toBe(0);
    });

    it.each([
        [1200, 1199],
        [600, 600],
        [1600, 1600],
        [320, 1200],
    ])('should answer 400 INVALID_DIMENSIONS for %i × %i', async (width, height) => {
        const response = await upload(webpVp8l(width, height));
        expect(response.status).toBe(400);
        const body = await json<ErrorBody>(response);
        expect(body.error.details).toEqual([
            expect.objectContaining({ path: '$', reason: 'INVALID_DIMENSIONS' }),
        ]);
        expect(JSON.stringify(body)).toMatch(/1200/);
        expect(JSON.stringify(body)).toMatch(/320/);
        expect((await env.CATALOG.list()).objects).toHaveLength(0);
    });

    it('should answer 413 for a body over the limit', async () => {
        const big = new Uint8Array(IMAGE_MAX_BYTES + 1);
        big.set(webpVp8l(320, 320));
        const response = await upload(big);
        expect(response.status).toBe(413);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('TOO_LARGE');
        expect(body.error.message).toContain('2 MB');
        expect(await countOf('assets')).toBe(0);
    });

    it('should accept a body exactly at the limit when the image itself is valid', async () => {
        const bytes = webpVp8l(320, 320);
        const padded = new Uint8Array(IMAGE_MAX_BYTES);
        padded.set(bytes);
        // RIFF 宣告嘅長度細過收到嘅 bytes：WebP 容許尾部多出嘅資料（parser 只驗唔可以短過）
        expect((await upload(padded)).status).toBe(200);
    });

    it('should need a session and the same origin', async () => {
        const bytes = webpVp8l(320, 320);
        const headers = { 'content-type': 'image/webp', origin: ORIGIN };
        expect((await call('/api/assets', { method: 'PUT', body: bytes, headers })).status).toBe(
            401,
        );
        const crossSite = await upload(bytes, 'image/webp', { origin: 'https://evil.example' });
        expect(crossSite.status).toBe(403);
        expect(await countOf('assets')).toBe(0);
    });

    it('should not take part in the post-write step: no catalog key in the response', async () => {
        const body = await json(await upload(webpVp8l(320, 320, 9)));
        expect(body).not.toHaveProperty('catalog');
    });

    it('should not log anything about the upload', async () => {
        const log = vi.spyOn(console, 'log');
        const error = vi.spyOn(console, 'error');
        await upload(webpVp8l(320, 320, 10));
        await upload(textBytes('not an image'));
        expect(log).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        log.mockRestore();
        error.mockRestore();
    });

    it('should only answer PUT on /api/assets', async () => {
        expect((await api('GET', '/api/assets')).status).toBe(404);
        expect((await api('POST', '/api/assets', 'x')).status).toBe(404);
    });
});

describe('setting an album cover from uploads (API-050 then API-013)', () => {
    it('should let PATCH point cover and thumb at the uploaded names, with an edited accent', async () => {
        await insertAlbum('apollo-18', 1);
        const cover = await json<{ name: string }>(await upload(webpVp8l(1200, 1200, 1)));
        const thumb = await json<{ name: string }>(await upload(webpVp8l(320, 320, 2)));
        const before = await albumRow('apollo-18');
        const response = await api(
            'PATCH',
            '/api/albums/apollo-18',
            { cover: cover.name, thumb: thumb.name, accent: '#1A2B3C' },
            { 'if-match': `"${String(before?.updated_at)}"` },
        );
        expect(response.status).toBe(200);
        expect(await albumRow('apollo-18')).toMatchObject({
            cover: cover.name,
            thumb: thumb.name,
            accent: '#1a2b3c',
        });
    });
});
