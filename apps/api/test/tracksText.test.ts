/*
 * API-040 GET、API-041 PUT /api/tracks/:id/text（T-106；Technical Spec「寫返媒體 bucket」；Functional Spec D72、D75、FR-129）：
 * 歌曲文字框讀寫媒體 bucket 嘅 `NN ….txt`。儲存：body `{ text, etag }`（400）→ parseSongText()（逐行 400／413，乜都唔寫）→
 * 冇音檔 409 NO_AUDIO → 會清走現有歌詞要 ?force=1（409 LYRICS_REMOVED，D30）→ 條件寫入（409 STALE）→
 * 同步呢個資料夾（同 API-034 一樣：credit、歌詞、歌詞 JSON 由同步寫）
 */
import { SONG_TEXT_MAX_BYTES, SONG_TEXT_MAX_LINES } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { api, json } from './albumFixtures';
import { liveDocument } from './catalogFixtures';
import {
    ALBUM_ID,
    TEXT_05,
    endlessList,
    mediaKey,
    putKomorebi,
    putMedia,
    recordedMedia,
    syncFolder,
    tracksOf,
    type Loose,
} from './syncFixtures';
import { LYRICS_NAME, lyricsFile, lyricsFiles, lyricsRow, trackRow } from './trackFixtures';

const TEXT_05_KEY = mediaKey('05 太平門.txt');
const SONG = '下一位參賽者\n曲：阿正\n詞：Tim Lui\n\n[00:12.30]第一句歌詞\n[00:18.75]第二句歌詞';

const getText = async (id: string) => {
    const response = await api('GET', `/api/tracks/${id}/text`);
    return { status: response.status, body: await json<Loose>(response) };
};

const putText = async (id: string, body: unknown, query = '', bindings = env) => {
    const response = await api('PUT', `/api/tracks/${id}/text${query}`, body, {}, bindings);
    return { status: response.status, body: await json<Loose>(response) };
};

const mediaText = async (key: string) => (await env.MEDIA.get(key))?.text();
const etagOf = async (key = TEXT_05_KEY) => (await env.MEDIA.head(key))?.httpEtag ?? null;

const save05 = async (text: string, query = '') =>
    putText(`${ALBUM_ID}-05`, { text, etag: await etagOf() }, query);

beforeEach(async () => {
    await putKomorebi();
    await syncFolder();
});

describe('GET /api/tracks/:id/text', () => {
    it('should give the song text file of the track with its key and ETag', async () => {
        const { status, body } = await getText('komorebi-05');
        expect(status).toBe(200);
        expect(body).toEqual({
            trackId: 'komorebi-05',
            key: TEXT_05_KEY,
            etag: await etagOf(),
            text: TEXT_05,
            problem: null,
        });
    });

    it('should offer only the title when the track has no song text file', async () => {
        expect((await getText('komorebi-01')).body).toEqual({
            trackId: 'komorebi-01',
            key: null,
            etag: null,
            text: '下一位參賽者',
            problem: null,
        });
    });

    it('should say when the file is not UTF-8 or too large', async () => {
        await putMedia('05 太平門.txt', new Uint8Array([0x41, 0xff]));
        expect((await getText('komorebi-05')).body).toMatchObject({
            text: 'A\uFFFD',
            problem: 'BAD_ENCODING',
        });
        await putMedia('05 太平門.txt', 'x'.repeat(SONG_TEXT_MAX_BYTES + 1));
        expect((await getText('komorebi-05')).body).toMatchObject({
            text: null,
            problem: 'TOO_LARGE',
        });
    });

    it('should answer 409 TEXT_CONFLICT when two song text files have the number', async () => {
        await putMedia('01 a.txt', 'a');
        await putMedia('01 b.txt', 'b');
        const { status, body } = await getText('komorebi-01');
        expect(status).toBe(409);
        expect(body.error.code).toBe('TEXT_CONFLICT');
    });

    it('should answer 404 for an unknown track', async () => {
        expect((await getText('nope')).status).toBe(404);
    });
});

