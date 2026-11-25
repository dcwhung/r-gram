/*
 * API-031 套用掃描結果（T-025；Technical Spec「掃描嘅設計 → 套用」、CR-005、CR-006「掃描建立歌曲」）：
 * 只做 body 列出（管理員確認咗）嘅項目；每項重新核對媒體 bucket（ETag、仲喺唔喺度、音檔做錨），一項失敗唔影響其他；
 * 歌曲文字行同 API-041 一樣嘅儲存（清走歌詞要 force），記低 text_source_etag；永遠唔刪歌；最後生成一次 catalog
 */
import { SCAN_APPLY_MAX_ITEMS } from '../src/config';
import { countOf, insertLyrics, json } from './albumFixtures';
import { putText } from './trackFixtures';
import {
    insertScanTrack,
    mediaKey,
    previewOf,
    putMedia,
    putMediaFiles,
    scanApply,
    seedScanAlbum,
    type Loose,
} from './scanFixtures';
import { lyricsFiles, lyricsRow, trackRow } from './trackFixtures';

const TEXT_05 = '太平門\n曲：RubberBand\n詞：Tim Lui\n\n[00:01.00]第一句\n[00:05.00]第二句';

const apply = async (body: unknown) => {
    const response = await scanApply(body);
    return { status: response.status, body: await json<Loose>(response) };
};

const detailsOf = (body: Loose) => body.error.details as Loose[];

beforeEach(async () => {
    await seedScanAlbum();
});

describe('POST /api/albums/:id/scan/apply: request shape', () => {
    it('should answer 404 NOT_FOUND for an unknown album', async () => {
        const response = await scanApply({ create: [] }, 'no-such-album');
        expect(response.status).toBe(404);
    });

    it('should reject a body that is not an object or has unknown keys', async () => {
        expect(detailsOf((await apply([])).body)[0]).toMatchObject({ reason: 'NOT_AN_OBJECT' });
        const unknown = await apply({ covers: [] });
        expect(unknown.status).toBe(400);
        expect(detailsOf(unknown.body)[0]).toMatchObject({
            path: 'covers',
            reason: 'NOT_EDITABLE',
        });
    });

    it('should reject lists that are not lists or are too long', async () => {
        const notList = await apply({ create: {} });
        expect(detailsOf(notList.body)[0]).toMatchObject({ path: 'create', reason: 'NOT_A_LIST' });
        const items = Array.from({ length: SCAN_APPLY_MAX_ITEMS + 1 }, (_, index) => ({
            no: index + 1,
            audioKey: mediaKey(`${index + 1} a.m4a`),
        }));
        const tooMany = await apply({ create: items });
        expect(detailsOf(tooMany.body)[0]).toMatchObject({
            path: 'create',
            reason: 'TOO_MANY_ITEMS',
            message: expect.stringContaining(String(SCAN_APPLY_MAX_ITEMS)),
        });
    });

    it('should point at the field of an item with the wrong shape', async () => {
        const { status, body } = await apply({
            create: [{ no: 0, audioKey: mediaKey('01 a.m4a') }],
            media: [{ trackId: 'komorebi-01', kind: 'cover', key: mediaKey('01 a.m4a') }],
        });
        expect(status).toBe(400);
        expect(detailsOf(body)).toEqual([
            { path: 'media[0].kind', reason: 'INVALID_VALUE', message: expect.any(String) },
            { path: 'create[0].no', reason: 'INVALID_NUMBER', message: expect.any(String) },
        ]);
    });

    it('should reject keys outside the album folder, wrong files and foreign tracks', async () => {
        await insertScanTrack(1);
        const { body } = await apply({
            create: [
                { no: 2, audioKey: 'album-02-beaming/02 a.m4a' },
                { no: 3, audioKey: mediaKey('04 a.m4a') },
                { no: 5, audioKey: mediaKey('05 a.txt') },
            ],
            songTexts: [{ trackId: 'apollo-18-01', key: mediaKey('01 a.txt'), etag: '"x"' }],
        });
        expect(detailsOf(body).map(({ path, reason }) => `${path}:${reason}`)).toEqual([
            'songTexts[0].trackId:NOT_IN_ALBUM',
            'create[0].audioKey:NOT_IN_FOLDER',
            'create[1].audioKey:WRONG_FILE',
            'create[2].audioKey:WRONG_FILE',
        ]);
    });

    it('should reject the same number twice in create', async () => {
        const item = { no: 1, audioKey: mediaKey('01 a.m4a') };
        const { body } = await apply({ create: [item, item] });
        expect(detailsOf(body)[0]).toMatchObject({
            path: 'create[1].no',
            reason: 'DUPLICATE_ITEM',
        });
    });
});

