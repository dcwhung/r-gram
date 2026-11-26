/*
 * API-034 POST /api/sync/folders/:folder（T-105；Technical Spec「CR-007 → 同步嘅設計」、Functional Spec D67–D77）：
 * 新增、更新自動；移除只係列出（API-035 確認先做）；檢查結果記喺 albums.checks；冇改過嘅檔唔再讀；
 * 寫咗 D1 先生成 catalog；永遠唔寫、唔刪媒體 bucket
 */
import { env } from 'cloudflare:test';
import { SYNC_TRACKS_MAX } from '../src/config';
import { albumRow, api, countOf, json } from './albumFixtures';
import { liveDocument, stateRow } from './catalogFixtures';
import {
    ALBUM_ID,
    FOLDER,
    KOMOREBI_INFO,
    TEXT_05,
    deleteMedia,
    mediaKey,
    mediaWith,
    putKomorebi,
    putMedia,
    syncFolder,
    tracksOf,
    updatedAts,
    type Loose,
} from './syncFixtures';
import { lyricsRow } from './trackFixtures';

const codesOf = (body: Loose) => body.checks.map(({ code, no }: Loose) => [code, no]);

describe('POST /api/sync/folders/:folder: request', () => {
    it.each(['Album-01-x', '_fonts', 'album-00-x', 'album-01-favourites', 'album-01-x/..'])(
        'should refuse the folder name %j with 400 INVALID_FOLDER',
        async (folder) => {
            const { status, body } = await syncFolder(folder);
            expect(status).toBe(400);
            expect(body.error).toMatchObject({
                code: 'INVALID_FOLDER',
                message: expect.any(String),
            });
            expect(await countOf('albums')).toBe(0);
        },
    );

    it.each(['?from=0', '?from=abc', '?from=1000'])('should refuse %s', async (query) => {
        await putKomorebi();
        const { status, body } = await syncFolder(FOLDER, query);
        expect(status).toBe(400);
        expect(body.error.details).toEqual([
            { path: 'from', reason: 'INVALID_NUMBER', message: expect.any(String) },
        ]);
    });

    it('should answer 404 FOLDER_EMPTY for a folder that is not in the bucket', async () => {
        const { status, body } = await syncFolder('album-01-nothing');
        expect(status).toBe(404);
        expect(body.error.code).toBe('FOLDER_EMPTY');
    });

    it('should refuse with 409 an id that two folders use when neither is stored', async () => {
        await putMedia('01 a.m4a', 'a', 'album-01-x');
        await putMedia('01 a.m4a', 'a', 'ep-01-x');
        const { status, body } = await syncFolder('ep-01-x');
        expect(status).toBe(409);
        expect(body.error.code).toBe('DUPLICATE_ALBUM_ID');
        expect(await countOf('albums')).toBe(0);
    });
});

