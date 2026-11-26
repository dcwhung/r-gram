/*
 * API-020 POST /api/albums/:id/tracks：body `{ no?, text }`（text 同 API-041 一樣）。
 * CR-006（Functional Spec D60、D61）：歌號可以跳號，冇畀 = 最大歌號 + 1；撞號 409 CONFLICT（NUMBER_TAKEN）。
 * id = `<albumId>-<兩位歌號>`，已經有人用先用 `<albumId>-<6 位隨機>`；歌詞 JSON 寫 R2，tracks + lyrics 一個 batch
 */
import { env } from 'cloudflare:test';
import { vi } from 'vitest';
import { zhHant } from '../src/i18n/zh-Hant';
import { api, countOf, dbWithHook, insertAlbum, insertTrack, json } from './albumFixtures';
import {
    LYRICS_NAME,
    createTrack,
    detailsOf,
    getText,
    lyricsFiles,
    lyricsRow,
    numbersOf,
    seedAlbum,
    trackRow,
    type ErrorBody,
} from './trackFixtures';

interface Created {
    trackId: string;
    text: string;
    lineCount: number;
    synced: boolean | null;
    lyrics: string | null;
    updatedAt: string;
    track: Record<string, unknown>;
    hints: unknown[];
}

const TRACK_ID_SUFFIX_CHARS = 6;
const RANDOM_TRACK_ID = /^apollo-18-[a-z0-9]{6}$/;