describe('POST /api/albums/:id/scan/apply: duplicate items', () => {
    it('should reject the same track twice in media, songTexts or clearAudio', async () => {
        await insertScanTrack(1);
        const audio = { trackId: 'komorebi-01', kind: 'audio', key: mediaKey('01 a.m4a') };
        const text = { trackId: 'komorebi-01', key: mediaKey('01 a.txt'), etag: '"x"' };
        const clear = { trackId: 'komorebi-01', audioKey: mediaKey('01 a.m4a') };
        const { status, body } = await apply({
            media: [audio, { ...audio, kind: 'mv', key: mediaKey('01 a.mp4') }, audio],
            songTexts: [text, text],
            clearAudio: [clear, clear],
        });
        expect(status).toBe(400);
        expect(detailsOf(body).map(({ path, reason }) => `${path}:${reason}`)).toEqual([
            'media[2].trackId:DUPLICATE_ITEM',
            'songTexts[1].trackId:DUPLICATE_ITEM',
            'clearAudio[1].trackId:DUPLICATE_ITEM',
        ]);
    });
});

describe('POST /api/albums/:id/scan/apply: create', () => {
    it('should create the track from its audio, MV and song text and rebuild the catalog', async () => {
        await putMediaFiles(['05 太平門.m4a', '05 太平門.mp4']);
        const etag = await putMedia('05 太平門.txt', TEXT_05);
        const { status, body } = await apply({
            create: [
                {
                    no: 5,
                    audioKey: mediaKey('05 太平門.m4a'),
                    mvKey: mediaKey('05 太平門.mp4'),
                    text: { key: mediaKey('05 太平門.txt'), etag },
                },
            ],
        });
        expect(status).toBe(200);
        expect(body.create).toEqual([
            { no: 5, ok: true, trackId: 'komorebi-05', textApplied: true },
        ]);
        expect(body.catalog).toMatchObject({ ok: true, trackCount: 1 });
        expect(await trackRow('komorebi-05')).toMatchObject({
            album_id: 'komorebi',
            no: 5,
            title: '太平門',
            composer: 'RubberBand',
            lyricist: 'Tim Lui',
            audio_key: mediaKey('05 太平門.m4a'),
            audio_manual: 0,
            mv_key: mediaKey('05 太平門.mp4'),
            text_source_etag: etag,
        });
        expect(await lyricsRow('komorebi-05')).toMatchObject({ synced: 1, line_count: 2 });
        expect(await lyricsFiles()).toHaveLength(1);
    });

    it('should title a track without a text after its audio file name', async () => {
        await putMediaFiles(['07 我永遠記得.mp3']);
        const { body } = await apply({
            create: [{ no: 7, audioKey: mediaKey('07 我永遠記得.mp3') }],
        });
        expect(body.create[0]).toMatchObject({ ok: true, textApplied: false });
        expect(await trackRow('komorebi-07')).toMatchObject({
            title: '我永遠記得',
            text_source_etag: null,
            mv_key: null,
        });
    });

    it('should still create the track when its text has errors, without the text', async () => {
        await putMediaFiles(['03 Hero.m4a']);
        const etag = await putMedia('03 Hero.txt', 'Hero\n\n[00:01.00]一\n二');
        const { body } = await apply({
            create: [
                {
                    no: 3,
                    audioKey: mediaKey('03 Hero.m4a'),
                    text: { key: mediaKey('03 Hero.txt'), etag },
                },
            ],
        });
        expect(body.create[0]).toMatchObject({
            ok: true,
            trackId: 'komorebi-03',
            textApplied: false,
            details: [{ line: 4, reason: 'MIXED_TIMESTAMPS', message: expect.any(String) }],
        });
        expect(await trackRow('komorebi-03')).toMatchObject({
            title: 'Hero',
            text_source_etag: null,
        });
    });

    it('should not create a track whose number is taken, whose audio left or whose text changed', async () => {
        await insertScanTrack(1);
        await putMediaFiles(['01 a.m4a', '03 c.m4a']);
        const etag = await putMedia('03 c.txt', '舊');
        await putMedia('03 c.txt', '新');
        const { body } = await apply({
            create: [
                { no: 1, audioKey: mediaKey('01 a.m4a') },
                { no: 2, audioKey: mediaKey('02 gone.m4a') },
                {
                    no: 3,
                    audioKey: mediaKey('03 c.m4a'),
                    text: { key: mediaKey('03 c.txt'), etag },
                },
            ],
        });
        expect(body.create.map((item: Loose) => [item.no, item.ok, item.code])).toEqual([
            [1, false, 'NUMBER_TAKEN'],
            [2, false, 'STALE'],
            [3, false, 'STALE'],
        ]);
        expect(body.create[0].message).toEqual(expect.any(String));
        expect(await countOf('tracks')).toBe(1);
    });

    it('should fall back to a random id when the numbered id is already used', async () => {
        // 舊歌 komorebi-05 改咗歌號做 6：第 5 首係新歌，id 唔可以再用 komorebi-05
        await insertScanTrack(6, { id: 'komorebi-05' });
        await putMediaFiles(['05 a.m4a']);
        const { body } = await apply({ create: [{ no: 5, audioKey: mediaKey('05 a.m4a') }] });
        expect(body.create[0].trackId).toMatch(/^komorebi-[a-z0-9]{6}$/);
    });

    it('should leave nothing to create or update on the next scan', async () => {
        await putMediaFiles(['05 a.m4a', 'cover.jpg']);
        const etag = await putMedia('05 a.txt', TEXT_05);
        await apply({
            create: [
                {
                    no: 5,
                    audioKey: mediaKey('05 a.m4a'),
                    text: { key: mediaKey('05 a.txt'), etag },
                },
            ],
        });
        const preview = await previewOf();
        expect(preview.newTracks).toEqual([]);
        expect(preview.songTexts[0]).toMatchObject({ change: 'same' });
        expect(preview.matched[0]).toMatchObject({ kind: 'audio', change: 'same' });
    });
});

