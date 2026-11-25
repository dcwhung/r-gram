/* API-011 POST /api/albums：新增專輯（冇上下架、冇草稿；欄位驗證錯誤用書面語） */
import { zhHant } from '../src/i18n/zh-Hant';
import { albumRow, api, insertAlbum, insertAsset, json } from './albumFixtures';

interface ErrorBody {
    error: { code: string; message: string; details?: Record<string, unknown>[] };
}

const create = (body: unknown) => api('POST', '/api/albums', body);

const reasonsOf = async (response: Response) =>
    (await json<ErrorBody>(response)).error.details?.map((d) => `${d.path}:${d.reason}`);

describe('POST /api/albums', () => {
    it('should create an album with defaults and answer 201 with the album', async () => {
        const response = await create({ id: 'apollo-18', title: '  Apollo 18 ' });
        expect(response.status).toBe(201);
        const body = await json(response);
        expect(body).toMatchObject({
            id: 'apollo-18',
            title: 'Apollo 18',
            wheelKey: 'A',
            releaseDate: null,
            year: null,
            type: '',
            label: '',
            accent: '#6e6e6e',
            cover: null,
            thumb: null,
            folder: null,
        });
        expect(Date.parse(body.updatedAt as string)).not.toBeNaN();
        expect(body).not.toHaveProperty('enabled');
    });

    it('should take the wheel key of a Chinese title from its first character', async () => {
        const body = await json(await create({ id: 'zhong', title: '《中》' }));
        expect(body.wheelKey).toBe('中');
    });

    it('should store every optional field and derive the year from the release date', async () => {
        await insertAsset('c0ffee0000000000.webp');
        const body = await json(
            await create({
                id: 'beaming',
                title: 'Beaming',
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
            folder: 'Beaming 2005',
        });
    });

    it('should append the new album after the last one', async () => {
        await insertAlbum('first', 7);
        await create({ id: 'second', title: 'Second' });
        expect((await albumRow('second'))?.sort_order).toBe(8);
    });

    it('should answer 409 CONFLICT when the id is taken', async () => {
        await insertAlbum('apollo-18', 1);
        const response = await create({ id: 'apollo-18', title: 'Again' });
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
            'cover:UNKNOWN_ASSET',
            'enabled:NOT_EDITABLE',
            'folder:INVALID_FOLDER',
            'id:INVALID_ID',
            'releaseDate:INVALID_DATE',
            'title:REQUIRED',
            'wheelKey:INVALID_WHEEL_KEY',
        ]);
    });

    it('should require id and title', async () => {
        expect(await reasonsOf(await create({}))).toEqual(['id:REQUIRED', 'title:REQUIRED']);
    });

    it('should refuse the reserved favourites id and an over-long id', async () => {
        const long = 'a'.repeat(65);
        for (const id of ['favourites', long, 'a--b', '-a']) {
            expect(await reasonsOf(await create({ id, title: 'T' })), id).toEqual([
                'id:INVALID_ID',
            ]);
        }
    });

    it('should refuse wrong types, control characters and over-long text', async () => {
        const reasons = await reasonsOf(
            await create({
                id: 'x',
                title: 'a'.repeat(201),
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
            releaseDate: null,
            cover: null,
            thumb: null,
            folder: null,
        });
        expect(response.status).toBe(201);
    });

    it('should answer VALIDATION_ERROR when the body is not a JSON object', async () => {
        for (const body of ['not json', '[1]', 'null']) {
            const response = await create(body);
            expect(response.status, body).toBe(400);
            expect(await reasonsOf(response), body).toEqual(['$:NOT_AN_OBJECT']);
        }
    });
});
