/*
 * API-035 POST /api/sync/removals（T-105；Functional Spec D73、D76）：管理員確認咗嘅移除。
 * 逐項再對一次媒體 bucket（檔仲喺度 = STILL_PRESENT，唔刪）同 D1（連結唔同 = STALE）；一項失敗唔影響其他；
 * 有刪到嘢先生成 catalog；永遠唔刪媒體 bucket 嘅檔
 */
import { NEUTRAL_ACCENT } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { SYNC_REMOVALS_MAX } from '../src/config';
import { clearTrackFile } from '../src/sync/removalStore';
import { albumRow, api, countOf, insertAsset } from './albumFixtures';
import { liveDocument, stateRow } from './catalogFixtures';
import {
    ALBUM_ID,
    FOLDER,
    KOMOREBI_INFO,
    confirmRemovals,
    deleteMedia,
    mediaKey,
    mediaWith,
    putKomorebi,
    putMedia,
    syncFolder,
    syncOverview,
    tracksOf,
    type Loose,
} from './syncFixtures';
import { lyricsRow } from './trackFixtures';

const AUDIO_05 = mediaKey('05 太平門.m4a');

beforeEach(async () => {
    await putKomorebi();
    await syncFolder();
});

describe('POST /api/sync/removals: request shape', () => {
    it.each([
        [[], '$', 'NOT_AN_OBJECT'],
        [{ items: {} }, 'items', 'NOT_A_LIST'],
        [{}, 'items', 'REQUIRED'],
        [{ items: [], extra: 1 }, 'extra', 'NOT_EDITABLE'],
        [{ items: [{ kind: 'song', albumId: 'a' }] }, 'items[0].kind', 'INVALID_VALUE'],
        [{ items: [{ kind: 'audio', albumId: 'a', trackId: 't' }] }, 'items[0].key', 'REQUIRED'],
        [
            { items: [{ kind: 'cover', albumId: 'a', slot: 'cover3' }] },
            'items[0].slot',
            'INVALID_VALUE',
        ],
        [{ items: [{ kind: 'album', albumId: 'a', key: 'x' }] }, 'items[0].key', 'NOT_EDITABLE'],
        [{ items: ['x'] }, 'items[0]', 'NOT_AN_OBJECT'],
    ])('should refuse %j at %s with %s', async (body, path, reason) => {
        const response = await api('POST', '/api/sync/removals', body);
        expect(response.status).toBe(400);
        const { error } = (await response.json()) as Loose;
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toContainEqual({ path, reason, message: expect.any(String) });
    });

    it('should refuse more items than one request may confirm', async () => {
        const items = Array.from({ length: SYNC_REMOVALS_MAX + 1 }, () => ({
            kind: 'album',
            albumId: 'x',
        }));
        const { status, body } = await confirmRemovals(items);
        expect(status).toBe(400);
        expect(body.error.details[0]).toMatchObject({ path: 'items', reason: 'TOO_MANY_ITEMS' });
    });
});

