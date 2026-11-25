/*
 * API-022 DELETE /api/tracks/:id（ID 守衛：冇 ?force=1 回 409 ID_REMOVED）。
 * CR-006（Functional Spec D60）：歌號跟檔名、可以跳號，刪歌唔重編其他歌；API-023（拖動排序）取消
 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, api, countOf, dbWithHook, json } from './albumFixtures';
import {
    lyricsFiles,
    lyricsRow,
    numbersOf,
    putText,
    seedAlbum,
    trackRow,
    type ErrorBody,
} from './trackFixtures';

beforeEach(seedAlbum);

describe('DELETE /api/tracks/:id', () => {
    it('should answer 409 ID_REMOVED naming the track, and keep it', async () => {
        const response = await api('DELETE', '/api/tracks/apollo-18-02');
        expect(response.status).toBe(409);
        expect(await json(response)).toEqual({
            error: {
                code: 'ID_REMOVED',
                message: zhHant.tracks.errors.idRemoved,
                details: [{ type: 'track', id: 'apollo-18-02' }],
            },
        });
        expect(await countOf('tracks')).toBe(3);
    });

    it('should not take any force value other than 1', async () => {
        for (const query of ['?force=0', '?force=true', '?force=']) {
            const response = await api('DELETE', `/api/tracks/apollo-18-02${query}`);
            expect(response.status, query).toBe(409);
        }
    });

    it('should delete with ?force=1 and leave the other numbers and tracks alone', async () => {
        const response = await api('DELETE', '/api/tracks/apollo-18-02?force=1');
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({
            deleted: { trackId: 'apollo-18-02', albumId: 'apollo-18' },
            catalog: expect.objectContaining({ ok: true }),
        });
        expect(await numbersOf('apollo-18')).toEqual(['1:apollo-18-01', '3:apollo-18-03']);
        expect((await trackRow('apollo-18-03'))?.updated_at).toBe(NOW);
    });

    it('should take the lyrics row and the unused lyrics JSON with it', async () => {
        await putText('apollo-18-02', '小涼伴\n\n[00:01.00]一');
        expect(await lyricsFiles()).toHaveLength(1);
        await api('DELETE', '/api/tracks/apollo-18-02?force=1');
        expect(await lyricsRow('apollo-18-02')).toBeNull();
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should keep a lyrics JSON that another track still uses', async () => {
        await putText('apollo-18-01', '甲\n\n同一段');
        await putText('apollo-18-02', '乙\n\n同一段');
        await api('DELETE', '/api/tracks/apollo-18-02?force=1');
        expect(await lyricsFiles()).toHaveLength(1);
    });

    it('should answer 404 for an unknown track, with or without force', async () => {
        for (const query of ['', '?force=1']) {
            const response = await api('DELETE', `/api/tracks/nope${query}`);
            expect(response.status, query).toBe(404);
            expect((await json<ErrorBody>(response)).error.message).toBe(
                zhHant.tracks.errors.notFound,
            );
        }
    });

    it('should answer 404 when another request deleted the track first', async () => {
        const DB = dbWithHook('SELECT t.album_id', () =>
            env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind('apollo-18-02').run(),
        );
        const response = await api(
            'DELETE',
            '/api/tracks/apollo-18-02?force=1',
            undefined,
            {},
            {
                ...env,
                DB,
            },
        );
        expect(response.status).toBe(404);
        expect(await numbersOf('apollo-18')).toEqual(['1:apollo-18-01', '3:apollo-18-03']);
    });
});

describe('PUT /api/albums/:id/tracks/order (API-023, removed)', () => {
    it('should answer 404 and keep the numbers', async () => {
        const ids = ['apollo-18-03', 'apollo-18-02', 'apollo-18-01'];
        const response = await api('PUT', '/api/albums/apollo-18/tracks/order', { ids });
        expect(response.status).toBe(404);
        expect(await numbersOf('apollo-18')).toEqual([
            '1:apollo-18-01',
            '2:apollo-18-02',
            '3:apollo-18-03',
        ]);
    });
});
