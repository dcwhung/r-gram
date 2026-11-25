/* API-014 DELETE /api/albums/:id：ID 守衛（冇 ?force=1 回 409 ID_REMOVED），連歌同歌詞一齊刪（R2 歌詞檔：backlog B-048） */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import {
    albumRow,
    api,
    countOf,
    insertAlbum,
    insertLyrics,
    insertTrack,
    json,
} from './albumFixtures';

const seed = async () => {
    await insertAlbum('apollo-18', 1);
    await insertAlbum('beaming', 2);
    await insertTrack('apollo-18-02', 'apollo-18', 2);
    await insertTrack('apollo-18-01', 'apollo-18', 1);
    await insertTrack('beaming-01', 'beaming', 1);
    await insertLyrics('apollo-18-01');
};

describe('DELETE /api/albums/:id', () => {
    it('should answer 409 ID_REMOVED listing the ids that would disappear, and keep everything', async () => {
        await seed();
        const response = await api('DELETE', '/api/albums/apollo-18');
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: {
                code: 'ID_REMOVED',
                message: zhHant.albums.errors.idRemoved,
                details: [
                    { type: 'album', id: 'apollo-18' },
                    { type: 'track', id: 'apollo-18-01' },
                    { type: 'track', id: 'apollo-18-02' },
                ],
            },
        });
        expect(await countOf('tracks')).toBe(3);
    });

    // backlog B-048：刪專輯之後，冇其他歌用緊嘅歌詞檔由 R2 刪走（同刪歌一樣用 dropUnusedLyrics）
    it('should drop the lyrics files of the deleted songs that no other song uses', async () => {
        await seed();
        await insertLyrics('apollo-18-02');
        await insertLyrics('beaming-01');
        await env.DB.prepare(
            "UPDATE lyrics SET json_name = 'apollo-18-02.json' WHERE track_id = 'beaming-01'",
        ).run();
        const key = (name: string) => `catalog/v1/lyrics/${name}`;
        for (const name of ['apollo-18-01.json', 'apollo-18-02.json'])
            await env.CATALOG.put(key(name), '{}');
        const response = await api('DELETE', '/api/albums/apollo-18?force=1');
        expect(response.status).toBe(200);
        expect(await env.CATALOG.head(key('apollo-18-01.json'))).toBeNull();
        expect(await env.CATALOG.head(key('apollo-18-02.json'))).not.toBeNull();
    });

    it('should not take any force value other than 1', async () => {
        await seed();
        for (const query of ['?force=0', '?force=true', '?force=', '?forced=1']) {
            const response = await api('DELETE', `/api/albums/apollo-18${query}`);
            expect(response.status, query).toBe(409);
        }
    });

    it('should delete the album, its tracks and their lyrics with ?force=1', async () => {
        await seed();
        const response = await api('DELETE', '/api/albums/apollo-18?force=1');
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({
            deleted: { albumId: 'apollo-18', trackIds: ['apollo-18-01', 'apollo-18-02'] },
            catalog: expect.objectContaining({ ok: true }),
        });
        expect(await albumRow('apollo-18')).toBeNull();
        expect(await countOf('tracks')).toBe(1);
        expect(await countOf('lyrics')).toBe(0);
        expect(await albumRow('beaming')).not.toBeNull();
    });

    it('should guard an album without tracks too', async () => {
        await insertAlbum('empty', 1);
        const response = await api('DELETE', '/api/albums/empty');
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({
            error: { details: [{ type: 'album', id: 'empty' }] },
        });
    });

    it('should answer 404 NOT_FOUND for an unknown album, forced or not', async () => {
        for (const path of ['/api/albums/nope', '/api/albums/nope?force=1']) {
            const response = await api('DELETE', path);
            expect(response.status, path).toBe(404);
            expect(await response.json(), path).toMatchObject({ error: { code: 'NOT_FOUND' } });
        }
    });
});
