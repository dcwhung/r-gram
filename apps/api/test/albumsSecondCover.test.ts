/*
 * CR-005（Functional Spec D55、FR-125；Technical Spec API-011–013「第二張封面」）：
 * 可選嘅第二張封面 `cover2` + 縮圖 `thumb2` + 掃描來源 ETag `cover2SourceEtag`。
 * 規則同第一張一樣（要係已上載嘅圖）；兩個欄一齊有或者一齊冇；冇第一張就唔可以有第二張
 *（移除第一張而第二張仲喺度 → 400 COVER2_WITHOUT_COVER）。判斷用改完之後嘅狀態（body + 而家嘅值）
 */
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, albumRow, api, insertAlbum, insertAsset, json } from './albumFixtures';

interface ErrorBody {
    error: { code: string; message: string; details?: Record<string, unknown>[] };
}

const COVER = 'c0c0c0c0c0c0c0c0.webp';
const THUMB = 't0t0t0t0t0t0t0t0.webp';
const COVER2 = 'c2c2c2c2c2c2c2c2.webp';
const THUMB2 = 't2t2t2t2t2t2t2t2.webp';
const SECOND = { cover2: COVER2, thumb2: THUMB2 };
const OLD_IF_MATCH = '"2020-01-01T00:00:00.000Z"';

const patch = (id: string, body: unknown, ifMatch = `"${NOW}"`) =>
    api('PATCH', `/api/albums/${id}`, body, { 'if-match': ifMatch });

const create = (body: Record<string, unknown>) =>
    api('POST', '/api/albums', { id: 'beaming', title: 'Beaming', category: 'album', ...body });

const reasonsOf = async (response: Response) =>
    (await json<ErrorBody>(response)).error.details?.map((d) => `${d.path}:${d.reason}`);

/** apollo-18：`first` = 有第一張封面；`second` = 再有第二張 */
const seedApollo = async ({ first = true, second = false } = {}) => {
    for (const name of [COVER, THUMB, COVER2, THUMB2]) await insertAsset(name);
    await insertAlbum('apollo-18', 1, {
        ...(first && { cover: COVER, thumb: THUMB }),
        ...(second && { cover2: COVER2, thumb2: THUMB2, cover2_source_etag: '"e2"' }),
    });
};

