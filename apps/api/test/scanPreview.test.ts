/*
 * API-030 掃描預覽（T-025；Technical Spec「掃描嘅設計」、CR-005「掃描以音檔做錨」、CR-006「掃描建立歌曲」）：
 * 列專輯資料夾 → 分類 → 封面只比 ETag → 歌曲文字 ETag 變咗先讀 → newTracks / audioMissing / manualMissing。
 * 唔寫 D1、唔寫 R2。媒體 bucket 係 test binding（細嘅假檔），唔係真 bucket
 */
import { SONG_TEXT_MAX_BYTES } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { SCAN_TEXT_READS_MAX } from '../src/config';
import { zhHant } from '../src/i18n/zh-Hant';
import { countOf, insertLyrics, json } from './albumFixtures';
import { call } from './helpers';
import {
    FOLDER,
    insertScanTrack,
    mediaKey,
    previewOf,
    putMedia,
    putMediaFiles,
    scanPreview,
    seedScanAlbum,
    type Loose,
} from './scanFixtures';

const TEXT_05 = '太平門\n曲：RubberBand\n詞：Tim Lui\n\n第一句\n第二句';

beforeEach(async () => {
    await seedScanAlbum();
});

describe('GET /api/albums/:id/scan: guards and folder', () => {
    it('should answer 404 NOT_FOUND for an unknown album', async () => {
        const response = await scanPreview('', 'no-such-album');
        expect(response.status).toBe(404);
        expect((await json<Loose>(response)).error.code).toBe('NOT_FOUND');
    });

    it('should answer 404 FOLDER_EMPTY when the folder has no files', async () => {
        await putMedia('01 a.m4a', 'x', 'album-01-other');
        const response = await scanPreview();
        expect(response.status).toBe(404);
        const body = await json<Loose>(response);
        expect(body.error).toMatchObject({ code: 'FOLDER_EMPTY', message: expect.any(String) });
    });

    it('should need a session', async () => {
        const response = await call(`/api/albums/komorebi/scan`);
        expect(response.status).toBe(401);
    });

    it('should scan the expected folder and say which folder it used', async () => {
        await putMediaFiles(['01 a.m4a']);
        const preview = await previewOf();
        expect(preview).toMatchObject({ folder: FOLDER, expectedFolder: FOLDER });
    });

    it('should ignore files in sub-folders', async () => {
        await putMediaFiles(['01 a.m4a', 'extra/02 b.m4a']);
        const preview = await previewOf();
        expect(preview.newTracks.map((track: Loose) => track.no)).toEqual([1]);
    });

    it('should write nothing', async () => {
        await putMediaFiles(['01 a.m4a']);
        await previewOf();
        expect(await countOf('tracks')).toBe(0);
        expect((await env.CATALOG.list()).objects).toEqual([]);
    });

    it('should reject a from value that is not a track number', async () => {
        await putMediaFiles(['01 a.m4a']);
        const response = await scanPreview('?from=0');
        expect(response.status).toBe(400);
        expect((await json<Loose>(response)).error.details[0]).toMatchObject({
            path: 'from',
            reason: 'INVALID_NUMBER',
        });
    });
});

describe('GET /api/albums/:id/scan: new tracks', () => {
    it('should propose tracks by file number with gaps, titles from the text or the file name', async () => {
        await putMediaFiles(['01 a.m4a', '07 我永遠記得.mp3', '05 太平門.m4a', '05 太平門.mp4']);
        const etag = await putMedia('05 太平門.txt', TEXT_05);
        const preview = await previewOf();
        expect(preview.newTracks.map((track: Loose) => track.no)).toEqual([1, 5, 7]);
        expect(preview.newTracks[1]).toEqual({
            no: 5,
            trackId: 'komorebi-05',
            audio: { key: mediaKey('05 太平門.m4a'), bytes: 5 },
            mv: { key: mediaKey('05 太平門.mp4'), bytes: 5 },
            title: '太平門',
            titleSource: 'text',
            text: {
                key: mediaKey('05 太平門.txt'),
                etag,
                bytes: new TextEncoder().encode(TEXT_05).length,
                lineCount: 2,
                synced: false,
                errors: [],
            },
        });
        expect(preview.newTracks[2]).toMatchObject({
            title: '我永遠記得',
            titleSource: 'fileName',
            text: null,
        });
    });

    it('should list the text errors and fall back to the file-name title', async () => {
        await putMediaFiles(['03 Hero.m4a']);
        await putMedia('03 Hero.txt', 'Hero\n\n[00:01.00]一\n二');
        const [track] = (await previewOf()).newTracks;
        expect(track).toMatchObject({ title: 'Hero', titleSource: 'fileName' });
        expect(track.text.errors).toEqual([
            { line: 4, reason: 'MIXED_TIMESTAMPS', message: expect.any(String) },
        ]);
    });

    it('should report a song text that is not UTF-8 or too large as a file error', async () => {
        await putMediaFiles(['01 a.m4a', '02 b.m4a']);
        await putMedia('01 a.txt', new Uint8Array([0xff, 0xfe, 0x00]));
        await putMedia('02 b.txt', 'x'.repeat(SONG_TEXT_MAX_BYTES + 1));
        const [first, second] = (await previewOf()).newTracks;
        expect(first.text.errors).toEqual([
            { line: 0, reason: 'BAD_ENCODING', message: expect.any(String) },
        ]);
        expect(second.text.errors).toEqual([
            { line: 0, reason: 'TOO_LARGE', message: expect.any(String) },
        ]);
    });

    it('should skip texts and MVs without audio, with a message', async () => {
        await putMediaFiles(['01 a.m4a', '04 a.txt']);
        const preview = await previewOf();
        expect(preview.skipped).toEqual([
            {
                key: mediaKey('04 a.txt'),
                no: 4,
                kind: 'text',
                reason: 'NO_AUDIO',
                message: expect.any(String),
            },
        ]);
    });
});

