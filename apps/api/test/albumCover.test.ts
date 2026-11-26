/*
 * API-017 PUT /api/albums/:id/cover（T-106；Technical Spec API-017；Functional Spec D74、D55）：
 * 管理端處理好同步嘅封面來源（coverJobs）、經 API-050 上載 1200 同 320 兩張圖之後，話畀 Worker 知係邊個位、邊個來源版本。
 * 檢查：來源係呢張碟資料夾嘅 cover／cover2、ETag 仲係嗰個（STALE）、1200 同 320 冇調亂、第二張要有第一張；
 * 專輯色只跟第一張；寫完生成 catalog；唔寫媒體 bucket
 */
import { NEUTRAL_ACCENT } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { imageKeyOf } from '../src/assets/imageName';
import { albumRow, api, dbWithHook, insertAsset, json } from './albumFixtures';
import { liveDocument } from './catalogFixtures';
import { ORIGIN, call, loginCookie } from './helpers';
import { IMAGE_HEADER_BYTES } from '../src/config';
import { jpegFrom, segment, sofSegment, webpVp8l } from './imageFixtures';
import {
    ALBUM_ID,
    mediaKey,
    putKomorebi,
    putMedia,
    recordedMedia,
    syncFolder,
    type Loose,
} from './syncFixtures';

const COVER_KEY = mediaKey('cover.jpg');
const ACCENT = '#a1b2c3';
const BIG = 1200;
const SMALL = 320;

/** API-050：上載一張圖，回佢嘅名 */
const upload = async (side: number, seed: number) => {
    const headers = { cookie: await loginCookie(), origin: ORIGIN, 'content-type': 'image/webp' };
    const response = await call('/api/assets', {
        method: 'PUT',
        body: webpVp8l(side, side, seed),
        headers,
    });
    return (await json<{ name: string }>(response)).name;
};

const putCover = async (body: unknown, id = ALBUM_ID, bindings = env) => {
    const response = await api('PUT', `/api/albums/${id}/cover`, body, {}, bindings);
    return { status: response.status, body: await json<Loose>(response) };
};

/** 唔經 API-050 放一張圖落 rb-discography-catalog（`registered` = 連 assets 都登記） */
const placeImage = async (name: string, bytes: Uint8Array, registered = true) => {
    await env.CATALOG.put(imageKeyOf(name), bytes);
    if (registered) await insertAsset(name);
    return name;
};

const etagOf = async (key = COVER_KEY) => (await env.MEDIA.head(key))?.httpEtag ?? '';

/** 第一張封面嘅結果（兩張圖已上載） */
const firstCover = async (extra: Record<string, unknown> = {}) => ({
    slot: 'cover',
    cover: await upload(BIG, 1),
    thumb: await upload(SMALL, 2),
    sourceKey: COVER_KEY,
    sourceEtag: await etagOf(),
    accent: ACCENT,
    ...extra,
});

beforeEach(async () => {
    await putKomorebi();
    await syncFolder();
});

describe('PUT /api/albums/:id/cover: first cover', () => {
    it('should store both images, the source version and the colour, and rebuild the catalog', async () => {
        const body = await firstCover();
        const { status, body: answer } = await putCover(body);
        expect(status).toBe(200);
        expect(answer.album).toMatchObject({
            id: ALBUM_ID,
            cover: body.cover,
            thumb: body.thumb,
            coverSourceEtag: body.sourceEtag,
            accent: ACCENT,
        });
        expect(answer.catalog).toMatchObject({ ok: true });
        expect((await liveDocument())?.albums[0]).toMatchObject({
            cover: body.cover,
            thumb: body.thumb,
            accent: ACCENT,
        });
        expect((await syncFolder()).body.coverJobs).toEqual([]);
    });

    it('should keep the colour when none is given', async () => {
        const body = await firstCover();
        delete (body as Loose).accent;
        expect((await putCover(body)).status).toBe(200);
        expect((await albumRow(ALBUM_ID))?.accent).toBe(NEUTRAL_ACCENT);
    });

    it('should store a not-square hint that later scans keep', async () => {
        const { body } = await putCover(await firstCover({ notSquare: true }));
        expect(body.checks).toEqual([
            expect.objectContaining({ code: 'COVER_NOT_SQUARE', key: COVER_KEY }),
        ]);
        const again = await syncFolder();
        expect(again.body.checks.map(({ code }: Loose) => code)).toEqual(['COVER_NOT_SQUARE']);
        const square = await putCover(await firstCover({ sourceEtag: await etagOf() }));
        expect(square.body.checks).toEqual([]);
    });
});