describe('PATCH /api/albums/:id: second cover', () => {
    it('should set the second cover, its thumb and source ETag next to the first cover', async () => {
        await seedApollo();
        const response = await patch('apollo-18', { ...SECOND, cover2SourceEtag: '"9b2c"' });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({
            cover: COVER,
            thumb: THUMB,
            cover2: COVER2,
            thumb2: THUMB2,
            cover2SourceEtag: '"9b2c"',
            accent: '#c8442b',
        });
        expect(await albumRow('apollo-18')).toMatchObject({
            cover2: COVER2,
            thumb2: THUMB2,
            cover2_source_etag: '"9b2c"',
        });
    });

    it('should set both covers in one request on an album without covers', async () => {
        await seedApollo({ first: false });
        const response = await patch('apollo-18', { cover: COVER, thumb: THUMB, ...SECOND });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({ cover: COVER, cover2: COVER2 });
    });

    it('should replace only the second cover when its thumb stays', async () => {
        await seedApollo({ second: true });
        await insertAsset('c3c3c3c3c3c3c3c3.webp');
        const response = await patch('apollo-18', { cover2: 'c3c3c3c3c3c3c3c3.webp' });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({
            cover2: 'c3c3c3c3c3c3c3c3.webp',
            thumb2: THUMB2,
        });
    });

    it('should refuse second cover names that are not uploaded images', async () => {
        await seedApollo();
        const response = await patch('apollo-18', { cover2: 'x.webp', thumb2: '' });
        expect(response.status).toBe(400);
        expect((await reasonsOf(response))?.sort()).toEqual([
            'cover2:UNKNOWN_ASSET',
            'thumb2:UNKNOWN_ASSET',
        ]);
    });

    it('should refuse a second cover without its thumb, and a thumb without its cover', async () => {
        await seedApollo();
        const coverOnly = await patch('apollo-18', { cover2: COVER2 });
        expect(coverOnly.status).toBe(400);
        expect(await json<ErrorBody>(coverOnly)).toMatchObject({
            error: {
                code: 'VALIDATION_ERROR',
                details: [
                    {
                        path: 'thumb2',
                        reason: 'UNPAIRED_COVER2',
                        message: zhHant.albums.reasons.UNPAIRED_COVER2,
                    },
                ],
            },
        });
        expect(await reasonsOf(await patch('apollo-18', { thumb2: THUMB2 }))).toEqual([
            'cover2:UNPAIRED_COVER2',
        ]);
        expect((await albumRow('apollo-18'))?.updated_at).toBe(NOW);
    });

    it('should refuse to clear only one of the two second cover fields', async () => {
        await seedApollo({ second: true });
        expect(await reasonsOf(await patch('apollo-18', { thumb2: null }))).toEqual([
            'thumb2:UNPAIRED_COVER2',
        ]);
    });

    it('should refuse a second cover on an album without a first cover', async () => {
        await seedApollo({ first: false });
        const response = await patch('apollo-18', SECOND);
        expect(response.status).toBe(400);
        expect(await json<ErrorBody>(response)).toMatchObject({
            error: {
                details: [
                    {
                        path: 'cover2',
                        reason: 'COVER2_WITHOUT_COVER',
                        message: zhHant.albums.reasons.COVER2_WITHOUT_COVER,
                    },
                ],
            },
        });
        expect((await albumRow('apollo-18'))?.cover2).toBeNull();
    });

    it('should refuse to clear the first cover while the second one is still there', async () => {
        await seedApollo({ second: true });
        const response = await patch('apollo-18', { cover: null, thumb: null });
        expect(response.status).toBe(400);
        expect(await reasonsOf(response)).toEqual(['cover:COVER2_WITHOUT_COVER']);
        expect(await albumRow('apollo-18')).toMatchObject({ cover: COVER, updated_at: NOW });
    });

    it('should clear both covers together in one request', async () => {
        await seedApollo({ second: true });
        const response = await patch('apollo-18', {
            cover: null,
            thumb: null,
            cover2: null,
            thumb2: null,
        });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({
            cover: null,
            cover2: null,
            thumb2: null,
            // 同第一張一樣：清封面唔會自動清來源 ETag（由管理端決定帶唔帶 null）
            cover2SourceEtag: '"e2"',
        });
    });

    it('should store and clear the second cover source ETag on its own', async () => {
        await seedApollo();
        const body = await json(await patch('apollo-18', { cover2SourceEtag: '"77aa"' }));
        expect(body).toMatchObject({ cover2SourceEtag: '"77aa"', cover2: null });
        const etag = `"${body.updatedAt as string}"`;
        const cleared = await json(await patch('apollo-18', { cover2SourceEtag: null }, etag));
        expect(cleared).toMatchObject({ cover2SourceEtag: null });
    });

    it('should refuse an empty second cover source ETag', async () => {
        await seedApollo();
        expect(await reasonsOf(await patch('apollo-18', { cover2SourceEtag: '' }))).toEqual([
            'cover2SourceEtag:REQUIRED',
        ]);
    });

    it('should answer STALE for an old If-Match before judging the covers', async () => {
        await seedApollo({ first: false });
        const response = await patch('apollo-18', SECOND, OLD_IF_MATCH);
        expect(response.status).toBe(409);
        expect(await json<ErrorBody>(response)).toMatchObject({ error: { code: 'STALE' } });
    });

    it('should answer 404 NOT_FOUND for an unknown album', async () => {
        await seedApollo();
        const response = await patch('nope', SECOND);
        expect(response.status).toBe(404);
        expect(await json<ErrorBody>(response)).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });
});

describe('POST /api/albums: second cover', () => {
    beforeEach(async () => {
        for (const name of [COVER, THUMB, COVER2, THUMB2]) await insertAsset(name);
    });

    it('should create an album with both covers', async () => {
        const response = await create({
            cover: COVER,
            thumb: THUMB,
            ...SECOND,
            cover2SourceEtag: '"e2"',
        });
        expect(response.status).toBe(201);
        expect(await json(response)).toMatchObject({
            cover: COVER,
            cover2: COVER2,
            thumb2: THUMB2,
            cover2SourceEtag: '"e2"',
        });
    });

    it('should give a new album no second cover by default', async () => {
        expect(await json(await create({}))).toMatchObject({
            cover2: null,
            thumb2: null,
            cover2SourceEtag: null,
        });
    });

    it('should refuse a second cover without a first cover or without its thumb', async () => {
        expect(await reasonsOf(await create(SECOND))).toEqual(['cover2:COVER2_WITHOUT_COVER']);
        expect(await reasonsOf(await create({ cover: COVER, cover2: COVER2 }))).toEqual([
            'thumb2:UNPAIRED_COVER2',
        ]);
        expect(await albumRow('beaming')).toBeNull();
    });
});

describe('GET /api/albums/:id: second cover', () => {
    it('should return the second cover fields of the album', async () => {
        await seedApollo({ second: true });
        expect(await json(await api('GET', '/api/albums/apollo-18'))).toMatchObject({
            cover: COVER,
            cover2: COVER2,
            thumb2: THUMB2,
            cover2SourceEtag: '"e2"',
        });
    });
});