describe('GET /api/albums/:id/scan: existing tracks', () => {
    it('should compare a changed song text with the stored content', async () => {
        await insertScanTrack(5, { title: '太平門', audio_key: mediaKey('05 a.m4a') });
        await insertLyrics('komorebi-05');
        await putMediaFiles(['05 a.m4a']);
        await putMedia('05 a.txt', '太平門門\n曲：RubberBand');
        const [text] = (await previewOf()).songTexts;
        expect(text).toMatchObject({
            trackId: 'komorebi-05',
            no: 5,
            change: 'replace',
            title: '太平門門',
            titleChanged: true,
            removesLyrics: true,
            lineCount: 0,
            synced: null,
            errors: [],
        });
    });

    it('should call a file applied before and unchanged same without reading it', async () => {
        const etag = await putMedia('05 a.txt', TEXT_05);
        await insertScanTrack(5, { text_source_etag: etag });
        await putMediaFiles(['05 a.m4a']);
        const [text] = (await previewOf()).songTexts;
        expect(text).toEqual({
            trackId: 'komorebi-05',
            no: 5,
            key: mediaKey('05 a.txt'),
            etag,
            bytes: new TextEncoder().encode(TEXT_05).length,
            change: 'same',
        });
    });

    // CR-007（D71）：冇手動指定，manualKept / manualMissing 永遠係空（T-105 拎走呢兩個欄）
    it('should match media and list missing audio', async () => {
        await insertScanTrack(1);
        await insertScanTrack(9, { title: '一杯', audio_key: mediaKey('09 一杯.m4a') });
        await insertScanTrack(3);
        await putMediaFiles(['01 a.m4a', '03 a.txt']);
        const preview = await previewOf();
        expect(preview.matched).toEqual([
            {
                trackId: 'komorebi-01',
                no: 1,
                kind: 'audio',
                key: mediaKey('01 a.m4a'),
                bytes: 5,
                change: 'new',
            },
        ]);
        expect(preview.audioMissing).toEqual([
            {
                trackId: 'komorebi-09',
                no: 9,
                title: '一杯',
                key: mediaKey('09 一杯.m4a'),
                mvKey: null,
            },
        ]);
        expect(preview.manualKept).toEqual([]);
        expect(preview.manualMissing).toEqual([]);
        expect(preview.songTexts).toEqual([]);
    });
});

describe('GET /api/albums/:id/scan: covers', () => {
    it('should report the cover sources with their change and the current covers', async () => {
        const etag = await putMedia('cover.jpg');
        await putMedia('cover2.png');
        await env.DB.prepare('UPDATE albums SET cover_source_etag = ?').bind(etag).run();
        const preview = await previewOf();
        expect(preview.cover).toEqual({
            key: mediaKey('cover.jpg'),
            etag,
            bytes: 5,
            change: 'same',
            hasCover: false,
        });
        expect(preview.cover2).toMatchObject({ key: mediaKey('cover2.png'), change: 'new' });
    });

    it('should skip a second cover without a first one', async () => {
        await putMediaFiles(['cover2.jpg']);
        const preview = await previewOf();
        expect(preview.cover2).toBeNull();
        expect(preview.skipped[0]).toMatchObject({ kind: 'cover2', reason: 'NO_FIRST_COVER' });
    });

    it('should say the first cover has two files when cover.jpg and cover.png both exist', async () => {
        await putMediaFiles(['cover.jpg', 'cover.png', 'cover2.jpg']);
        const preview = await previewOf();
        expect(preview.skipped).toEqual([
            {
                key: mediaKey('cover2.jpg'),
                kind: 'cover2',
                reason: 'FIRST_COVER_CONFLICT',
                message: zhHant.scan.reasons.FIRST_COVER_CONFLICT,
            },
        ]);
    });
});

describe('GET /api/albums/:id/scan: reading texts in batches', () => {
    const fill = async (count: number) => {
        const numbers = Array.from({ length: count }, (_, index) => index + 1);
        const names = numbers.flatMap((no) => [`${String(no).padStart(3, '0')} s.m4a`]);
        await putMediaFiles(names);
        await Promise.all(
            numbers.map((no) => putMedia(`${String(no).padStart(3, '0')} s.txt`, `歌 ${no}`)),
        );
    };

    it('should read at most the limit of texts and say where to continue', async () => {
        await fill(SCAN_TEXT_READS_MAX + 2);
        const preview = await previewOf();
        expect(preview).toMatchObject({ more: true, nextFrom: SCAN_TEXT_READS_MAX + 1 });
        const last = preview.newTracks[SCAN_TEXT_READS_MAX];
        expect(last).toMatchObject({ titleSource: 'pending', title: 's' });
        expect(last.text).toMatchObject({ pending: true });
        expect(preview.newTracks[0]).toMatchObject({ title: '歌 1', titleSource: 'text' });
    });

    it('should read from the given number on and finish the batch', async () => {
        await fill(SCAN_TEXT_READS_MAX + 2);
        const preview = await previewOf(`?from=${SCAN_TEXT_READS_MAX + 1}`);
        expect(preview).toMatchObject({ more: false, nextFrom: null });
        expect(preview.newTracks[0]).toMatchObject({ titleSource: 'pending' });
        expect(preview.newTracks[SCAN_TEXT_READS_MAX + 1]).toMatchObject({ titleSource: 'text' });
    });
});
