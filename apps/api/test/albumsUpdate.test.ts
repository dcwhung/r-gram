/*
 * API-013 PATCH /api/albums/:id：只改有畀嘅欄位；If-Match 樂觀鎖（409 STALE）；id 唔可以改。
 * CR-004：發行類別、序號（同類別唔重覆）、封面來源 ETag；expectedFolder 跟住類別同序號計
 */
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, albumRow, api, insertAlbum, insertAsset, json } from './albumFixtures';

interface ErrorBody {
    error: { code: string; message: string; details?: Record<string, unknown>[] };
}

const patch = (id: string, body: unknown, ifMatch: string | null = `"${NOW}"`) =>
    api('PATCH', `/api/albums/${id}`, body, ifMatch === null ? {} : { 'if-match': ifMatch });

describe('PATCH /api/albums/:id', () => {
    beforeEach(async () => {
        await insertAlbum('apollo-18', 1, {
            title: 'Apollo 18',
            release_date: '2008-09-26',
            year: 2008,
            type: '錄音室專輯',
            category: 'album',
            category_no: 1,
        });
    });

    it('should change only the given fields and return the album with a newer updatedAt', async () => {
        const response = await patch('apollo-18', { label: '金牌娛樂', accent: '#AABBCC' });
        expect(response.status).toBe(200);
        const body = await json(response);
        expect(body).toMatchObject({
            id: 'apollo-18',
            title: 'Apollo 18',
            releaseDate: '2008-09-26',
            year: 2008,
            type: '錄音室專輯',
            label: '金牌娛樂',
            accent: '#aabbcc',
        });
        expect((body.updatedAt as string) > NOW).toBe(true);
        expect((await albumRow('apollo-18'))?.updated_at).toBe(body.updatedAt);
    });

    it('should keep the wheel key when only the title changes', async () => {
        const body = await json(await patch('apollo-18', { title: '阿波羅' }));
        expect(body).toMatchObject({ title: '阿波羅', wheelKey: 'A' });
    });

    it('should follow the release date with the year, and clear both together', async () => {
        expect(await json(await patch('apollo-18', { releaseDate: '2009-01-02' }))).toMatchObject({
            year: 2009,
        });
        const row = await albumRow('apollo-18');
        const cleared = await patch('apollo-18', { releaseDate: null }, `"${row?.updated_at}"`);
        expect(await json(cleared)).toMatchObject({ releaseDate: null, year: null });
    });

    it('should set and clear the cover, folder and thumb', async () => {
        await insertAsset('feed000000000000.webp');
        const body = await json(
            await patch('apollo-18', {
                cover: 'feed000000000000.webp',
                thumb: 'feed000000000000.webp',
                folder: 'apollo',
            }),
        );
        expect(body).toMatchObject({ cover: 'feed000000000000.webp', folder: 'apollo' });
        const etag = `"${body.updatedAt as string}"`;
        const cleared = await json(await patch('apollo-18', { folder: null, cover: null }, etag));
        expect(cleared).toMatchObject({
            folder: null,
            cover: null,
            thumb: 'feed000000000000.webp',
        });
    });

    it('should change the category and ordinal and follow them with expectedFolder', async () => {
        const response = await patch('apollo-18', { category: 'best', categoryNo: 3 });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({
            category: 'best',
            categoryNo: 3,
            folder: null,
            expectedFolder: 'best-03-apollo-18',
        });
        expect(await albumRow('apollo-18')).toMatchObject({ category: 'best', category_no: 3 });
    });

    it('should keep a manual folder when the category changes', async () => {
        await patch('apollo-18', { folder: 'Apollo 18 (2008)' });
        const row = await albumRow('apollo-18');
        const body = await json(
            await patch('apollo-18', { categoryNo: 4 }, `"${row?.updated_at}"`),
        );
        expect(body).toMatchObject({
            folder: 'Apollo 18 (2008)',
            expectedFolder: 'album-04-apollo-18',
        });
    });

    it('should refuse an ordinal taken by another album of the same category', async () => {
        await insertAlbum('beaming', 2, { category: 'album', category_no: 2 });
        const response = await patch('apollo-18', { categoryNo: 2 });
        expect(response.status).toBe(400);
        expect((await json<ErrorBody>(response)).error.details).toEqual([
            {
                path: 'categoryNo',
                reason: 'ORDINAL_TAKEN',
                message: zhHant.albums.reasons.ORDINAL_TAKEN,
            },
        ]);
        expect(await albumRow('apollo-18')).toMatchObject({ category_no: 1, updated_at: NOW });
    });

    it('should refuse a new category whose ordinal is taken there', async () => {
        await insertAlbum('frank-ep', 2, { category: 'ep', category_no: 1 });
        const response = await patch('apollo-18', { category: 'ep' });
        expect(response.status).toBe(400);
        const details = (await json<ErrorBody>(response)).error.details;
        expect(details?.map((d) => `${d.path}:${d.reason}`)).toEqual(['categoryNo:ORDINAL_TAKEN']);
        expect((await albumRow('apollo-18'))?.category).toBe('album');
    });

    it('should let an album keep its own ordinal and move to a free one', async () => {
        await insertAlbum('beaming', 2, { category: 'ep', category_no: 2 });
        expect((await patch('apollo-18', { category: 'album', categoryNo: 1 })).status).toBe(200);
        const row = await albumRow('apollo-18');
        const moved = await patch(
            'apollo-18',
            { category: 'ep', categoryNo: 1 },
            `"${row?.updated_at}"`,
        );
        expect(moved.status).toBe(200);
    });

    it('should answer STALE rather than ORDINAL_TAKEN for an old If-Match', async () => {
        await insertAlbum('beaming', 2, { category: 'album', category_no: 2 });
        const response = await patch('apollo-18', { categoryNo: 2 }, '"2020-01-01T00:00:00.000Z"');
        expect(response.status).toBe(409);
        expect(await json<ErrorBody>(response)).toMatchObject({ error: { code: 'STALE' } });
    });

    it('should store and clear the cover source ETag', async () => {
        const body = await json(await patch('apollo-18', { coverSourceEtag: '"9b2c1a"' }));
        expect(body).toMatchObject({ coverSourceEtag: '"9b2c1a"' });
        const etag = `"${body.updatedAt as string}"`;
        const cleared = await json(await patch('apollo-18', { coverSourceEtag: null }, etag));
        expect(cleared).toMatchObject({ coverSourceEtag: null });
        expect((await albumRow('apollo-18'))?.cover_source_etag).toBeNull();
    });

    it('should refuse to clear the category or the ordinal', async () => {
        const response = await patch('apollo-18', { category: null, categoryNo: null });
        const details = (await json<ErrorBody>(response)).error.details;
        expect(details?.map((d) => `${d.path}:${d.reason}`)).toEqual([
            'category:INVALID_CATEGORY',
            'categoryNo:INVALID_ORDINAL',
        ]);
    });

    it('should accept a weak or unquoted If-Match', async () => {
        expect((await patch('apollo-18', { label: 'x' }, `W/"${NOW}"`)).status).toBe(200);
        const row = await albumRow('apollo-18');
        expect((await patch('apollo-18', { label: 'y' }, row?.updated_at as string)).status).toBe(
            200,
        );
    });

    it('should answer 409 STALE when If-Match is not the current updatedAt', async () => {
        const response = await patch('apollo-18', { title: 'X' }, '"2020-01-01T00:00:00.000Z"');
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: { code: 'STALE', message: zhHant.albums.errors.stale },
        });
        expect((await albumRow('apollo-18'))?.title).toBe('Apollo 18');
    });

    it('should let only one of two saves with the same If-Match through', async () => {
        const [first, second] = await Promise.all([
            patch('apollo-18', { title: 'One' }),
            patch('apollo-18', { title: 'Two' }),
        ]);
        expect([first?.status, second?.status].sort()).toEqual([200, 409]);
    });

    it('should require If-Match', async () => {
        const response = await patch('apollo-18', { title: 'X' }, null);
        expect(response.status).toBe(400);
        expect((await json<ErrorBody>(response)).error.details).toEqual([
            {
                path: 'If-Match',
                reason: 'REQUIRED',
                message: zhHant.albums.reasons.REQUIRED,
            },
        ]);
    });

    it('should refuse to change the id or a shelf flag', async () => {
        const response = await patch('apollo-18', { id: 'other', enabled: false });
        expect(response.status).toBe(400);
        const details = (await json<ErrorBody>(response)).error.details;
        expect(details?.map((d) => `${d.path}:${d.reason}`)).toEqual([
            'id:NOT_EDITABLE',
            'enabled:NOT_EDITABLE',
        ]);
    });

    it('should validate the given fields like a create', async () => {
        const response = await patch('apollo-18', { title: '', accent: '#12345', cover: 'x.webp' });
        expect(response.status).toBe(400);
        const details = (await json<ErrorBody>(response)).error.details;
        expect(details?.map((d) => `${d.path}:${d.reason}`).sort()).toEqual([
            'accent:INVALID_COLOUR',
            'cover:UNKNOWN_ASSET',
            'title:REQUIRED',
        ]);
    });

    it('should answer 404 NOT_FOUND for an unknown album', async () => {
        const response = await patch('nope', { title: 'X' });
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });
});