describe('POST /api/sync/removals: track files', () => {
    it('should clear the audio with its MV, song text and lyrics once confirmed', async () => {
        await deleteMedia('05 太平門.m4a');
        const { body: synced } = await syncFolder();
        expect(synced.pendingRemovals).toEqual([
            expect.objectContaining({ kind: 'audio', trackId: 'komorebi-05', key: AUDIO_05 }),
        ]);
        const { status, body } = await confirmRemovals(synced.pendingRemovals);
        expect(status).toBe(200);
        expect(body.results).toEqual([
            { kind: 'audio', albumId: ALBUM_ID, trackId: 'komorebi-05', ok: true },
        ]);
        expect(body.catalog).toMatchObject({ ok: true });
        expect((await tracksOf())[4]).toMatchObject({
            audio_key: null,
            mv_key: null,
            text_key: null,
            composer: null,
            text_source_etag: null,
        });
        expect(await lyricsRow('komorebi-05')).toBeNull();
        const [album] = (await liveDocument())?.albums ?? [];
        expect(album?.tracks[4]).toMatchObject({ audio: null, mv: null, lyrics: null });
    });

    it('should not clear a file that is back in the folder', async () => {
        const item = { kind: 'audio', albumId: ALBUM_ID, trackId: 'komorebi-05', key: AUDIO_05 };
        const { body } = await confirmRemovals([item]);
        expect(body.results).toEqual([
            {
                kind: 'audio',
                albumId: ALBUM_ID,
                trackId: 'komorebi-05',
                ok: false,
                code: 'STILL_PRESENT',
                message: expect.any(String),
            },
        ]);
        expect((await tracksOf())[4]?.audio_key).toBe(AUDIO_05);
        expect(body).not.toHaveProperty('catalog');
    });

    it('should not clear a link that changed since the scan', async () => {
        await deleteMedia('05 太平門.m4a');
        const item = {
            kind: 'audio',
            albumId: ALBUM_ID,
            trackId: 'komorebi-05',
            key: mediaKey('05 舊.m4a'),
        };
        const { body } = await confirmRemovals([item]);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STALE' });
    });

    it('should clear MV and song text separately', async () => {
        await deleteMedia('05 太平門.mp4');
        await deleteMedia('05 太平門.txt');
        const { body: synced } = await syncFolder();
        expect(synced.pendingRemovals.map(({ kind }: Loose) => kind)).toEqual(['mv', 'text']);
        const { body } = await confirmRemovals(synced.pendingRemovals);
        expect(body.results.map(({ ok }: Loose) => ok)).toEqual([true, true]);
        expect((await tracksOf())[4]).toMatchObject({
            audio_key: AUDIO_05,
            mv_key: null,
            text_key: null,
            composer: null,
        });
        expect(await lyricsRow('komorebi-05')).toBeNull();
    });

    it('should list and clear audio whose linked file is gone among two others (S-165)', async () => {
        await deleteMedia('05 太平門.m4a');
        await putMedia('05 太平門 (a).m4a');
        await putMedia('05 太平門 (b).mp3');
        const { body: synced } = await syncFolder();
        expect(synced.pendingRemovals).toEqual([
            expect.objectContaining({ kind: 'audio', trackId: 'komorebi-05', key: AUDIO_05 }),
        ]);
        expect((await tracksOf())[4]).toMatchObject({
            audio_key: AUDIO_05,
            mv_key: mediaKey('05 太平門.mp4'),
        });
        const { body } = await confirmRemovals(synced.pendingRemovals);
        expect(body.results[0]).toMatchObject({ ok: true });
        expect((await tracksOf())[4]).toMatchObject({ audio_key: null, mv_key: null });
        expect((await syncFolder()).body.pendingRemovals).toEqual([]);
    });

    it('should keep a link whose file is back, or whose number has one file again', async () => {
        await putMedia('05 太平門 (b).mp3');
        const item = { kind: 'audio', albumId: ALBUM_ID, trackId: 'komorebi-05', key: AUDIO_05 };
        expect((await confirmRemovals([item])).body.results[0]).toMatchObject({
            code: 'STILL_PRESENT',
        });
        await deleteMedia('05 太平門.m4a');
        await deleteMedia('05 太平門 (b).mp3');
        await putMedia('05 太平門 (c).m4a');
        expect((await confirmRemovals([item])).body.results[0]).toMatchObject({
            code: 'STILL_PRESENT',
        });
    });

    it('should answer NOT_FOUND for a track that is not there', async () => {
        const item = { kind: 'mv', albumId: ALBUM_ID, trackId: 'komorebi-99', key: 'x' };
        expect((await confirmRemovals([item])).body.results[0]).toMatchObject({
            ok: false,
            code: 'NOT_FOUND',
        });
    });
});

describe('POST /api/sync/removals: forged and raced items', () => {
    it('should answer NOT_FOUND for a track of another album', async () => {
        await putMedia('01 a.m4a', 'a', 'album-02-other');
        await putMedia('01 a.mp4', 'v', 'album-02-other');
        await syncFolder('album-02-other');
        await deleteMedia('01 a.mp4', 'album-02-other');
        const item = {
            kind: 'mv',
            albumId: ALBUM_ID,
            trackId: 'other-01',
            key: mediaKey('01 a.mp4', 'album-02-other'),
        };
        const { body } = await confirmRemovals([item]);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'NOT_FOUND' });
        expect((await tracksOf('other'))[0]?.mv_key).toBe(item.key);
    });

    it('should keep the lyrics when the link changed just before the clear', async () => {
        const track = { id: 'komorebi-05', updated_at: 'x' };
        expect(await clearTrackFile(env.DB, track, 'text', mediaKey('05 舊.txt'))).toBe(false);
        expect(await lyricsRow('komorebi-05')).not.toBeNull();
        expect((await tracksOf())[4]?.composer).toBe('RubberBand');
    });
});

