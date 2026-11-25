/*
 * API-021 PATCH /api/tracks/:id：只喺管理端用嘅參考欄（歌詞參考連結、備註）同手動指定音檔 / MV（D37）。
 * 歌名、副題、credit 經歌曲文字（API-041），歌號經排序（API-023），所以呢度唔收。
 * 手動指定嘅 key：唔可以有 `..`、唔可以 `/` 開頭，儲存前 MEDIA.head() 確認存在（Technical Spec「安全設計」）
 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, api, dbWithHook, json } from './albumFixtures';
import { detailsOf, ifMatch, seedAlbum, trackRow, type ErrorBody } from './trackFixtures';

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
        for (const url of ['http://a.example', 'javascript:alert(1)', 'https://', 'ftp://x', 42]) {
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

    it('should refuse the fields that go through the song text or the order', async () => {
        const response = await patch({ title: 'x', no: 9, credits: {}, enabled: true, id: 'y' });
        expect(await reasonsOf(response)).toEqual([
            'title:NOT_EDITABLE',
            'no:NOT_EDITABLE',
            'credits:NOT_EDITABLE',
            'enabled:NOT_EDITABLE',
            'id:NOT_EDITABLE',
        ]);
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