describe('POST /api/albums/:id/scan/apply: song texts', () => {
    const withText = async (text: string) => {
        await putMediaFiles(['05 a.m4a']);
        return putMedia('05 a.txt', text);
    };

    it('should save the text like API-041 and remember its etag', async () => {
        await insertScanTrack(5, { audio_key: mediaKey('05 a.m4a') });
        const etag = await withText(TEXT_05);
        const { body } = await apply({
            songTexts: [{ trackId: 'komorebi-05', key: mediaKey('05 a.txt'), etag }],
        });
        expect(body.songTexts).toEqual([{ trackId: 'komorebi-05', ok: true }]);
        expect(await trackRow('komorebi-05')).toMatchObject({
            title: '太平門',
            text_source_etag: etag,
        });
        expect(await lyricsRow('komorebi-05')).toMatchObject({ line_count: 2 });
    });

    it('should need force before clearing the stored lyrics', async () => {
        await insertScanTrack(5);
        await insertLyrics('komorebi-05');
        const etag = await withText('太平門\n曲：RubberBand');
        const item = { trackId: 'komorebi-05', key: mediaKey('05 a.txt'), etag };
        const refused = await apply({ songTexts: [item] });
        expect(refused.body.songTexts[0]).toMatchObject({ ok: false, code: 'LYRICS_REMOVED' });
        expect(await lyricsRow('komorebi-05')).not.toBeNull();
        const forced = await apply({ songTexts: [{ ...item, force: true }] });
        expect(forced.body.songTexts[0]).toEqual({ trackId: 'komorebi-05', ok: true });
        expect(await lyricsRow('komorebi-05')).toBeNull();
    });

    it('should refuse a changed file, a file with errors and a number without audio', async () => {
        await insertScanTrack(5);
        await insertScanTrack(6);
        const etag = await withText(TEXT_05);
        const bad = await putMedia('06 b.txt', '歌\n\n[00:01.00]一\n二');
        await putMedia('04 x.txt', TEXT_05);
        await insertScanTrack(4);
        const { body } = await apply({
            songTexts: [
                { trackId: 'komorebi-05', key: mediaKey('05 a.txt'), etag: '"old"' },
                { trackId: 'komorebi-06', key: mediaKey('06 b.txt'), etag: bad },
                { trackId: 'komorebi-04', key: mediaKey('04 x.txt'), etag },
            ],
        });
        expect(body.songTexts.map((item: Loose) => item.code)).toEqual([
            'STALE',
            'NO_AUDIO',
            'NO_AUDIO',
        ]);
    });

    it('should list the line errors of an anchored file', async () => {
        await insertScanTrack(6);
        await putMediaFiles(['06 b.m4a']);
        const etag = await putMedia('06 b.txt', '歌\n\n[00:01.00]一\n二');
        const { body } = await apply({
            songTexts: [{ trackId: 'komorebi-06', key: mediaKey('06 b.txt'), etag }],
        });
        expect(body.songTexts[0]).toMatchObject({
            ok: false,
            code: 'VALIDATION_ERROR',
            details: [{ line: 4, reason: 'MIXED_TIMESTAMPS' }],
        });
    });

    it('should keep the etag when the admin saves the text by hand afterwards', async () => {
        await insertScanTrack(5, { audio_key: mediaKey('05 a.m4a') });
        const etag = await withText(TEXT_05);
        await apply({ songTexts: [{ trackId: 'komorebi-05', key: mediaKey('05 a.txt'), etag }] });
        const updatedAt = (await trackRow('komorebi-05'))?.updated_at as string;
        expect((await putText('komorebi-05', '人手', updatedAt, '?force=1')).status).toBe(200);
        expect((await trackRow('komorebi-05'))?.text_source_etag).toBe(etag);
    });
});