describe('PUT /api/tracks/:id/text: saving', () => {
    it('should write the file, sync the folder and answer with the track', async () => {
        const text = TEXT_05.replace('第二句', '改過的第二句');
        const { status, body } = await save05(text);
        expect(status).toBe(200);
        expect(await mediaText(TEXT_05_KEY)).toBe(text);
        expect(body).toMatchObject({
            trackId: 'komorebi-05',
            key: TEXT_05_KEY,
            etag: await etagOf(),
            text,
            checks: [],
            hints: [],
            track: {
                id: 'komorebi-05',
                title: '太平門',
                credits: { composer: 'RubberBand', lyricist: 'Tim Lui' },
                lyrics: { synced: true, lineCount: 2 },
            },
            sync: { album: { id: ALBUM_ID }, updated: [{ no: 5 }], pendingRemovals: [] },
            catalog: { ok: true },
        });
        expect((await trackRow('komorebi-05'))?.text_source_etag).toBe(body.etag);
    });

    it('should create a file named after the title for a track that has none', async () => {
        const { status, body } = await putText('komorebi-01', { text: SONG, etag: null });
        expect(status).toBe(200);
        const key = mediaKey('01 下一位參賽者.txt');
        expect(body.key).toBe(key);
        expect(await mediaText(key)).toBe(SONG);
        expect(await trackRow('komorebi-01')).toMatchObject({ text_key: key, composer: '阿正' });
        expect(body.track.lyrics).toEqual({ synced: true, lineCount: 2 });
    });

    it('should write the lyrics JSON under its content hash and drop the old one', async () => {
        const before = await lyricsFiles();
        const { body } = await save05(TEXT_05.replace('第二句', '另一句'));
        const name = (await lyricsRow('komorebi-05'))?.json_name as string;
        expect(name).toMatch(LYRICS_NAME);
        expect(name).not.toBe(before[0]);
        expect(await lyricsFile(name)).toMatchObject({ synced: true });
        expect(body.catalog).toMatchObject({ ok: true });
        expect(await lyricsFiles()).toEqual([name]);
    });

    it('should keep the info.txt title and report a different first line', async () => {
        const { body } = await save05(TEXT_05.replace('太平門', '太平門（現場）'));
        expect(body.track.title).toBe('太平門');
        expect(body.checks).toEqual([
            expect.objectContaining({ code: 'TITLE_MISMATCH', no: 5, key: TEXT_05_KEY }),
        ]);
    });

    // W-048（mutant N32）：回應嘅 checks 只有呢首歌嘅；成個資料夾嘅喺 sync.checks
    it('should answer with the checks of this track only', async () => {
        await putMedia('03 搲撈HK.txt', '搲撈HK\n曲：甲\n\n[00:01.00]一\n第二句');
        await syncFolder();
        const { body } = await save05(TEXT_05.replace('太平門', '太平門（現場）'));
        expect(body.checks.map(({ code, no }: Loose) => [code, no])).toEqual([
            ['TITLE_MISMATCH', 5],
        ]);
        expect(body.sync.checks.map(({ no }: Loose) => no)).toEqual(expect.arrayContaining([3, 5]));
    });

    // W-048（mutant N33）：同步由呢首歌嘅歌號起，前面嘅歌唔郁（要再掃描，S-182）
    it('should sync from the number of the track', async () => {
        await putMedia('01 下一位參賽者.txt', SONG);
        const { status, body } = await save05(TEXT_05.replace('第二句', '改過的第二句'));
        expect(status).toBe(200);
        expect(body.sync.updated.map(({ no }: Loose) => no)).toEqual([5]);
        expect((await tracksOf())[0]).toMatchObject({ text_key: null, composer: null });
    });

    it('should store UTF-8 without BOM and with LF only', async () => {
        await save05(`\uFEFF${TEXT_05.replaceAll('\n', '\r\n')}`);
        expect(await mediaText(TEXT_05_KEY)).toBe(TEXT_05);
    });

    it('should save old subtitle lines and label lines after a blank line with hints', async () => {
        const { status, body } = await save05('太平門\n副題：Live\n曲：甲\n\n詞：乙');
        expect(status).toBe(200);
        expect(body.hints.map(({ line, reason }: Loose) => [line, reason])).toEqual([
            [2, 'SUBTITLE_IGNORED'],
            [5, 'LABEL_AFTER_BLANK_LINE'],
        ]);
        expect(body.hints[0].message).toBe(zhHant.tracks.hints.SUBTITLE_IGNORED);
    });
});

