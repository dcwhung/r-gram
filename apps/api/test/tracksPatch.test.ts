/*
 * API-021 PATCH /api/tracks/:id：只喺管理端用嘅參考欄（歌詞參考連結、備註）同手動指定音檔 / MV（D37）。
 * 歌名、副題、credit 經歌曲文字（API-041），所以呢度唔收。CR-006（D60）：歌號（`no`）喺呢度改，id 唔跟住變。
 * 手動指定嘅 key：唔可以有 `..`、唔可以 `/` 開頭，儲存前 MEDIA.head() 確認存在（Technical Spec「安全設計」）
 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, api, dbWithHook, json } from './albumFixtures';
import {
    detailsOf,
    ifMatch,
    numbersOf,
    seedAlbum,
    trackRow,
    type ErrorBody,
} from './trackFixtures';

const AUDIO_KEY = 'apollo-18/01 一早地下鐵.m4a';
const MV_KEY = 'beaming/05 Hero.mp4';

const patch = (
    body: unknown,
    updatedAt: string | null = NOW,
    id = 'apollo-18-01',
    bindings = env,
) =>
    api('PATCH', `/api/tracks/${id}`, body, updatedAt === null ? {} : ifMatch(updatedAt), bindings);

const reasonsOf = async (response: Response) =>
    (await detailsOf(response)).map((d) => `${String(d.path)}:${String(d.reason)}`);

beforeEach(async () => {
    await seedAlbum();
    await env.MEDIA.put(AUDIO_KEY, 'audio');
    await env.MEDIA.put(MV_KEY, 'video');
});

describe('PATCH /api/tracks/:id', () => {
    it('should set the reference fields and answer with the track and a newer updatedAt', async () => {
        const response = await patch({
            lyricsSourceUrl: 'https://example.com/lyrics/1',
            note: '  官方歌詞本有錯字  ',
        });
        expect(response.status).toBe(200);
        const body = await json(response);
        expect(body).toMatchObject({
            id: 'apollo-18-01',
            title: '一早地下鐵',
            lyricsSourceUrl: 'https://example.com/lyrics/1',
            note: '官方歌詞本有錯字',
        });
        expect((body.updatedAt as string) > NOW).toBe(true);
        expect((await trackRow('apollo-18-01'))?.updated_at).toBe(body.updatedAt);
    });

    it('should assign media files by hand and mark them manual, also from another folder', async () => {
        const body = await json(await patch({ audio: AUDIO_KEY, mv: MV_KEY }));
        expect(body).toMatchObject({
            audio: AUDIO_KEY,
            audioManual: true,
            mv: MV_KEY,
            mvManual: true,
        });
        expect(await trackRow('apollo-18-01')).toMatchObject({ audio_manual: 1, mv_manual: 1 });
    });

    it('should clear a manual file with null, so a scan may fill it again', async () => {
        const first = await json(await patch({ audio: AUDIO_KEY }));
        const cleared = await json(await patch({ audio: null }, first.updatedAt as string));
        expect(cleared).toMatchObject({ audio: null, audioManual: false });
        expect(await trackRow('apollo-18-01')).toMatchObject({ audio_key: null, audio_manual: 0 });
    });

    it('should clear the link with null or an empty string, and the note with null', async () => {
        const first = await json(
            await patch({ lyricsSourceUrl: 'https://a.example/x', note: 'n' }),
        );
        const cleared = await json(
            await patch({ lyricsSourceUrl: '', note: null }, first.updatedAt as string),
        );
        expect(cleared).toMatchObject({ lyricsSourceUrl: null, note: null });
    });

    it('should leave fields that are not in the body alone', async () => {
        const first = await json(await patch({ note: '一' }));
        const second = await json(await patch({ audio: AUDIO_KEY }, first.updatedAt as string));
        expect(second).toMatchObject({ note: '一', audio: AUDIO_KEY });
    });

    it('should refuse a link that is not https', async () => {
        // S-067：有 userinfo 嘅網址（`https://google.com@evil.example/`）睇落似第二個網站，唔收
        const withUserinfo = ['https://google.com@evil.example/', 'https://user:pw@a.example/x'];
        const notHttps = ['http://a.example', 'javascript:alert(1)', 'https://', 'ftp://x', 42];
        for (const url of [...notHttps, ...withUserinfo]) {
            expect(await reasonsOf(await patch({ lyricsSourceUrl: url })), String(url)).toEqual([
                'lyricsSourceUrl:INVALID_URL',
            ]);
        }
    });

    it('should refuse unsafe media keys before looking them up', async () => {
        const unsafe = ['', '/apollo-18/a.m4a', 'apollo-18/../x.m4a', '..', 'a\u0000b', 'a‮b', 7];
        for (const key of unsafe) {
            expect(await reasonsOf(await patch({ audio: key })), JSON.stringify(key)).toEqual([
                'audio:INVALID_MEDIA_KEY',
            ]);
        }
        expect(await reasonsOf(await patch({ mv: `${'k'.repeat(1025)}.mp4` }))).toEqual([
            'mv:INVALID_MEDIA_KEY',
        ]);
    });

    it('should refuse a key that is not in the media bucket', async () => {
        const response = await patch({ audio: 'apollo-18/99 missing.m4a', mv: MV_KEY });
        expect(response.status).toBe(400);
        expect(await reasonsOf(response)).toEqual(['audio:MEDIA_NOT_FOUND']);
        expect((await trackRow('apollo-18-01'))?.mv_key).toBeNull();
    });

    it('should refuse the fields that go through the song text, and the id', async () => {
        const response = await patch({ title: 'x', credits: {}, enabled: true, id: 'y' });
        expect(await reasonsOf(response)).toEqual([
            'title:NOT_EDITABLE',
            'credits:NOT_EDITABLE',
            'enabled:NOT_EDITABLE',
            'id:NOT_EDITABLE',
        ]);
    });

    it('should change the number, gaps allowed, and keep the id', async () => {
        const response = await patch({ no: 12 });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({ id: 'apollo-18-01', no: 12 });
        expect(await numbersOf('apollo-18')).toEqual([
            '2:apollo-18-02',
            '3:apollo-18-03',
            '12:apollo-18-01',
        ]);
    });

    it('should answer 409 CONFLICT NUMBER_TAKEN for a number another track has', async () => {
        const response = await patch({ no: 2, note: '改咗' });
        expect(response.status).toBe(409);
        expect((await json<ErrorBody>(response)).error).toEqual({
            code: 'CONFLICT',
            message: zhHant.tracks.errors.numberTaken,
            details: [
                { path: 'no', reason: 'NUMBER_TAKEN', message: zhHant.tracks.reasons.NUMBER_TAKEN },
            ],
        });
        expect(await trackRow('apollo-18-01')).toMatchObject({
            no: 1,
            note: null,
            updated_at: NOW,
        });
    });

    it('should accept the number the track already has', async () => {
        expect(await json(await patch({ no: 1 }))).toMatchObject({ id: 'apollo-18-01', no: 1 });
    });

    it('should refuse a number out of 1..999 or not an integer', async () => {
        for (const no of [0, -3, 1000, 2.5, '4', null]) {
            expect(await reasonsOf(await patch({ no })), JSON.stringify(no)).toEqual([
                'no:INVALID_NUMBER',
            ]);
        }
    });

    it('should answer 409 STALE, not NUMBER_TAKEN, for an old If-Match', async () => {
        await patch({ note: 'x' });
        const response = await patch({ no: 2 });
        expect((await json<ErrorBody>(response)).error.code).toBe('STALE');
    });

    it('should refuse a note with line breaks or one that is too long', async () => {
        expect(await reasonsOf(await patch({ note: 'a\nb' }))).toEqual(['note:INVALID_TEXT']);
        expect(await reasonsOf(await patch({ note: '字'.repeat(1001) }))).toEqual([
            'note:TOO_LONG',
        ]);
    });

    it('should answer messages from the locale file', async () => {
        const details = await detailsOf(await patch({ lyricsSourceUrl: 'http://x' }));
        expect(details[0]?.message).toBe(zhHant.tracks.reasons.INVALID_URL);
    });

    it('should require If-Match and answer 409 STALE for an old one', async () => {
        expect(await reasonsOf(await patch({ note: 'x' }, null))).toEqual(['If-Match:REQUIRED']);
        await patch({ note: 'x' });
        const response = await patch({ note: 'y' });
        expect(response.status).toBe(409);
        expect((await json<ErrorBody>(response)).error).toMatchObject({
            code: 'STALE',
            message: zhHant.tracks.errors.stale,
        });
    });

    it('should answer 404 for an unknown track and 400 for a body that is not an object', async () => {
        expect((await patch({ note: 'x' }, NOW, 'nope')).status).toBe(404);
        expect(await reasonsOf(await patch('[]'))).toEqual(['$:NOT_AN_OBJECT']);
    });

    it('should answer 200 with the written track even if it is deleted right after', async () => {
        const DB = dbWithHook('UPDATE tracks', () =>
            env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind('apollo-18-01').run(),
        );
        const response = await patch({ note: '最後' }, NOW, 'apollo-18-01', { ...env, DB });
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({ id: 'apollo-18-01', note: '最後' });
    });
});