describe('POST /api/albums/:id/scan/apply: media and missing audio', () => {
    it('should link matched files and leave manual assignments alone', async () => {
        await insertScanTrack(1);
        await insertScanTrack(2, { audio_key: 'other/x.m4a', audio_manual: 1 });
        await putMediaFiles(['01 a.m4a', '01 a.mp4', '02 b.m4a', '03 c.mp4']);
        await insertScanTrack(3);
        const { body } = await apply({
            media: [
                { trackId: 'komorebi-01', kind: 'audio', key: mediaKey('01 a.m4a') },
                { trackId: 'komorebi-01', kind: 'mv', key: mediaKey('01 a.mp4') },
                { trackId: 'komorebi-02', kind: 'audio', key: mediaKey('02 b.m4a') },
                { trackId: 'komorebi-03', kind: 'mv', key: mediaKey('03 c.mp4') },
            ],
        });
        expect(body.media).toEqual({
            applied: 2,
            skipped: [
                {
                    trackId: 'komorebi-02',
                    kind: 'audio',
                    code: 'MANUAL_KEPT',
                    message: expect.any(String),
                },
                {
                    trackId: 'komorebi-03',
                    kind: 'mv',
                    code: 'NO_AUDIO',
                    message: expect.any(String),
                },
            ],
        });
        expect(await trackRow('komorebi-01')).toMatchObject({
            audio_key: mediaKey('01 a.m4a'),
            mv_key: mediaKey('01 a.mp4'),
            audio_manual: 0,
        });
        expect((await trackRow('komorebi-02'))?.audio_key).toBe('other/x.m4a');
    });

    it('should not link a file that is gone', async () => {
        await insertScanTrack(1);
        const { body } = await apply({
            media: [{ trackId: 'komorebi-01', kind: 'audio', key: mediaKey('01 a.m4a') }],
        });
        expect(body.media).toMatchObject({ applied: 0, skipped: [{ code: 'STALE' }] });
    });

    it('should only clear the links of audio that left the folder, keeping the track', async () => {
        await insertScanTrack(9, { audio_key: mediaKey('09 a.m4a'), mv_key: mediaKey('09 a.mp4') });
        await insertScanTrack(8, { audio_key: mediaKey('08 a.m4a') });
        await insertScanTrack(7, { audio_key: mediaKey('07 a.m4a') });
        await putMediaFiles(['07 a.m4a']);
        const { body } = await apply({
            clearAudio: [
                { trackId: 'komorebi-09', audioKey: mediaKey('09 a.m4a') },
                { trackId: 'komorebi-08', audioKey: mediaKey('08 other.m4a') },
                { trackId: 'komorebi-07', audioKey: mediaKey('07 a.m4a') },
            ],
        });
        expect(body.clearAudio.map((item: Loose) => [item.trackId, item.ok, item.code])).toEqual([
            ['komorebi-09', true, undefined],
            ['komorebi-08', false, 'STALE'],
            ['komorebi-07', false, 'STALE'],
        ]);
        expect(await trackRow('komorebi-09')).toMatchObject({ audio_key: null, mv_key: null });
        expect(await countOf('tracks')).toBe(3);
    });

    it('should count a manually assigned audio as the anchor for the text and the MV', async () => {
        await insertScanTrack(2, { audio_key: 'other/x.m4a', audio_manual: 1 });
        await putMediaFiles(['02 b.mp4']);
        const etag = await putMedia('02 b.txt', TEXT_05);
        const { body } = await apply({
            media: [{ trackId: 'komorebi-02', kind: 'mv', key: mediaKey('02 b.mp4') }],
            songTexts: [{ trackId: 'komorebi-02', key: mediaKey('02 b.txt'), etag }],
        });
        expect(body.media).toEqual({ applied: 1, skipped: [] });
        expect(body.songTexts).toEqual([{ trackId: 'komorebi-02', ok: true }]);
        expect(await trackRow('komorebi-02')).toMatchObject({
            audio_key: 'other/x.m4a',
            mv_key: mediaKey('02 b.mp4'),
            title: '太平門',
        });
    });

    it('should never clear a manually assigned audio', async () => {
        await insertScanTrack(9, { audio_key: mediaKey('09 a.m4a'), audio_manual: 1 });
        const { body } = await apply({
            clearAudio: [{ trackId: 'komorebi-09', audioKey: mediaKey('09 a.m4a') }],
        });
        expect(body.clearAudio[0]).toMatchObject({ ok: false, code: 'STALE' });
        expect(await trackRow('komorebi-09')).toMatchObject({
            audio_key: mediaKey('09 a.m4a'),
            audio_manual: 1,
        });
    });

    it('should keep a manually assigned MV when clearing the audio', async () => {
        await insertScanTrack(9, {
            audio_key: mediaKey('09 a.m4a'),
            mv_key: 'other/v.mp4',
            mv_manual: 1,
        });
        const { body } = await apply({
            clearAudio: [{ trackId: 'komorebi-09', audioKey: mediaKey('09 a.m4a') }],
        });
        expect(body.clearAudio[0]).toMatchObject({ ok: true });
        expect(await trackRow('komorebi-09')).toMatchObject({
            audio_key: null,
            mv_key: 'other/v.mp4',
            mv_manual: 1,
        });
    });

    it('should clear the matched MV link too when the MV file is still in the folder', async () => {
        await insertScanTrack(9, { audio_key: mediaKey('09 a.m4a'), mv_key: mediaKey('09 a.mp4') });
        await putMediaFiles(['09 a.mp4']);
        const { body } = await apply({
            clearAudio: [{ trackId: 'komorebi-09', audioKey: mediaKey('09 a.m4a') }],
        });
        expect(body.clearAudio[0]).toMatchObject({ ok: true });
        // S-135：冇音檔就冇 MV；歌本身（歌名、credit、歌詞、id）留低
        expect(await trackRow('komorebi-09')).toMatchObject({
            id: 'komorebi-09',
            title: 'Track komorebi-09',
            audio_key: null,
            mv_key: null,
        });
    });

    it('should answer with empty results for the lists it was not given', async () => {
        const { status, body } = await apply({});
        expect(status).toBe(200);
        expect(body).toMatchObject({
            media: { applied: 0, skipped: [] },
            create: [],
            songTexts: [],
            clearAudio: [],
        });
    });
});