describe('PUT /api/albums/:id/cover: second cover', () => {
    it('should store the second cover without touching the colour', async () => {
        await putCover(await firstCover());
        const etag = await putMedia('cover2.png', 'png');
        await syncFolder();
        const body = {
            slot: 'cover2',
            cover: await upload(BIG, 3),
            thumb: await upload(SMALL, 4),
            sourceKey: mediaKey('cover2.png'),
            sourceEtag: etag,
        };
        const { status, body: answer } = await putCover(body);
        expect(status).toBe(200);
        expect(answer.album).toMatchObject({
            cover2: body.cover,
            thumb2: body.thumb,
            cover2SourceEtag: etag,
            accent: ACCENT,
        });
    });

    // W-048（mutant N21）：讀專輯之後、寫之前，另一個請求清咗第一張 → 409，唔撞 D1 CHECK
    it('should answer 409 NO_FIRST_COVER when the first cover is cleared at the same time', async () => {
        await putCover(await firstCover());
        const etag = await putMedia('cover2.png', 'png');
        await syncFolder();
        const body = {
            slot: 'cover2',
            cover: await upload(BIG, 3),
            thumb: await upload(SMALL, 4),
            sourceKey: mediaKey('cover2.png'),
            sourceEtag: etag,
        };
        const clearFirst = () =>
            env.DB.prepare('UPDATE albums SET cover = NULL, thumb = NULL WHERE id = ?')
                .bind(ALBUM_ID)
                .run();
        const db = dbWithHook('SELECT name FROM assets', clearFirst);
        const { status, body: answer } = await putCover(body, ALBUM_ID, { ...env, DB: db });
        expect(status).toBe(409);
        expect(answer.error.code).toBe('NO_FIRST_COVER');
        expect((await albumRow(ALBUM_ID))?.cover2).toBeNull();
    });

    it('should answer 409 NO_FIRST_COVER while the album has no first cover', async () => {
        const etag = await putMedia('cover2.png', 'png');
        const body = {
            slot: 'cover2',
            cover: await upload(BIG, 3),
            thumb: await upload(SMALL, 4),
            sourceKey: mediaKey('cover2.png'),
            sourceEtag: etag,
        };
        const { status, body: answer } = await putCover(body);
        expect(status).toBe(409);
        expect(answer.error.code).toBe('NO_FIRST_COVER');
        expect((await albumRow(ALBUM_ID))?.cover2).toBeNull();
    });
});

