/*
 * API-022 DELETE /api/tracks/:id（ID 守衛：冇 ?force=1 回 409 ID_REMOVED）、
 * API-023 PUT /api/albums/:id/tracks/order（歌號 = 次序）。
 * 歌號一定由 1 連續編：刪歌之後收埋個窿；(album_id, no) UNIQUE 逐句檢查，重編分兩步（backlog B-019 ②）
 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, api, countOf, dbWithHook, insertAlbum, insertTrack, json } from './albumFixtures';
import {
    lyricsFiles,
    lyricsRow,
    numbersOf,
    putText,
    seedAlbum,
    trackRow,
    type ErrorBody,
} from './trackFixtures';

const order = (albumId: string, body: unknown, bindings = env) =>
    api('PUT', `/api/albums/${albumId}/tracks/order`, body, {}, bindings);

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

    it('should delete with ?force=1 and renumber the rest from 1 without a gap', async () => {
        const response = await api('DELETE', '/api/tracks/apollo-18-02?force=1');
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({
            deleted: { trackId: 'apollo-18-02', albumId: 'apollo-18' },
        });
        expect(await numbersOf('apollo-18')).toEqual(['1:apollo-18-01', '2:apollo-18-03']);
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
        // 刪除嘅 batch 照樣重編：無論邊個請求刪，歌號都係由 1 連續
        expect(await numbersOf('apollo-18')).toEqual(['1:apollo-18-01', '2:apollo-18-03']);
    });
});

describe('PUT /api/albums/:id/tracks/order', () => {
    it('should number the tracks 1..n in the given order and answer with it', async () => {
        const ids = ['apollo-18-03', 'apollo-18-01', 'apollo-18-02'];
        const response = await order('apollo-18', { ids });
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({ ids });
        expect(await numbersOf('apollo-18')).toEqual([
            '1:apollo-18-03',
            '2:apollo-18-01',
            '3:apollo-18-02',
        ]);
    });

    it('should swap neighbours despite the per-statement UNIQUE (album_id, no) check', async () => {
        const ids = ['apollo-18-02', 'apollo-18-01', 'apollo-18-03'];
        expect((await order('apollo-18', { ids })).status).toBe(200);
        expect(await numbersOf('apollo-18')).toEqual([
            '1:apollo-18-02',
            '2:apollo-18-01',
            '3:apollo-18-03',
        ]);
    });

    it('should not touch updatedAt, so open edit forms stay valid', async () => {
        await order('apollo-18', { ids: ['apollo-18-03', 'apollo-18-02', 'apollo-18-01'] });
        expect((await trackRow('apollo-18-01'))?.updated_at).toBe(NOW);
    });

    it('should answer 409 CONFLICT when the ids are not exactly the album tracks', async () => {
        await insertAlbum('beaming', 2);
        await insertTrack('beaming-01', 'beaming', 1);
        for (const ids of [
            ['apollo-18-01', 'apollo-18-02'],
            ['apollo-18-01', 'apollo-18-02', 'apollo-18-03', 'x'],
            ['apollo-18-01', 'apollo-18-02', 'beaming-01'],
        ]) {
            const response = await order('apollo-18', { ids });
            expect(response.status, ids.join()).toBe(409);
            expect((await json<ErrorBody>(response)).error).toMatchObject({
                code: 'CONFLICT',
                message: zhHant.tracks.errors.orderChanged,
            });
        }
        expect(await numbersOf('beaming')).toEqual(['1:beaming-01']);
    });

    it('should answer 400 INVALID_LIST for a body that is not a list of distinct ids', async () => {
        for (const body of [
            {},
            { ids: 'a' },
            { ids: [1] },
            { ids: ['apollo-18-01', 'apollo-18-01'] },
        ]) {
            const response = await order('apollo-18', body);
            expect(response.status, JSON.stringify(body)).toBe(400);
            expect((await json<ErrorBody>(response)).error.details).toMatchObject([
                { path: 'ids', reason: 'INVALID_LIST' },
            ]);
        }
    });

    it('should answer 404 for an unknown album and 200 for an album without tracks', async () => {
        expect((await order('nope', { ids: [] })).status).toBe(404);
        await insertAlbum('empty', 3);
        expect((await order('empty', { ids: [] })).status).toBe(200);
    });

    // 檢查之後、寫入之前另一個請求刪咗一首歌：寫入嘅 batch 仍然由 1 連續編，冇窿、冇撞號
    it('should keep the numbers contiguous when a track is deleted between check and write', async () => {
        const DB = dbWithHook('SELECT id FROM tracks', () =>
            env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind('apollo-18-02').run(),
        );
        const ids = ['apollo-18-03', 'apollo-18-02', 'apollo-18-01'];
        expect((await order('apollo-18', { ids }, { ...env, DB })).status).toBe(200);
        expect(await numbersOf('apollo-18')).toEqual(['1:apollo-18-03', '2:apollo-18-01']);
    });

    // 同上，另一個請求加咗一首歌：新歌排喺最尾
    it('should put a track added between check and write at the end', async () => {
        const DB = dbWithHook('SELECT id FROM tracks', () =>
            insertTrack('apollo-18-04', 'apollo-18', 4),
        );
        const ids = ['apollo-18-03', 'apollo-18-02', 'apollo-18-01'];
        expect((await order('apollo-18', { ids }, { ...env, DB })).status).toBe(200);
        expect(await numbersOf('apollo-18')).toEqual([
            '1:apollo-18-03',
            '2:apollo-18-02',
            '3:apollo-18-01',
            '4:apollo-18-04',
        ]);
    });
});