describe('PUT /api/tracks/:id/text: clearing lyrics needs a confirmation (D30)', () => {
    it('should answer 409 LYRICS_REMOVED and write nothing without ?force=1', async () => {
        const { status, body } = await save05('太平門\n曲：RubberBand');
        expect(status).toBe(409);
        expect(body.error).toEqual({
            code: 'LYRICS_REMOVED',
            message: zhHant.tracks.errors.lyricsRemoved,
            details: [{ type: 'lyrics', trackId: 'komorebi-05', lineCount: 2 }],
        });
        expect(await mediaText(TEXT_05_KEY)).toBe(TEXT_05);
    });

    it('should clear the lyrics with ?force=1', async () => {
        const { status, body } = await save05('太平門\n曲：RubberBand', '?force=1');
        expect(status).toBe(200);
        expect(body.track.lyrics).toBeNull();
        expect(await lyricsRow('komorebi-05')).toBeNull();
    });

    it('should not take any force value other than 1', async () => {
        for (const query of ['?force=0', '?force=true', '?force=']) {
            expect((await save05('太平門', query)).status, query).toBe(409);
        }
    });
});

describe('PUT /api/tracks/:id/text: checks before writing', () => {
    it('should answer 409 NO_AUDIO for a track without audio and write nothing', async () => {
        const { puts, bindings } = recordedMedia();
        const { status, body } = await putText(
            'komorebi-02',
            { text: '跟住去邊度', etag: null },
            '',
            bindings,
        );
        expect(status).toBe(409);
        expect(body.error.code).toBe('NO_AUDIO');
        expect(puts).toEqual([]);
    });

    it('should list every song-text error by line and write nothing', async () => {
        const { puts, bindings } = recordedMedia();
        const text = '曲：阿正\n詞：甲\n詞：乙\n\n[00:01.00]a\nb';
        const { status, body } = await putText(
            'komorebi-05',
            { text, etag: await etagOf() },
            '',
            bindings,
        );
        expect(status).toBe(400);
        expect(body.error.details.map(({ line, reason }: Loose) => [line, reason])).toEqual([
            [1, 'TITLE_REQUIRED'],
            [3, 'DUPLICATE_LABEL'],
            [6, 'MIXED_TIMESTAMPS'],
        ]);
        expect(body.error.details[0].message).toBe(zhHant.tracks.reasons.TITLE_REQUIRED);
        expect(puts).toEqual([]);
    });

    it('should report too many lines as line 0 with 400', async () => {
        const { status, body } = await save05(`歌名${'\n'.repeat(SONG_TEXT_MAX_LINES)}`);
        expect(status).toBe(400);
        expect(body.error.details).toMatchObject([{ line: 0, reason: 'TOO_MANY_LINES' }]);
    });

    it('should answer 413 TOO_LARGE above the limit and for a huge body', async () => {
        const chinese = `歌名\n\n${'字'.repeat(Math.ceil(SONG_TEXT_MAX_BYTES / 3))}`;
        const large = await save05(chinese);
        expect(large.status).toBe(413);
        expect(large.body.error.message).toContain('64');
        const huge = await api('PUT', '/api/tracks/komorebi-05/text', 'a'.repeat(4_000_000));
        expect(huge.status).toBe(413);
    });

    it('should still read a fully escaped body whose text is within the limit', async () => {
        const raw = `{"etag":null,"text":"${'\\u0041'.repeat(SONG_TEXT_MAX_BYTES - 1)}"}`;
        const response = await api('PUT', '/api/tracks/komorebi-05/text', raw);
        expect(response.status).toBe(400);
        expect((await json<Loose>(response)).error.details).toMatchObject([
            { line: 1, reason: 'TITLE_TOO_LONG' },
        ]);
    });

    it.each([
        ['"歌名"', '$', 'NOT_AN_OBJECT'],
        [{ etag: null }, 'text', 'REQUIRED'],
        [{ text: 42, etag: null }, 'text', 'NOT_TEXT'],
        [{ text: '太平門' }, 'etag', 'REQUIRED'],
        [{ text: '太平門', etag: '*' }, 'etag', 'INVALID_VALUE'],
        [{ text: '太平門', etag: null, key: 'album-02-x/05 x.txt' }, 'key', 'NOT_EDITABLE'],
    ])('should refuse %j at %s with %s', async (body, path, reason) => {
        const { status, body: answer } = await putText('komorebi-05', body);
        expect(status).toBe(400);
        expect(answer.error.details).toContainEqual({ path, reason, message: expect.any(String) });
    });
});