describe('POST /api/sync/folders/:folder: first scan', () => {
    beforeEach(putKomorebi);

    it('should create the album, every listed track and the song text', async () => {
        const { status, body } = await syncFolder();
        expect(status).toBe(200);
        expect(body.album).toMatchObject({
            id: ALBUM_ID,
            folder: FOLDER,
            title: 'Komorebi',
            year: 2026,
            created: true,
        });
        expect(body.added.map(({ no }: Loose) => no)).toEqual([1, 2, 3, 4, 5]);
        expect(body.checks).toEqual([]);
        expect(body.more).toBe(false);
        expect(body.catalog).toMatchObject({ ok: true });
        const tracks = await tracksOf();
        expect(tracks.map(({ id, audio_key }) => [id, audio_key])).toEqual([
            ['komorebi-01', mediaKey('01 下一位參賽者.m4a')],
            ['komorebi-02', null],
            ['komorebi-03', mediaKey('03 搲撈HK.mp3')],
            ['komorebi-04', null],
            ['komorebi-05', mediaKey('05 太平門.m4a')],
        ]);
        expect(tracks[4]).toMatchObject({
            title: '太平門',
            mv_key: mediaKey('05 太平門.mp4'),
            text_key: mediaKey('05 太平門.txt'),
            composer: 'RubberBand',
        });
        expect(await lyricsRow('komorebi-05')).toMatchObject({ synced: 1, line_count: 2 });
    });

    it('should store the album from the folder name and info.txt', async () => {
        await syncFolder();
        expect(await albumRow(ALBUM_ID)).toMatchObject({
            folder: FOLDER,
            category: 'album',
            category_no: 11,
            title: 'Komorebi',
            year: 2026,
            accent: '#6e6e6e',
            info_etag: expect.stringMatching(/^".+"$/),
            checks: '[]',
        });
    });

    it('should put greyed tracks into the catalog', async () => {
        await syncFolder();
        const [album] = (await liveDocument())?.albums ?? [];
        expect(album?.tracks.map((track) => track.audio)).toEqual([
            mediaKey('01 下一位參賽者.m4a'),
            null,
            mediaKey('03 搲撈HK.mp3'),
            null,
            mediaKey('05 太平門.m4a'),
        ]);
    });

    it('should ask for the cover to be processed in the browser', async () => {
        const { body } = await syncFolder();
        expect(body.coverJobs).toEqual([
            { slot: 'cover', key: mediaKey('cover.jpg'), etag: expect.any(String), bytes: 4 },
        ]);
    });

    it('should neither write nor delete anything in the media bucket', async () => {
        const { bindings, calls } = mediaWith();
        await syncFolder(FOLDER, '', bindings);
        await syncFolder(FOLDER, '', bindings);
        expect(calls.put).toBeUndefined();
        expect(calls.delete).toBeUndefined();
    });

    it('should create several albums from an empty database', async () => {
        await putMedia('01 Hello.m4a', 'a', 'single-01-hello');
        await syncFolder();
        await syncFolder('single-01-hello');
        expect(await countOf('albums')).toBe(2);
        expect((await liveDocument())?.albums.map(({ id }) => id)).toEqual(['komorebi', 'hello']);
    });
});

