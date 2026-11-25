/*
 * API-011 POST /api/albums：新增專輯（冇上下架、冇草稿；欄位驗證錯誤用書面語）。
 * CR-004：發行類別必填；冇畀序號 = 嗰個類別最大序號 + 1；同類別序號唔可以重覆；回應帶 expectedFolder
 */
import { reasonMessage } from '../src/albums/errors';
import { CATEGORY_NO_MAX } from '../src/albums/fieldRules';
import { ALBUM_ID_MAX_CHARS } from '../src/albums/validate';
import { zhHant } from '../src/i18n/zh-Hant';
import { albumRow, api, insertAlbum, insertAsset, json } from './albumFixtures';

interface ErrorBody {
    error: { code: string; message: string; details?: Record<string, unknown>[] };
}

const create = (body: unknown) => api('POST', '/api/albums', body);

/** 必填之外冇其他欄位嘅新增 */
const createBare = (id: string, category = 'album') => create({ id, title: id, category });

const reasonsOf = async (response: Response) =>
    (await json<ErrorBody>(response)).error.details?.map((d) => `${d.path}:${d.reason}`);

describe('POST /api/albums', () => {
    it('should create an album with defaults and answer 201 with the album', async () => {
        const response = await create({
            id: 'apollo-18',
            title: '  Apollo 18 ',
            category: 'album',
        });
        expect(response.status).toBe(201);
        const body = await json(response);
        expect(body).toMatchObject({
            id: 'apollo-18',
            title: 'Apollo 18',
            wheelKey: 'A',
            releaseDate: null,
            year: null,
            type: '',
            category: 'album',
            categoryNo: 1,
            label: '',
            accent: '#6e6e6e',
            cover: null,
            coverSourceEtag: null,
            thumb: null,
            folder: null,
            expectedFolder: 'album-01-apollo-18',
        });
        expect(Date.parse(body.updatedAt as string)).not.toBeNaN();
        expect(body).not.toHaveProperty('enabled');
    });

    it('should take the wheel key of a Chinese title from its first character', async () => {
        const body = await json(await create({ id: 'zhong', title: '《中》', category: 'single' }));
        expect(body.wheelKey).toBe('中');
    });

    it('should store every optional field and derive the year from the release date', async () => {
        await insertAsset('c0ffee0000000000.webp');
        const body = await json(
            await create({
                id: 'beaming',
                title: 'Beaming',
                category: 'album',
                categoryNo: 2,
                coverSourceEtag: '"9b2c1a"',
                wheelKey: 'Be',
                releaseDate: '2005-03-08',
                type: '錄音室專輯',
                label: '金牌娛樂',
                accent: '#C8442B',
                cover: 'c0ffee0000000000.webp',
                thumb: 'c0ffee0000000000.webp',
                folder: 'Beaming 2005',
            }),
        );
        expect(body).toMatchObject({
            wheelKey: 'Be',
            releaseDate: '2005-03-08',
            year: 2005,
            type: '錄音室專輯',
            label: '金牌娛樂',
            accent: '#c8442b',
            cover: 'c0ffee0000000000.webp',
            coverSourceEtag: '"9b2c1a"',
            categoryNo: 2,
            folder: 'Beaming 2005',
            expectedFolder: 'album-02-beaming',
        });
    });

    it('should append the new album after the last one', async () => {
        await insertAlbum('first', 7);
        await createBare('second');
        expect((await albumRow('second'))?.sort_order).toBe(8);
    });

    it('should answer 409 CONFLICT when the id is taken', async () => {
        await insertAlbum('apollo-18', 1);
        const response = await createBare('apollo-18');
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: { code: 'CONFLICT', message: zhHant.albums.errors.idTaken },
        });
    });

    it('should list every invalid field with a written-Chinese message', async () => {
        const response = await create({
            id: 'Bad Id',
            title: '   ',
            wheelKey: 'ABC',
            releaseDate: '2008-02-30',
            accent: 'red',
            cover: 'missing.webp',
            folder: 'a/b',
            category: 'compilation',
            categoryNo: 0,
            enabled: true,
        });
        expect(response.status).toBe(400);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe(zhHant.albums.errors.invalid);
        expect(body.error.details).toContainEqual({
            path: 'accent',
            reason: 'INVALID_COLOUR',
            message: zhHant.albums.reasons.INVALID_COLOUR,
        });
        expect(body.error.details?.map((d) => `${d.path}:${d.reason}`).sort()).toEqual([
            'accent:INVALID_COLOUR',
            'category:INVALID_CATEGORY',
            'categoryNo:INVALID_ORDINAL',
            'cover:UNKNOWN_ASSET',
            'enabled:NOT_EDITABLE',
            'folder:INVALID_FOLDER',
            'id:INVALID_ID',
            'releaseDate:INVALID_DATE',
            'title:REQUIRED',
            'wheelKey:INVALID_WHEEL_KEY',
        ]);
    });

    it('should require id, title and category', async () => {
        expect(await reasonsOf(await create({}))).toEqual([
            'id:REQUIRED',
            'title:REQUIRED',
            'category:REQUIRED',
        ]);
    });

    it('should refuse the reserved favourites id and an over-long id', async () => {
        const long = 'a'.repeat(65);
        for (const id of ['favourites', long, 'a--b', '-a']) {
            expect(await reasonsOf(await createBare(id)), id).toEqual(['id:INVALID_ID']);
        }
    });

    it('should word the id rule in written Chinese with the limit taken from ALBUM_ID_MAX_CHARS', async () => {
        const template: string = zhHant.albums.reasons.INVALID_ID;
        expect(template).toContain('小寫');
        expect(template).not.toContain('小楷');
        expect(template).not.toMatch(/\d/);
        const body = await json<ErrorBody>(await createBare('A'));
        const message = String(body.error.details?.[0]?.message);
        expect(message).toContain(`最多 ${ALBUM_ID_MAX_CHARS} 個字元`);
        expect(message).not.toMatch(/[{}]/);
    });

    it('should refuse wrong types, control characters and over-long text', async () => {
        const reasons = await reasonsOf(
            await create({
                id: 'x',
                title: 'a'.repeat(201),
                category: 'album',
                type: 3,
                label: 'line\nbreak',
                wheelKey: ' A',
                releaseDate: 20080926,
                folder: '',
            }),
        );
        expect(reasons?.sort()).toEqual([
            'folder:INVALID_FOLDER',
            'label:INVALID_TEXT',
            'releaseDate:INVALID_DATE',
            'title:TOO_LONG',
            'type:INVALID_TEXT',
            'wheelKey:INVALID_WHEEL_KEY',
        ]);
    });

    it('should accept null for the optional fields', async () => {
        const response = await create({
            id: 'x',
            title: 'X',
            category: 'album',
            releaseDate: null,
            cover: null,
            coverSourceEtag: null,
            thumb: null,
            folder: null,
        });
        expect(response.status).toBe(201);
    });

    // CR-004（FR-124）：序號喺每個類別入面由 1 起數
    it('should number a new album after the highest ordinal of its own category', async () => {
        await insertAlbum('apollo-18', 1, { category: 'album', category_no: 1 });
        await insertAlbum('hours', 2, { category: 'album', category_no: 8 });
        await insertAlbum('frank-ep', 3, { category: 'ep', category_no: 1 });
        const album = await json(await createBare('komorebi'));
        expect(album).toMatchObject({ categoryNo: 9, expectedFolder: 'album-09-komorebi' });
        const ep = await json(await createBare('ni-dou', 'ep'));
        expect(ep).toMatchObject({ categoryNo: 2, expectedFolder: 'ep-02-ni-dou' });
        const live = await json(await createBare('concert', 'live'));
        expect(live).toMatchObject({ categoryNo: 1, expectedFolder: 'live-01-concert' });
    });

    // S-118：自動序號都要守 CATEGORY_NO_MAX（同一句 INSERT 入面判斷，唔先讀後寫）
    it('should give the automatic ordinal up to CATEGORY_NO_MAX', async () => {
        await insertAlbum('last-but-one', 1, {
            category: 'single',
            category_no: CATEGORY_NO_MAX - 1,
        });
        const response = await createBare('last', 'single');
        expect(response.status).toBe(201);
        expect(await json(response)).toMatchObject({ categoryNo: CATEGORY_NO_MAX });
    });

    it('should refuse an automatic ordinal past CATEGORY_NO_MAX with INVALID_ORDINAL', async () => {
        await insertAlbum('full', 1, { category: 'single', category_no: CATEGORY_NO_MAX });
        const response = await createBare('one-too-many', 'single');
        expect(response.status).toBe(400);
        expect(await json<ErrorBody>(response)).toMatchObject({
            error: {
                code: 'VALIDATION_ERROR',
                details: [
                    {
                        path: 'categoryNo',
                        reason: 'INVALID_ORDINAL',
                        message: reasonMessage('INVALID_ORDINAL'),
                    },
                ],
            },
        });
        expect(await albumRow('one-too-many')).toBeNull();
    });

    it('should refuse an ordinal already used in the same category with ORDINAL_TAKEN', async () => {
        await insertAlbum('apollo-18', 1, { category: 'album', category_no: 1 });
        const response = await create({ id: 'x', title: 'X', category: 'album', categoryNo: 1 });
        expect(response.status).toBe(400);
        expect((await json<ErrorBody>(response)).error.details).toEqual([
            {
                path: 'categoryNo',
                reason: 'ORDINAL_TAKEN',
                message: zhHant.albums.reasons.ORDINAL_TAKEN,
            },
        ]);
        expect(await albumRow('x')).toBeNull();
    });

    it('should accept the same ordinal in another category', async () => {
        await insertAlbum('apollo-18', 1, { category: 'album', category_no: 1 });
        const response = await create({ id: 'x', title: 'X', category: 'ep', categoryNo: 1 });
        expect(response.status).toBe(201);
        expect((await albumRow('x'))?.category_no).toBe(1);
    });

    it('should report a taken id before a taken ordinal', async () => {
        await insertAlbum('apollo-18', 1, { category: 'album', category_no: 1 });
        const body = { id: 'apollo-18', title: 'X', category: 'album', categoryNo: 1 };
        const response = await create(body);
        expect(response.status).toBe(409);
        expect(await json<ErrorBody>(response)).toMatchObject({ error: { code: 'CONFLICT' } });
    });

    it('should answer VALIDATION_ERROR when the body is not a JSON object', async () => {
        for (const body of ['not json', '[1]', 'null']) {
            const response = await create(body);
            expect(response.status, body).toBe(400);
            expect(await reasonsOf(response), body).toEqual(['$:NOT_AN_OBJECT']);
        }
    });
});