describe('PUT /api/albums/:id/cover: checks', () => {
    it('should refuse swapped sizes and write nothing', async () => {
        const body = await firstCover();
        const swapped = { ...body, cover: body.thumb, thumb: body.cover };
        const { status, body: answer } = await putCover(swapped);
        expect(status).toBe(400);
        expect(answer.error.details.map(({ path, reason }: Loose) => [path, reason])).toEqual([
            ['cover', 'WRONG_SIZE'],
            ['thumb', 'WRONG_SIZE'],
        ]);
        expect((await albumRow(ALBUM_ID))?.cover).toBeNull();
    });

    // W-048（mutant N19）：1200 × 800 唔可以當 1200² 收
    it('should refuse an image that is not square', async () => {
        const cover = await placeImage('00000000000000aa.webp', webpVp8l(BIG, 800, 5));
        const { status, body } = await putCover(await firstCover({ cover }));
        expect(status).toBe(400);
        expect(body.error.details).toContainEqual(
            expect.objectContaining({ path: 'cover', reason: 'WRONG_SIZE' }),
        );
        expect((await albumRow(ALBUM_ID))?.cover).toBeNull();
    });

    // S-186：只讀圖嘅頭（range get）；JPEG 嘅 SOF 喺好大嘅 APPn 之後 = 再讀成個檔（有上限）
    it('should read only the start of each image, and all of a JPEG whose frame comes late', async () => {
        const metadata = new Array<number>(65_000).fill(0x20);
        const late = jpegFrom([
            segment(0xe1, metadata),
            segment(0xe2, metadata),
            sofSegment(BIG, BIG),
        ]);
        expect(late.length).toBeGreaterThan(IMAGE_HEADER_BYTES);
        const cover = await placeImage('00000000000000cc.jpg', late);
        const body = await firstCover({ cover });
        const gets: [string, R2GetOptions | undefined][] = [];
        const catalog = new Proxy(env.CATALOG, {
            get(target, key: string) {
                const value = Reflect.get(target, key) as unknown;
                if (typeof value !== 'function') return value;
                if (key !== 'get') return value.bind(target);
                return (name: string, options?: R2GetOptions) => {
                    if (name.startsWith(imageKeyOf(''))) gets.push([name, options]);
                    return target.get(name, options);
                };
            },
        });
        const { status } = await putCover(body, ALBUM_ID, { ...env, CATALOG: catalog });
        expect(status).toBe(200);
        const range = { range: { length: IMAGE_HEADER_BYTES } };
        expect(gets).toEqual([
            [imageKeyOf(cover), range],
            [imageKeyOf(body.thumb), range],
            [imageKeyOf(cover), undefined],
        ]);
    });

    // W-048（mutant N30）：R2 有圖但 assets 冇登記 = 未經 API-050 上載
    it('should refuse an image that is in the bucket but not registered', async () => {
        const cover = await placeImage('00000000000000bb.webp', webpVp8l(BIG, BIG, 6), false);
        const { status, body } = await putCover(await firstCover({ cover }));
        expect(status).toBe(400);
        expect(body.error.details).toContainEqual(
            expect.objectContaining({ path: 'cover', reason: 'IMAGE_NOT_FOUND' }),
        );
    });

    // S-187：讀專輯之後另一個請求改咗專輯（同步寫檢查結果、或者改咗 updated_at）→ 409 STALE，唔蓋走
    it.each([
        [
            'the checks',
            `UPDATE albums SET checks = '[{"code":"NO_INFO","level":"warning","params":{}}]'`,
        ],
        ['the version', "UPDATE albums SET updated_at = '2030-01-01T00:00:00.000Z'"],
    ])('should answer 409 STALE when %s changed since the album was read', async (_name, sql) => {
        const body = await firstCover();
        const before = await albumRow(ALBUM_ID);
        const db = dbWithHook('SELECT name FROM assets', () => env.DB.prepare(sql).run());
        const { status, body: answer } = await putCover(body, ALBUM_ID, { ...env, DB: db });
        expect(status).toBe(409);
        expect(answer.error.code).toBe('STALE');
        const after = await albumRow(ALBUM_ID);
        expect(after).toMatchObject({ cover: null, accent: before?.accent });
    });

    it('should answer 409 STALE when the source changed or is gone', async () => {
        const body = await firstCover();
        await putMedia('cover.jpg', 'another jpeg');
        expect((await putCover(body)).body.error.code).toBe('STALE');
        await env.MEDIA.delete(COVER_KEY);
        expect((await putCover(body)).status).toBe(409);
        expect((await albumRow(ALBUM_ID))?.cover).toBeNull();
    });

    it.each([
        ['another folder', 'album-12-other/cover.jpg'],
        ['the other slot', mediaKey('cover2.jpg')],
        ['path traversal', `${mediaKey('..')}/album-12-other/cover.jpg`],
        ['a sub-folder', mediaKey('old/cover.jpg')],
        ['a song text', mediaKey('05 太平門.txt')],
    ])('should refuse a source in %s', async (_name, sourceKey) => {
        const { status, body } = await putCover(await firstCover({ sourceKey }));
        expect(status).toBe(400);
        expect(body.error.details).toContainEqual({
            path: 'sourceKey',
            reason: 'INVALID_VALUE',
            message: expect.any(String),
        });
    });

    it('should refuse an image that was never uploaded', async () => {
        const { status, body } = await putCover(
            await firstCover({ cover: '0123456789abcdef.webp' }),
        );
        expect(status).toBe(400);
        expect(body.error.details).toContainEqual(
            expect.objectContaining({ path: 'cover', reason: 'IMAGE_NOT_FOUND' }),
        );
    });

    it.each([
        [{}, 'slot', 'REQUIRED'],
        [{ slot: 'cover3' }, 'slot', 'INVALID_VALUE'],
        [{ cover: '../x.webp' }, 'cover', 'INVALID_VALUE'],
        [{ sourceEtag: '*' }, 'sourceEtag', 'INVALID_VALUE'],
        [{ accent: 'red' }, 'accent', 'INVALID_VALUE'],
        // W-048（mutant N31）：三位色碼過唔到 catalog validator
        [{ accent: '#abc' }, 'accent', 'INVALID_VALUE'],
        [{ slot: 'cover2', accent: ACCENT }, 'accent', 'NOT_EDITABLE'],
        [{ notSquare: 'yes' }, 'notSquare', 'INVALID_VALUE'],
        [{ title: 'x' }, 'title', 'NOT_EDITABLE'],
    ])('should refuse %j at %s with %s', async (extra, path, reason) => {
        const body = { ...(await firstCover()), ...extra };
        if (path === 'slot' && reason === 'REQUIRED') delete (body as Loose).slot;
        const { status, body: answer } = await putCover(body);
        expect(status).toBe(400);
        expect(answer.error.details).toContainEqual({ path, reason, message: expect.any(String) });
    });

    // S-186：body 有上限（未 parse 就擋）
    it('should answer 413 for a huge body without parsing it', async () => {
        const body = { ...(await firstCover()), title: 'x'.repeat(2_000_000) };
        const { status, body: answer } = await putCover(body);
        expect(status).toBe(413);
        expect(answer.error.code).toBe('TOO_LARGE');
        expect((await albumRow(ALBUM_ID))?.cover).toBeNull();
    });

    it('should answer 404 for an unknown album', async () => {
        expect((await putCover(await firstCover(), 'nothing')).status).toBe(404);
    });

    it('should never write or delete anything in the media bucket', async () => {
        const { puts, calls, bindings } = recordedMedia();
        await putCover(await firstCover(), ALBUM_ID, bindings);
        expect(puts).toEqual([]);
        expect(calls.delete).toBeUndefined();
    });
});