describe('POST /api/sync/folders/:folder: second scan', () => {
    beforeEach(async () => {
        await putKomorebi();
        await syncFolder();
    });

    it('should neither write nor rebuild nor read files again when nothing changed', async () => {
        const before = { rows: await updatedAts(), state: await stateRow() };
        const { bindings, calls } = mediaWith();
        const { status, body } = await syncFolder(FOLDER, '', bindings);
        expect(status).toBe(200);
        expect(body).toMatchObject({ added: [], updated: [], unchanged: 5, failed: [] });
        expect(body).not.toHaveProperty('catalog');
        expect(calls.get).toBeUndefined();
        expect(await updatedAts()).toEqual(before.rows);
        expect(await stateRow()).toEqual(before.state);
    });

    it('should follow a new title, year and track list in info.txt', async () => {
        await putMedia(
            'info.txt',
            `${KOMOREBI_INFO.replace('Komorebi', '木漏日').replace('2026', '2027')}\n6. 理想的下午`,
        );
        const { body } = await syncFolder();
        expect(body.album).toMatchObject({ title: '木漏日', year: 2027, created: false });
        expect(body.added).toEqual([{ trackId: 'komorebi-06', no: 6, title: '理想的下午' }]);
        expect(body.catalog).toMatchObject({ ok: true });
        expect((await liveDocument())?.albums[0]).toMatchObject({
            title: '木漏日',
            wheelKey: '木',
        });
    });

    it('should follow new audio, MV and changed song text', async () => {
        await putMedia('02 跟住去邊度.m4a');
        await putMedia('03 搲撈HK.m4v');
        const before = await lyricsRow('komorebi-05');
        await putMedia('05 太平門.txt', TEXT_05.replace('第二句', '第二句（改）'));
        const { body } = await syncFolder();
        expect(body.updated.map(({ no }: Loose) => no)).toEqual([2, 3, 5]);
        const tracks = await tracksOf();
        expect(tracks[1]?.audio_key).toBe(mediaKey('02 跟住去邊度.m4a'));
        expect(tracks[2]?.mv_key).toBe(mediaKey('03 搲撈HK.m4v'));
        expect((await lyricsRow('komorebi-05'))?.json_name).not.toBe(before?.json_name);
    });

    it('should list removals and change nothing until they are confirmed', async () => {
        await deleteMedia('03 搲撈HK.mp3');
        await deleteMedia('05 太平門.mp4');
        await putMedia('info.txt', KOMOREBI_INFO.replace('4. 毒蟲圖鑑\n', ''));
        await putMedia('cover.jpg', 'jpeg');
        const { body } = await syncFolder();
        expect(body.pendingRemovals).toEqual([
            {
                kind: 'audio',
                albumId: ALBUM_ID,
                trackId: 'komorebi-03',
                key: mediaKey('03 搲撈HK.mp3'),
                no: 3,
                title: '搲撈HK',
            },
            {
                kind: 'mv',
                albumId: ALBUM_ID,
                trackId: 'komorebi-05',
                key: mediaKey('05 太平門.mp4'),
                no: 5,
                title: '太平門',
            },
            { kind: 'track', albumId: ALBUM_ID, trackId: 'komorebi-04', no: 4, title: '毒蟲圖鑑' },
        ]);
        const tracks = await tracksOf();
        expect(tracks).toHaveLength(5);
        expect(tracks[2]?.audio_key).toBe(mediaKey('03 搲撈HK.mp3'));
        expect(tracks[4]?.mv_key).toBe(mediaKey('05 太平門.mp4'));
    });

    it('should list a removal again on the next scan while it is not confirmed', async () => {
        await putMedia('info.txt', KOMOREBI_INFO.replace('4. 毒蟲圖鑑\n', ''));
        await syncFolder();
        const { body } = await syncFolder();
        expect(body.pendingRemovals.map(({ kind, no }: Loose) => [kind, no])).toEqual([
            ['track', 4],
        ]);
    });

    it('should follow a renamed folder that keeps the id', async () => {
        const names = (await env.MEDIA.list({ prefix: `${FOLDER}/` })).objects.map(
            ({ key }) => key,
        );
        for (const key of names) {
            const object = await env.MEDIA.get(key);
            await env.MEDIA.put(
                key.replace(FOLDER, 'ep-02-komorebi'),
                (await object?.arrayBuffer()) ?? '',
            );
            await env.MEDIA.delete(key);
        }
        const { body } = await syncFolder('ep-02-komorebi');
        expect(body.album).toMatchObject({
            folder: 'ep-02-komorebi',
            category: 'ep',
            categoryNo: 2,
        });
        expect((await tracksOf())[0]?.audio_key).toBe('ep-02-komorebi/01 下一位參賽者.m4a');
    });
});