describe('POST /api/sync/removals: tracks, covers, albums', () => {
    it('should delete a track that info.txt no longer lists, and only then', async () => {
        await putMedia('info.txt', KOMOREBI_INFO.replace('5. 太平門', ''));
        const { body: synced } = await syncFolder();
        expect(await countOf('tracks')).toBe(5);
        const removal = synced.pendingRemovals.find(({ kind }: Loose) => kind === 'track');
        const { body } = await confirmRemovals([removal]);
        expect(body.results[0]).toMatchObject({ ok: true, trackId: 'komorebi-05' });
        expect(await countOf('tracks')).toBe(4);
        expect(await countOf('lyrics')).toBe(0);
        expect((await syncFolder()).body.pendingRemovals).toEqual([]);
    });

    it('should not delete a track while a used info.txt cannot be read', async () => {
        await putMedia('info.txt', new Uint8Array([0xff, 0xfe, 0x41]));
        const item = { kind: 'track', albumId: ALBUM_ID, trackId: 'komorebi-04' };
        expect((await confirmRemovals([item])).body.results[0]).toMatchObject({
            ok: false,
            code: 'STALE',
        });
        expect(await countOf('tracks')).toBe(5);
    });

    it('should keep a track that info.txt lists again', async () => {
        const item = { kind: 'track', albumId: ALBUM_ID, trackId: 'komorebi-04' };
        expect((await confirmRemovals([item])).body.results[0]).toMatchObject({
            code: 'STILL_PRESENT',
        });
        expect(await countOf('tracks')).toBe(5);
    });

    it('should clear both covers and reset the colour when the first cover is gone', async () => {
        await insertAsset('cover0000000000a.webp');
        await env.DB.prepare(
            "UPDATE albums SET cover = 'cover0000000000a.webp', cover2 = 'cover0000000000a.webp', accent = '#123456', cover_source_etag = '\"c\"'",
        ).run();
        await deleteMedia('cover.jpg');
        const { body: synced } = await syncFolder();
        expect(synced.pendingRemovals).toEqual([
            { kind: 'cover', albumId: ALBUM_ID, slot: 'cover' },
            { kind: 'cover', albumId: ALBUM_ID, slot: 'cover2' },
        ]);
        const { body } = await confirmRemovals([synced.pendingRemovals[0]]);
        expect(body.results[0]).toMatchObject({ ok: true, slot: 'cover' });
        expect(await albumRow(ALBUM_ID)).toMatchObject({
            cover: null,
            cover2: null,
            thumb2: null,
            cover_source_etag: null,
            accent: NEUTRAL_ACCENT,
        });
    });

    it('should keep a cover whose source is still in the folder', async () => {
        const { body } = await confirmRemovals([
            { kind: 'cover', albumId: ALBUM_ID, slot: 'cover' },
        ]);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STILL_PRESENT' });
    });

    it('should delete an album whose folder is gone, with its tracks and lyrics', async () => {
        for (const { key } of (await env.MEDIA.list({ prefix: `${FOLDER}/` })).objects)
            await env.MEDIA.delete(key);
        const overview = await syncOverview();
        expect(overview.missingAlbums).toEqual([
            { kind: 'album', albumId: ALBUM_ID, folder: FOLDER, title: 'Komorebi' },
        ]);
        const { body } = await confirmRemovals(overview.missingAlbums);
        expect(body.results[0]).toMatchObject({ ok: true, albumId: ALBUM_ID });
        expect(await countOf('albums')).toBe(0);
        expect(await countOf('tracks')).toBe(0);
        expect(await countOf('lyrics')).toBe(0);
        expect((await liveDocument())?.albums).toEqual([]);
    });

    it('should keep an album whose folder is still there, also under a new name', async () => {
        const { body } = await confirmRemovals([{ kind: 'album', albumId: ALBUM_ID }]);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STILL_PRESENT' });
        for (const { key } of (await env.MEDIA.list({ prefix: `${FOLDER}/` })).objects)
            await env.MEDIA.delete(key);
        await putMedia('01 a.m4a', 'a', 'ep-02-komorebi');
        expect(
            (await confirmRemovals([{ kind: 'album', albumId: ALBUM_ID }])).body.results[0],
        ).toMatchObject({ code: 'STILL_PRESENT' });
        expect(await countOf('albums')).toBe(1);
    });

    it('should apply the other items when one fails and never touch the media bucket', async () => {
        await deleteMedia('05 太平門.mp4');
        const before = await stateRow();
        const { bindings, calls } = mediaWith();
        const items = [
            { kind: 'album', albumId: 'no-such-album' },
            {
                kind: 'mv',
                albumId: ALBUM_ID,
                trackId: 'komorebi-05',
                key: mediaKey('05 太平門.mp4'),
            },
        ];
        const { body } = await confirmRemovals(items, bindings);
        expect(body.results.map(({ ok, code }: Loose) => [ok, code])).toEqual([
            [false, 'NOT_FOUND'],
            [true, undefined],
        ]);
        expect(calls.put).toBeUndefined();
        expect(calls.delete).toBeUndefined();
        expect((await stateRow())?.updated_at).not.toBe(before?.updated_at);
    });
});
