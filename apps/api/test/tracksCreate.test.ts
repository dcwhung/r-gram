/*
 * API-020 POST /api/albums/:id/tracks：body 同 API-041 一樣係 `{ text }`；加喺最尾（歌號 = 次序），
 * id = `<albumId>-<6 位隨機>`；歌詞 JSON 寫 R2，tracks + lyrics 一個 batch
 */
import { env } from 'cloudflare:test';
import { vi } from 'vitest';
import { zhHant } from '../src/i18n/zh-Hant';
import { api, countOf, insertAlbum, json } from './albumFixtures';
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
const NEW_TRACK_ID = /^apollo-18-[a-z0-9]{6}$/;

describe('POST /api/albums/:id/tracks', () => {
    beforeEach(seedAlbum);

    it('should create the track at the end with every field from the text', async () => {
        const text = '新歌\n副題：Demo\n曲：阿正\n\n[00:01.00]一';
        const response = await createTrack('apollo-18', { text });
        expect(response.status).toBe(201);
        const body = await json<Created>(response);
        expect(body.trackId).toMatch(NEW_TRACK_ID);
        expect(body).toMatchObject({ text, lineCount: 1, synced: true, hints: [] });
        expect(body.lyrics).toMatch(LYRICS_NAME);
        expect(body.track).toMatchObject({
            id: body.trackId,
            no: 4,
            title: '新歌',
            subtitle: 'Demo',
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
        expect(body.track).toMatchObject({ title: '只有歌名', credits: null, lyrics: null });
        expect(await lyricsRow(body.trackId)).toBeNull();
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should number tracks 1.. in an empty album and give each a different id', async () => {
        await insertAlbum('beaming', 2);
        const ids = [];
        for (const title of ['一', '二', '三']) {
            ids.push((await json<Created>(await createTrack('beaming', { text: title }))).trackId);
        }
        expect(new Set(ids).size).toBe(3);
        expect(await numbersOf('beaming')).toEqual(ids.map((id, index) => `${index + 1}:${id}`));
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

    it('should try another id when the random one is taken', async () => {
        const values = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
        const original = crypto.getRandomValues.bind(crypto);
        const random = vi.spyOn(crypto, 'getRandomValues');
        // 只換 6 byte 嗰次（歌 id 後綴）；session token 等照用真嘅隨機數
        random.mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
            const bytes = array as unknown as Uint8Array;
            if (bytes.length !== TRACK_ID_SUFFIX_CHARS) return original(array);
            bytes.forEach((_, index) => (bytes[index] = values.shift() ?? 2));
            return array;
        });
        const first = await json<Created>(await createTrack('apollo-18', { text: '甲' }));
        values.unshift(0, 0, 0, 0, 0, 0);
        const second = await json<Created>(await createTrack('apollo-18', { text: '乙' }));
        random.mockRestore();
        expect(first.trackId).toBe('apollo-18-aaaaaa');
        expect(second.trackId).toBe('apollo-18-bbbbbb');
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