describe('POST /api/sync/folders/:folder: checks', () => {
    it('should fall back to the id and the audio numbers without info.txt', async () => {
        await putMedia('02 Hero.m4a');
        await putMedia('05 太平門.m4a');
        await putMedia('05 太平門.txt', TEXT_05.replace('太平門', '太平門（現場）'));
        const { body } = await syncFolder();
        expect(body.album).toMatchObject({ title: ALBUM_ID, year: null });
        expect((await tracksOf()).map(({ no, title }) => [no, title])).toEqual([
            [2, 'Hero'],
            [5, '太平門（現場）'],
        ]);
        expect(codesOf(body)).toEqual([
            ['NO_INFO', undefined],
            ['TITLE_MISMATCH', 5],
        ]);
        expect(body.checks[0].message).toContain(ALBUM_ID);
        expect((await albumRow(ALBUM_ID))?.info_etag).toBeNull();
    });

    it('should drop a title mismatch without info.txt once the audio file is renamed', async () => {
        await putMedia('05 太平門 (Live).m4a');
        await putMedia('05 太平門.txt', TEXT_05);
        expect(codesOf((await syncFolder()).body)).toEqual([
            ['NO_INFO', undefined],
            ['TITLE_MISMATCH', 5],
        ]);
        await deleteMedia('05 太平門 (Live).m4a');
        await putMedia('05 太平門.m4a');
        expect(codesOf((await syncFolder()).body)).toEqual([['NO_INFO', undefined]]);
    });

    it('should treat info.txt that is not UTF-8 like a missing one', async () => {
        await putMedia('info.txt', new Uint8Array([0xff, 0xfe, 0x41]));
        await putMedia('01 a.m4a');
        const { body } = await syncFolder();
        expect(codesOf(body)).toEqual([['INFO_BAD_ENCODING', undefined]]);
        expect(body.checks[0].key).toBe(mediaKey('info.txt'));
        expect((await tracksOf()).map(({ no }) => no)).toEqual([1]);
    });

    it('should keep the album as it was when a used info.txt becomes unusable', async () => {
        await putKomorebi();
        await syncFolder();
        const before = await tracksOf();
        await putMedia('info.txt', new Uint8Array([0xff, 0xfe, 0x41]));
        const { body } = await syncFolder();
        expect(body.album).toMatchObject({ title: 'Komorebi', year: 2026 });
        expect(body.pendingRemovals).toEqual([]);
        expect(codesOf(body)).toEqual([['INFO_BAD_ENCODING', undefined]]);
        expect(await tracksOf()).toEqual(before);
        expect((await syncFolder()).body.pendingRemovals).toEqual([]);
    });

    it('should keep the album as it was when info.txt cannot be read', async () => {
        await putKomorebi();
        await syncFolder();
        await putMedia('info.txt', `${KOMOREBI_INFO}\n6. 新歌`);
        const { bindings } = mediaWith({
            get: (args, original) => {
                if (String(args[0]).endsWith('info.txt')) throw new Error('R2 unavailable');
                return original(...args);
            },
        });
        const { status, body } = await syncFolder(FOLDER, '', bindings);
        expect(status).toBe(200);
        expect(body.album).toMatchObject({ title: 'Komorebi' });
        expect(codesOf(body)).toEqual([['INFO_UNREADABLE', undefined]]);
        expect(body.checks[0].key).toBe(mediaKey('info.txt'));
        expect(await countOf('tracks')).toBe(5);
        expect((await syncFolder()).body.added.map(({ no }: Loose) => no)).toEqual([6]);
    });

    it('should not read an info.txt larger than the limit', async () => {
        await putMedia('info.txt', 'x'.repeat(16 * 1024 + 1));
        await putMedia('01 a.m4a');
        const { bindings, calls } = mediaWith();
        const { body } = await syncFolder(FOLDER, '', bindings);
        expect(codesOf(body)).toEqual([['INFO_TOO_LARGE', undefined]]);
        expect(calls.get).toBeUndefined();
    });

    it('should report unknown lines of info.txt with their line number', async () => {
        await putMedia('info.txt', '唱片名稱：K\n唱片公司：Sony\n1. 甲');
        const { body } = await syncFolder();
        expect(body.checks).toEqual([
            {
                level: 'warning',
                code: 'INFO_UNKNOWN_LINE',
                key: mediaKey('info.txt'),
                line: 2,
                params: {},
                message: expect.stringContaining('2'),
            },
        ]);
    });

    it('should report titles that do not match the file names and keep the info.txt title', async () => {
        await putMedia('info.txt', '唱片名稱：K\n1. 下一位參賽者\n2. Re: Love');
        await putMedia('01 下一位.m4a');
        await putMedia('02 Re Love.m4a');
        await putMedia('02 Re Love.txt', 'Re: Love Song\n\n歌詞');
        const { body } = await syncFolder();
        expect(codesOf(body)).toEqual([
            ['TITLE_MISMATCH', 1],
            ['TITLE_MISMATCH', 2],
        ]);
        expect(body.checks[1]).toMatchObject({
            key: mediaKey('02 Re Love.txt'),
            params: { other: 'Re: Love Song' },
        });
        expect((await tracksOf()).map(({ title }) => title)).toEqual(['下一位參賽者', 'Re: Love']);
    });

    it('should report two audio files for one number and keep the track greyed', async () => {
        await putMedia('info.txt', '唱片名稱：K\n1. 甲');
        await putMedia('01 甲.m4a');
        await putMedia('01 甲 (remaster).mp3');
        const { body } = await syncFolder();
        expect(codesOf(body)).toEqual([
            ['AUDIO_CONFLICT', 1],
            ['AUDIO_CONFLICT', 1],
        ]);
        expect((await tracksOf())[0]?.audio_key).toBeNull();
    });

    it('should keep the last good song text and report each bad line', async () => {
        await putKomorebi();
        await syncFolder();
        await putMedia('05 太平門.txt', '太平門\n\n[00:01.00]第一句\n第二句');
        const { body } = await syncFolder();
        expect(body.checks).toEqual([
            expect.objectContaining({
                code: 'TEXT_INVALID',
                no: 5,
                line: 4,
                params: { no: 5, reason: 'MIXED_TIMESTAMPS' },
            }),
        ]);
        expect((await tracksOf())[4]?.composer).toBe('RubberBand');
    });

    it('should store the checks for the album page and the list', async () => {
        await putMedia('info.txt', '唱片名稱：K\n???\n1. 甲');
        await putMedia('13 x.m4a');
        await syncFolder();
        const album = await json<Loose>(await api('GET', `/api/albums/${ALBUM_ID}`));
        expect(album.checks.map(({ code }: Loose) => code)).toEqual([
            'INFO_UNKNOWN_LINE',
            'AUDIO_NOT_LISTED',
        ]);
        const list = await json<Loose>(await api('GET', '/api/albums'));
        expect(list.albums[0].checkCount).toBe(2);
    });

    it('should warn about two folders with the same category and number', async () => {
        await putMedia('01 a.m4a', 'a', 'album-01-a');
        await putMedia('01 b.m4a', 'b', 'album-01-b');
        const { body } = await syncFolder('album-01-a');
        expect(body.checks).toEqual([
            expect.objectContaining({ code: 'DUPLICATE_ORDINAL', params: { other: 'album-01-b' } }),
            expect.objectContaining({ code: 'NO_INFO' }),
        ]);
    });

    it('should keep syncing the stored folder of an id that a second folder also uses', async () => {
        await putMedia('01 a.m4a', 'a', 'album-01-x');
        await syncFolder('album-01-x');
        await putMedia('01 a.m4a', 'a', 'ep-01-x');
        const { status, body } = await syncFolder('album-01-x');
        expect(status).toBe(200);
        expect(codesOf(body)[0]).toEqual(['DUPLICATE_ALBUM_ID', undefined]);
        expect((await syncFolder('ep-01-x')).status).toBe(409);
    });
});

