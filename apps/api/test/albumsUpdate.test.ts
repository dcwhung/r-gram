/* API-013 PATCH /api/albums/:id：只改有畀嘅欄位；If-Match 樂觀鎖（409 STALE）；id 唔可以改 */
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