describe('POST /api/albums/:id/tracks', () => {
    beforeEach(seedAlbum);

    it('should create the track at the end with every field from the text', async () => {
        const text = '新歌\n曲：阿正\n\n[00:01.00]一';
        const response = await createTrack('apollo-18', { text });
        expect(response.status).toBe(201);
        const body = await json<Created>(response);
        expect(body.trackId).toBe('apollo-18-04');
        expect(body).toMatchObject({ text, lineCount: 1, synced: true, hints: [] });
        expect(body.lyrics).toMatch(LYRICS_NAME);
        expect(body.track).toMatchObject({
            id: body.trackId,
            no: 4,
            title: '新歌',
            subtitle: null,
            credits: { composer: '阿正', lyricist: null, arranger: null, producer: null },
            audio: null,
            mv: null,
            audioManual: false,
            lyrics: { synced: true, lineCount: 1 },
            updatedAt: body.updatedAt,
        });
        expect(await trackRow(body.trackId)).toMatchObject({
            album_id: 'apollo-18',
            no: 4,
            created_at: body.updatedAt,
        });
        expect((await lyricsRow(body.trackId))?.json_name).toBe(body.lyrics);
        expect(await lyricsFiles()).toEqual([body.lyrics]);
        expect((await getText(body.trackId)).text).toBe(text);
    });

    it('should create a track without lyrics and write nothing to R2', async () => {
        const body = await json<Created>(await createTrack('apollo-18', { text: '只有歌名' }));
        expect(body).toMatchObject({ lineCount: 0, synced: null, lyrics: null });
        expect(body.track).toMatchObject({
            title: '只有歌名',
            credits: { composer: null, lyricist: null, arranger: null, producer: null },
            lyrics: null,
        });
        expect(await lyricsRow(body.trackId)).toBeNull();
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should number tracks 1.. in an empty album with ids that follow the numbers', async () => {
        await insertAlbum('beaming', 2);
        for (const title of ['一', '二', '三']) await createTrack('beaming', { text: title });
        expect(await numbersOf('beaming')).toEqual([
            '1:beaming-01',
            '2:beaming-02',
            '3:beaming-03',
        ]);
    });

    it('should take the given number, gaps allowed, and name the track after it', async () => {
        const response = await createTrack('apollo-18', { no: 7, text: '我永遠記得' });
        expect(response.status).toBe(201);
        const body = await json<Created>(response);
        expect(body.trackId).toBe('apollo-18-07');
        expect(body.track).toMatchObject({ id: 'apollo-18-07', no: 7, title: '我永遠記得' });
        const next = await json<Created>(await createTrack('apollo-18', { text: '下一首' }));
        expect(next.track).toMatchObject({ id: 'apollo-18-08', no: 8 });
    });

    it('should fill a gap below the highest number', async () => {
        await createTrack('apollo-18', { no: 9, text: '九' });
        const body = await json<Created>(await createTrack('apollo-18', { no: 5, text: '五' }));
        expect(body.trackId).toBe('apollo-18-05');
        expect(await numbersOf('apollo-18')).toEqual([
            '1:apollo-18-01',
            '2:apollo-18-02',
            '3:apollo-18-03',
            '5:apollo-18-05',
            '9:apollo-18-09',
        ]);
    });

    it('should answer 409 CONFLICT NUMBER_TAKEN for a number the album already has', async () => {
        const response = await createTrack('apollo-18', { no: 2, text: '撞號\n\n[00:01.00]一' });
        expect(response.status).toBe(409);
        expect((await json<ErrorBody>(response)).error).toEqual({
            code: 'CONFLICT',
            message: zhHant.tracks.errors.numberTaken,
            details: [
                { path: 'no', reason: 'NUMBER_TAKEN', message: zhHant.tracks.reasons.NUMBER_TAKEN },
            ],
        });
        expect(await countOf('tracks')).toBe(3);
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should allow the same number in another album', async () => {
        await insertAlbum('beaming', 2);
        const body = await json<Created>(await createTrack('beaming', { no: 2, text: '二' }));
        expect(body.track).toMatchObject({ id: 'beaming-02', no: 2 });
    });

    it('should answer 400 INVALID_NUMBER for a number out of 1..999 or not an integer', async () => {
        for (const no of [0, -1, 1000, 1.5, '4', null, true]) {
            const response = await createTrack('apollo-18', { no, text: '歌' });
            expect(response.status, JSON.stringify(no)).toBe(400);
            expect(await detailsOf(response), JSON.stringify(no)).toMatchObject([
                { path: 'no', reason: 'INVALID_NUMBER' },
            ]);
        }
        expect(await countOf('tracks')).toBe(3);
    });

    it('should list a bad number and a bad text together', async () => {
        const response = await createTrack('apollo-18', { no: 0, text: '[00:01.00]只有歌詞' });
        expect(await detailsOf(response)).toMatchObject([
            { path: 'no', reason: 'INVALID_NUMBER' },
            { path: 'text', line: 1, reason: 'TITLE_REQUIRED' },
        ]);
    });

    it('should answer 400 NUMBER_EXHAUSTED when the next number would pass 999', async () => {
        await createTrack('apollo-18', { no: 999, text: '最尾' });
        const response = await createTrack('apollo-18', { text: '再加' });
        expect(response.status).toBe(400);
        expect(await detailsOf(response)).toMatchObject([
            { path: 'no', reason: 'NUMBER_EXHAUSTED' },
        ]);
        expect(await countOf('tracks')).toBe(4);
    });

    // D61：id 建立後不變。舊歌改咗歌號之後，`<albumId>-<NN>` 可能已經有人用：先用隨機 id
    it('should fall back to a random id when the numbered id is taken', async () => {
        await env.DB.prepare('UPDATE tracks SET "no" = 9 WHERE id = ?').bind('apollo-18-02').run();
        const body = await json<Created>(await createTrack('apollo-18', { no: 2, text: '新二' }));
        expect(body.trackId).toMatch(RANDOM_TRACK_ID);
        expect(body.track).toMatchObject({ no: 2, title: '新二' });
        expect(await trackRow('apollo-18-02')).toMatchObject({ no: 9 });
    });

    it('should give two creates at the same time different numbers', async () => {
        const responses = await Promise.all([
            createTrack('apollo-18', { text: '甲' }),
            createTrack('apollo-18', { text: '乙' }),
        ]);
        expect(responses.map((r) => r.status)).toEqual([201, 201]);
        const numbers = await numbersOf('apollo-18');
        expect(numbers.map((entry) => entry.split(':')[0])).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should try another random id when the random one is taken too', async () => {
        await insertTrack('apollo-18-aaaaaa', 'apollo-18', 8);
        await env.DB.prepare('UPDATE tracks SET "no" = 9 WHERE id = ?').bind('apollo-18-02').run();
        const values = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
        const original = crypto.getRandomValues.bind(crypto);
        const random = vi.spyOn(crypto, 'getRandomValues');
        // 只換 6 byte 嗰次（歌 id 後綴）；session token 等照用真嘅隨機數
        const fake = (bytes: Uint8Array) => {
            if (bytes.length !== TRACK_ID_SUFFIX_CHARS) return original(bytes);
            bytes.forEach((_, index) => (bytes[index] = values.shift() ?? 2));
            return bytes;
        };
        random.mockImplementation(fake as typeof crypto.getRandomValues);
        const body = await json<Created>(await createTrack('apollo-18', { no: 2, text: '甲' }));
        random.mockRestore();
        expect(body.trackId).toBe('apollo-18-bbbbbb');
        expect(await countOf('tracks')).toBe(5);
    });

    it('should answer 400 with line details and create nothing for bad text', async () => {
        const response = await createTrack('apollo-18', { text: '[00:01.00]只有歌詞' });
        expect(response.status).toBe(400);
        expect(await detailsOf(response)).toMatchObject([
            { path: 'text', line: 1, reason: 'TITLE_REQUIRED' },
        ]);
        expect(await countOf('tracks')).toBe(3);
    });

    it('should answer 400 for a missing text or a body that is not an object', async () => {
        expect(await detailsOf(await createTrack('apollo-18', {}))).toMatchObject([
            { path: 'text', reason: 'REQUIRED' },
        ]);
        const unknown = await createTrack('apollo-18', { text: '歌', id: 'x' });
        expect(await detailsOf(unknown)).toMatchObject([{ path: 'id', reason: 'NOT_EDITABLE' }]);
        expect(await detailsOf(await createTrack('apollo-18', '[]'))).toMatchObject([
            { path: '$', reason: 'NOT_AN_OBJECT' },
        ]);
    });

    it('should hint at label-looking lines after a blank line (B-038)', async () => {
        const body = await json<Created>(
            await createTrack('apollo-18', { text: '歌\n\n詞：林夕' }),
        );
        expect(body.hints).toMatchObject([{ line: 3, reason: 'LABEL_AFTER_BLANK_LINE' }]);
    });

    it('should answer 404 for an unknown album and leave R2 untouched', async () => {
        const response = await createTrack('nope', { text: '歌\n\n[00:01.00]一' });
        expect(response.status).toBe(404);
        expect((await json<ErrorBody>(response)).error).toEqual({
            code: 'NOT_FOUND',
            message: zhHant.tracks.errors.albumNotFound,
        });
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should answer 404 and remove its lyrics file when the album is deleted meanwhile', async () => {
        const DB = dbWithHook('SELECT id, title, wheel_key', () =>
            env.DB.prepare('DELETE FROM albums WHERE id = ?').bind('apollo-18').run(),
        );
        const response = await api(
            'POST',
            '/api/albums/apollo-18/tracks',
            { text: '歌\n\n[00:01.00]一' },
            {},
            { ...env, DB },
        );
        expect(response.status).toBe(404);
        expect(await countOf('tracks')).toBe(0);
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should answer 413 for an oversized text and create nothing', async () => {
        const response = await createTrack('apollo-18', { text: 'a'.repeat(70_000) });
        expect(response.status).toBe(413);
        expect(await countOf('tracks')).toBe(3);
    });

    it('should stay behind the session and same-origin guards', async () => {
        const response = await api(
            'POST',
            '/api/albums/apollo-18/tracks',
            { text: '歌' },
            {
                origin: 'https://evil.example',
            },
        );
        expect(response.status).toBe(403);
        expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM tracks').first('n')).toBe(3);
    });
});