describe('POST /api/sync/folders/:folder: limits and failures', () => {
    it('should sync a very large folder in batches', async () => {
        const count = SYNC_TRACKS_MAX + 3;
        const lines = Array.from({ length: count }, (_, index) => `${index + 1}. 歌${index + 1}`);
        await putMedia('info.txt', `唱片名稱：大碟\n${lines.join('\n')}`);
        for (let no = 1; no <= count; no += 1) {
            await putMedia(`${String(no).padStart(2, '0')} 歌${no}.m4a`);
            await putMedia(`${String(no).padStart(2, '0')} 歌${no}.txt`, `歌${no}\n曲：甲`);
        }
        const { bindings, calls } = mediaWith();
        const first = await syncFolder(FOLDER, '', bindings);
        expect(first.body).toMatchObject({ more: true, nextFrom: SYNC_TRACKS_MAX + 1 });
        expect(first.body.added).toHaveLength(SYNC_TRACKS_MAX);
        expect(calls.get).toBeLessThanOrEqual(SYNC_TRACKS_MAX + 1);
        const second = await syncFolder(FOLDER, `?from=${first.body.nextFrom}`);
        expect(second.body).toMatchObject({ more: false, nextFrom: null });
        expect(second.body.added).toHaveLength(3);
        expect(await countOf('tracks')).toBe(count);
        const again = await syncFolder();
        expect(again.body).toMatchObject({ added: [], updated: [], unchanged: count });
    });

    it('should not settle info.txt while a track of an earlier batch is still missing', async () => {
        const count = SYNC_TRACKS_MAX + 3;
        const lines = Array.from({ length: count }, (_, index) => `${index + 1}. 歌${index + 1}`);
        await putMedia('info.txt', `唱片名稱：大碟\n${lines.join('\n')}`);
        for (let no = 1; no <= count; no += 1) {
            await putMedia(`${String(no).padStart(2, '0')} 歌${no}.m4a`);
            await putMedia(`${String(no).padStart(2, '0')} 歌${no}.txt`, `歌${no}\n曲：甲`);
        }
        const { bindings } = mediaWith({
            get: (args, original) => {
                if (String(args[0]).includes('/02 ')) throw new Error('R2 unavailable');
                return original(...args);
            },
        });
        const first = await syncFolder(FOLDER, '', bindings);
        expect(first.body.failed.map(({ no }: Loose) => no)).toEqual([2]);
        const second = await syncFolder(FOLDER, `?from=${first.body.nextFrom}`);
        expect(second.body).toMatchObject({ more: false, failed: [] });
        expect((await albumRow(ALBUM_ID))?.info_etag).toBeNull();
        const again = await syncFolder();
        expect(again.body.added.map(({ no }: Loose) => no)).toEqual([2]);
        expect(await countOf('tracks')).toBe(count);
        expect((await albumRow(ALBUM_ID))?.info_etag).not.toBeNull();
    });

    it('should apply the rest when one track fails and retry it on the next scan', async () => {
        await putKomorebi();
        await putMedia('01 下一位參賽者.txt', '下一位參賽者');
        const { bindings } = mediaWith({
            get: (args, original) => {
                if (String(args[0]).includes('01 ')) throw new Error('R2 unavailable');
                return original(...args);
            },
        });
        const { status, body } = await syncFolder(FOLDER, '', bindings);
        expect(status).toBe(200);
        expect(body.failed).toEqual([
            { no: 1, trackId: null, code: 'INTERNAL', message: expect.any(String) },
        ]);
        expect(body.added.map(({ no }: Loose) => no)).toEqual([2, 3, 4, 5]);
        expect((await albumRow(ALBUM_ID))?.info_etag).toBeNull();
        const retry = await syncFolder();
        expect(retry.body.added.map(({ no }: Loose) => no)).toEqual([1]);
    });

    it('should still rebuild the catalog when storing the checks fails after the tracks', async () => {
        await putKomorebi();
        const db = new Proxy(env.DB, {
            get(target, key: string) {
                const value = Reflect.get(target, key) as unknown;
                if (key !== 'prepare')
                    return typeof value === 'function' ? value.bind(target) : value;
                return (sql: string) => {
                    if (sql.includes('SET checks')) throw new Error('D1 unavailable');
                    return target.prepare(sql);
                };
            },
        });
        const { status, body } = await syncFolder(FOLDER, '', { ...env, DB: db });
        expect(status).toBe(200);
        expect(body.added).toHaveLength(5);
        expect(body.catalog).toMatchObject({ ok: true });
        expect((await liveDocument())?.albums[0]?.tracks).toHaveLength(5);
        expect((await albumRow(ALBUM_ID))?.info_etag).toBeNull();
    });

    it('should end with the same result when two scans of one folder run at once', async () => {
        await putKomorebi();
        const results = await Promise.all([syncFolder(), syncFolder()]);
        expect(results.map(({ status }) => status)).toEqual([200, 200]);
        expect((await tracksOf()).map(({ id }) => id)).toEqual([
            'komorebi-01',
            'komorebi-02',
            'komorebi-03',
            'komorebi-04',
            'komorebi-05',
        ]);
        expect(await countOf('lyrics')).toBe(1);
        const again = await syncFolder();
        expect(again.body).toMatchObject({ added: [], updated: [], failed: [] });
    });
});