describe('PUT /api/tracks/:id/text: versions', () => {
    it('should answer 409 STALE and keep the file when it changed since it was read', async () => {
        const etag = await etagOf();
        await putMedia('05 太平門.txt', `${TEXT_05}\n[00:09.00]別處改的`);
        const { status, body } = await putText('komorebi-05', { text: '太平門', etag }, '?force=1');
        expect(status).toBe(409);
        expect(body.error).toEqual({
            code: 'STALE',
            message: '檔案已在其他地方更改，請重新載入。',
        });
        expect(await mediaText(TEXT_05_KEY)).toBe(`${TEXT_05}\n[00:09.00]別處改的`);
    });

    it('should not create a file over one that appeared since it was read', async () => {
        const { status } = await putText('komorebi-05', { text: TEXT_05, etag: null });
        expect(status).toBe(409);
    });

    it('should let only one of two saves of the same version win', async () => {
        const etag = await etagOf();
        const texts = [`${TEXT_05}\n[00:09.00]甲`, `${TEXT_05}\n[00:09.00]乙`];
        const results = await Promise.all(
            texts.map((text) => putText('komorebi-05', { text, etag })),
        );
        expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
        const winner = results.find(({ status }) => status === 200)?.body;
        expect(await mediaText(TEXT_05_KEY)).toBe(winner?.text);
        expect((await lyricsRow('komorebi-05'))?.line_count).toBe(3);
    });

    it('should answer 404 NOT_FOUND for an unknown track and write nothing', async () => {
        const { puts, bindings } = recordedMedia();
        const { status, body } = await putText('nope', { text: '歌名', etag: null }, '', bindings);
        expect(status).toBe(404);
        expect(body.error.message).toBe(zhHant.tracks.errors.notFound);
        expect(puts).toEqual([]);
    });
});

describe('PUT /api/tracks/:id/text: only the song text file of the track is written', () => {
    it('should ignore a stored link to a file of another album', async () => {
        const foreign = 'album-02-other/01 下一位參賽者.txt';
        await env.MEDIA.put(foreign, '別人的檔');
        await env.DB.prepare("UPDATE tracks SET text_key = ? WHERE id = 'komorebi-01'")
            .bind(foreign)
            .run();
        const { puts, bindings } = recordedMedia();
        const { status } = await putText('komorebi-01', { text: SONG, etag: null }, '', bindings);
        expect(status).toBe(200);
        expect(puts).toEqual([mediaKey('01 下一位參賽者.txt')]);
        expect(await mediaText(foreign)).toBe('別人的檔');
    });

    it('should not write when the stored folder is not an album folder', async () => {
        const { puts, bindings } = recordedMedia();
        await env.DB.prepare("UPDATE albums SET folder = '_fonts'").run();
        const { status } = await putText('komorebi-01', { text: SONG, etag: null }, '', bindings);
        expect(status).toBe(400);
        expect(puts).toEqual([]);
    });

    // S-184（review probe P6）
    it('should answer 409 FOLDER_MISMATCH when the stored folder belongs to another album', async () => {
        await putMedia('01 下一位參賽者.m4a', 'a', 'album-12-other');
        await env.DB.prepare("UPDATE albums SET folder = 'album-12-other'").run();
        const { puts, bindings } = recordedMedia();
        const { status, body } = await putText(
            'komorebi-01',
            { text: SONG, etag: null },
            '',
            bindings,
        );
        expect(status).toBe(409);
        expect(body.error.code).toBe('FOLDER_MISMATCH');
        expect(puts).toEqual([]);
    });

    it('should not write when two song text files have the number', async () => {
        await putMedia('01 a.txt', 'a');
        await putMedia('01 b.txt', 'b');
        const { puts, bindings } = recordedMedia();
        const { status, body } = await putText(
            'komorebi-01',
            { text: SONG, etag: null },
            '',
            bindings,
        );
        expect(status).toBe(409);
        expect(body.error.code).toBe('TEXT_CONFLICT');
        expect(puts).toEqual([]);
    });

    // W-048（mutant N13）：list 唔齊又搵唔到 `.txt` = 唔知會唔會開多一個
    it('should answer 409 STALE and write nothing when the listing is cut short without a file', async () => {
        const puts: string[] = [];
        const { bindings } = endlessList(puts);
        const { status, body } = await putText(
            'komorebi-01',
            { text: SONG, etag: null },
            '',
            bindings,
        );
        expect(status).toBe(409);
        expect(body.error.code).toBe('STALE');
        expect(puts).toEqual([]);
    });

    it('should put the new lyrics into catalog.json and never delete media', async () => {
        const { calls, bindings } = recordedMedia();
        await putText('komorebi-01', { text: SONG, etag: null }, '', bindings);
        expect(calls.delete).toBeUndefined();
        const tracks = (await liveDocument())?.albums[0]?.tracks ?? [];
        expect(tracks[0]?.lyrics).toEqual(expect.any(String));
        expect((await tracksOf())[0]?.composer).toBe('阿正');
    });
});
