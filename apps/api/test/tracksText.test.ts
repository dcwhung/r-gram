/*
 * API-040 GET /api/tracks/:id/text、API-041 PUT /api/tracks/:id/text：成首歌嘅文字（Functional Spec D31、D32、D37）。
 * 儲存：parseSongText() → 有錯 400（逐行）/ 413 → 歌詞 JSON 寫 R2 → D1 一個 batch（tracks + lyrics）。
 * 清走現有歌詞要確認（D30：冇 ?force=1 回 409 LYRICS_REMOVED）；B-038 嘅提示；B-040 嘅 413 同 details 形狀
 */
import { env } from 'cloudflare:test';
import { SONG_TEXT_MAX_BYTES, SONG_TEXT_MAX_LINES } from '@r-gram/catalog';
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, api, insertTrack, json } from './albumFixtures';
import {
    LYRICS_NAME,
    LYRICS_PREFIX,
    detailsOf,
    getText,
    ifMatch,
    lyricsFile,
    lyricsFiles,
    lyricsRow,
    putText,
    seedAlbum,
    trackRow,
    type ErrorBody,
} from './trackFixtures';

const SONG = [
    '一早地下鐵',
    '曲：阿正',
    '詞：Tim Lui / 6號',
    '編：阿正',
    '監：RubberBand / 雷頌德',
    '',
    '[00:12.30]第一句歌詞',
    '[00:18.75]第二句歌詞',
].join('\n');

interface Saved {
    trackId: string;
    text: string;
    lineCount: number;
    synced: boolean | null;
    lyrics: string | null;
    updatedAt: string;
    track: Record<string, unknown>;
    hints: Record<string, unknown>[];
}

beforeEach(seedAlbum);

describe('PUT /api/tracks/:id/text: saving', () => {
    it('should store title, credits and timed lyrics in one go', async () => {
        const response = await putText('apollo-18-01', SONG);
        expect(response.status).toBe(200);
        const body = await json<Saved>(response);
        expect(body).toMatchObject({
            trackId: 'apollo-18-01',
            text: SONG,
            lineCount: 2,
            synced: true,
            hints: [],
        });
        expect(body.lyrics).toMatch(LYRICS_NAME);
        expect(body.updatedAt > NOW).toBe(true);
        expect(body.track).toMatchObject({
            id: 'apollo-18-01',
            no: 1,
            title: '一早地下鐵',
            subtitle: null,
            credits: {
                composer: '阿正',
                lyricist: 'Tim Lui / 6號',
                arranger: '阿正',
                producer: 'RubberBand / 雷頌德',
            },
            lyrics: { synced: true, lineCount: 2 },
            updatedAt: body.updatedAt,
        });
        expect(await trackRow('apollo-18-01')).toMatchObject({
            title: '一早地下鐵',
            subtitle: null,
            producer: 'RubberBand / 雷頌德',
            updated_at: body.updatedAt,
        });
        expect(await lyricsRow('apollo-18-01')).toMatchObject({
            source: '[00:12.30]第一句歌詞\n[00:18.75]第二句歌詞',
            synced: 1,
            json_name: body.lyrics,
            line_count: 2,
            updated_at: body.updatedAt,
        });
    });

    it('should write the lyrics JSON to R2 under its content hash', async () => {
        const body = await json<Saved>(await putText('apollo-18-01', SONG));
        expect(await lyricsFiles()).toEqual([body.lyrics]);
        expect(await lyricsFile(body.lyrics ?? '')).toEqual({
            synced: true,
            lines: [
                { t: 12_300, text: '第一句歌詞' },
                { t: 18_750, text: '第二句歌詞' },
            ],
        });
        const object = await env.CATALOG.head(`${LYRICS_PREFIX}${body.lyrics ?? ''}`);
        expect(object?.httpMetadata?.contentType).toBe('application/json');
    });

    it('should store plain lyrics as synced: false (D32)', async () => {
        const body = await json<Saved>(await putText('apollo-18-01', '歌名\n\n第一句\n\n\n第二句'));
        expect(body).toMatchObject({ synced: false, lineCount: 3 });
        expect(await lyricsFile(body.lyrics ?? '')).toEqual({
            synced: false,
            lines: [{ text: '第一句' }, { text: '' }, { text: '第二句' }],
        });
        expect((await lyricsRow('apollo-18-01'))?.synced).toBe(0);
    });

    it('should answer with the normalised text that refills the text box', async () => {
        const messy = '\uFEFF\r\n  歌名  \r\n詞:  林夕 \r\n曲 ： 阿正\r\n\r\n\r\n第一句  \r\n';
        const body = await json<Saved>(await putText('apollo-18-01', messy));
        expect(body.text).toBe('歌名\n曲：阿正\n詞：林夕\n\n第一句');
        expect((await getText('apollo-18-01')).text).toBe(body.text);
    });

    it('should save a title with no labels and no lyrics, clearing the credits', async () => {
        await putText('apollo-18-01', SONG);
        const { updatedAt } = await getText('apollo-18-01');
        const response = await putText('apollo-18-01', '新歌名', updatedAt, '?force=1');
        expect(response.status).toBe(200);
        expect(await json<Saved>(response)).toMatchObject({
            text: '新歌名',
            lineCount: 0,
            synced: null,
            lyrics: null,
            track: {
                title: '新歌名',
                subtitle: null,
                credits: { composer: null, lyricist: null, arranger: null, producer: null },
                lyrics: null,
            },
        });
        expect(await lyricsRow('apollo-18-01')).toBeNull();
    });

    it('should keep the same R2 file for identical lyrics on two tracks', async () => {
        const first = await json<Saved>(await putText('apollo-18-01', SONG));
        const second = await json<Saved>(await putText('apollo-18-02', SONG));
        expect(second.lyrics).toBe(first.lyrics);
        expect(await lyricsFiles()).toEqual([first.lyrics]);
    });
});

describe('PUT /api/tracks/:id/text: lyrics files that are no longer used', () => {
    it('should remove the old lyrics JSON when the lyrics change', async () => {
        const first = await json<Saved>(await putText('apollo-18-01', SONG));
        const changed = SONG.replace('第二句歌詞', '改過的第二句');
        const second = await json<Saved>(await putText('apollo-18-01', changed, first.updatedAt));
        expect(second.lyrics).not.toBe(first.lyrics);
        expect(await lyricsFiles()).toEqual([second.lyrics]);
    });

    it('should remove the lyrics JSON when the lyrics are cleared', async () => {
        const first = await json<Saved>(await putText('apollo-18-01', SONG));
        await putText('apollo-18-01', '一早地下鐵', first.updatedAt, '?force=1');
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should keep a lyrics JSON that another track still uses', async () => {
        const first = await json<Saved>(await putText('apollo-18-01', SONG));
        await putText('apollo-18-02', SONG);
        await putText('apollo-18-01', '一早地下鐵', first.updatedAt, '?force=1');
        expect(await lyricsFiles()).toEqual([first.lyrics]);
    });
});

describe('PUT /api/tracks/:id/text: clearing existing lyrics needs a confirmation (D30)', () => {
    it('should answer 409 LYRICS_REMOVED and change nothing without ?force=1', async () => {
        const first = await json<Saved>(await putText('apollo-18-01', SONG));
        const response = await putText('apollo-18-01', '一早地下鐵', first.updatedAt);
        expect(response.status).toBe(409);
        expect(await json(response)).toEqual({
            error: {
                code: 'LYRICS_REMOVED',
                message: zhHant.tracks.errors.lyricsRemoved,
                details: [{ type: 'lyrics', trackId: 'apollo-18-01', lineCount: 2 }],
            },
        });
        expect((await lyricsRow('apollo-18-01'))?.json_name).toBe(first.lyrics);
        expect((await trackRow('apollo-18-01'))?.updated_at).toBe(first.updatedAt);
    });

    it('should not ask when the track has no lyrics to lose', async () => {
        expect((await putText('apollo-18-01', '一早地下鐵')).status).toBe(200);
    });

    it('should not take any force value other than 1', async () => {
        const first = await json<Saved>(await putText('apollo-18-01', SONG));
        for (const query of ['?force=0', '?force=true', '?force=']) {
            const response = await putText('apollo-18-01', '一早地下鐵', first.updatedAt, query);
            expect(response.status, query).toBe(409);
        }
    });
});

describe('PUT /api/tracks/:id/text: validation', () => {
    it('should list every song-text error by line with reason and written-Chinese message', async () => {
        const text = '曲：阿正\n詞：甲\n詞：乙\n\n[00:01.00]a\nb';
        const response = await putText('apollo-18-01', text);
        expect(response.status).toBe(400);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe(zhHant.tracks.errors.invalid);
        expect(body.error.details).toEqual([
            {
                path: 'text',
                line: 1,
                reason: 'TITLE_REQUIRED',
                message: zhHant.tracks.reasons.TITLE_REQUIRED,
            },
            {
                path: 'text',
                line: 3,
                reason: 'DUPLICATE_LABEL',
                message: zhHant.tracks.reasons.DUPLICATE_LABEL,
            },
            {
                path: 'text',
                line: 6,
                reason: 'MIXED_TIMESTAMPS',
                message: zhHant.tracks.reasons.MIXED_TIMESTAMPS,
            },
        ]);
        expect((await trackRow('apollo-18-01'))?.updated_at).toBe(NOW);
        expect(await lyricsFiles()).toEqual([]);
    });

    // B-040：details 唔回出錯嗰行嘅原文（管理端手上有成段文字，按行號標示就得）
    it('should not echo the offending line back', async () => {
        const longLine = '長'.repeat(600);
        const details = await detailsOf(await putText('apollo-18-01', `歌名\n\n${longLine}`));
        expect(details).toHaveLength(1);
        expect(details[0]).toMatchObject({ line: 3, reason: 'LINE_TOO_LONG' });
        expect(JSON.stringify(details)).not.toContain('長長');
        expect(String(details[0]?.message)).toContain('500');
    });

    it('should report too many lines as line 0 with 400', async () => {
        const response = await putText('apollo-18-01', `歌名${'\n'.repeat(SONG_TEXT_MAX_LINES)}`);
        expect(response.status).toBe(400);
        expect(await detailsOf(response)).toMatchObject([{ line: 0, reason: 'TOO_MANY_LINES' }]);
    });

    // B-040：parser 第 0 行嘅 TOO_LARGE → 413
    it('should answer 413 TOO_LARGE above SONG_TEXT_MAX_BYTES, counted in UTF-8 bytes', async () => {
        const chinese = `歌名\n\n${'字'.repeat(Math.ceil(SONG_TEXT_MAX_BYTES / 3))}`;
        const response = await putText('apollo-18-01', chinese);
        expect(response.status).toBe(413);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('TOO_LARGE');
        expect(body.error.message).toContain('64');
        expect(body.error.message).not.toMatch(/[{}]/);
    });

    it('should answer 413 quickly for a huge body without parsing it', async () => {
        const huge = 'a'.repeat(SONG_TEXT_MAX_BYTES * 20);
        expect((await putText('apollo-18-01', huge)).status).toBe(413);
        const escaped = (count: number) => `{"text":"${'\\u0041'.repeat(count)}"}`;
        const raw = await api(
            'PUT',
            '/api/tracks/apollo-18-01/text',
            escaped(SONG_TEXT_MAX_BYTES * 2),
            ifMatch(),
        );
        expect(raw.status).toBe(413);
    });

    // 合法嘅文字可以每個字都寫成 \uXXXX：body 上限要容得下（唔可以當 413）
    it('should still read a fully escaped body whose text is within the limit', async () => {
        const raw = `{"text":"${'\\u0041'.repeat(SONG_TEXT_MAX_BYTES - 1)}"}`;
        const response = await api('PUT', '/api/tracks/apollo-18-01/text', raw, ifMatch());
        expect(response.status).toBe(400);
        expect(await detailsOf(response)).toMatchObject([{ line: 1, reason: 'TITLE_TOO_LONG' }]);
    });

    it('should require text as a string and refuse other fields', async () => {
        const missing = await api('PUT', '/api/tracks/apollo-18-01/text', {}, ifMatch());
        expect(await detailsOf(missing)).toMatchObject([{ path: 'text', reason: 'REQUIRED' }]);
        const notText = await api(
            'PUT',
            '/api/tracks/apollo-18-01/text',
            { text: 42, title: 'x' },
            ifMatch(),
        );
        expect(
            (await detailsOf(notText)).map((d) => `${String(d.path)}:${String(d.reason)}`),
        ).toEqual(['text:NOT_TEXT', 'title:NOT_EDITABLE']);
    });

    it('should answer VALIDATION_ERROR for a body that is not a JSON object', async () => {
        const response = await api('PUT', '/api/tracks/apollo-18-01/text', '"歌名"', ifMatch());
        expect(response.status).toBe(400);
        expect(await detailsOf(response)).toMatchObject([{ path: '$', reason: 'NOT_AN_OBJECT' }]);
    });

    it('should require If-Match', async () => {
        const response = await api('PUT', '/api/tracks/apollo-18-01/text', { text: '歌名' });
        expect(response.status).toBe(400);
        expect(await detailsOf(response)).toMatchObject([{ path: 'If-Match', reason: 'REQUIRED' }]);
    });
});

describe('PUT /api/tracks/:id/text: B-038 hint for labels after a blank line', () => {
    it('should save label-looking lines after a blank line as lyrics and say so', async () => {
        const text = '歌名\n\n曲：阿正\n詞：林夕\n\n第一句';
        const response = await putText('apollo-18-01', text);
        expect(response.status).toBe(200);
        const body = await json<Saved>(response);
        // API-012 嘅形狀：四項都冇係四個 null
        expect(body.track).toMatchObject({
            credits: { composer: null, lyricist: null, arranger: null, producer: null },
        });
        expect(body.hints).toEqual([
            {
                path: 'text',
                line: 3,
                reason: 'LABEL_AFTER_BLANK_LINE',
                message: zhHant.tracks.hints.LABEL_AFTER_BLANK_LINE,
            },
            {
                path: 'text',
                line: 4,
                reason: 'LABEL_AFTER_BLANK_LINE',
                message: zhHant.tracks.hints.LABEL_AFTER_BLANK_LINE,
            },
        ]);
    });
});

// CR-007（Functional Spec D72）：舊檔嘅「副題：」行照收，唔儲存，逐行提示
describe('PUT /api/tracks/:id/text: subtitle lines of old files', () => {
    it('should save the text without the subtitle and give a hint for its line', async () => {
        const response = await putText('apollo-18-01', '歌名\n副題：Live\n曲：阿正');
        expect(response.status).toBe(200);
        const body = await json<Saved>(response);
        expect(body.text).toBe('歌名\n曲：阿正');
        expect(body.track).toMatchObject({ title: '歌名', subtitle: null });
        expect(body.hints).toEqual([
            {
                path: 'text',
                line: 2,
                reason: 'SUBTITLE_IGNORED',
                message: zhHant.tracks.hints.SUBTITLE_IGNORED,
            },
        ]);
        expect((await trackRow('apollo-18-01'))?.subtitle).toBeNull();
    });
});

describe('PUT /api/tracks/:id/text: concurrency and missing tracks', () => {
    it('should answer 409 STALE for an old If-Match and keep the stored text', async () => {
        await putText('apollo-18-01', SONG);
        const response = await putText('apollo-18-01', '別的歌名');
        expect(response.status).toBe(409);
        expect((await json<ErrorBody>(response)).error).toMatchObject({
            code: 'STALE',
            message: zhHant.tracks.errors.stale,
        });
        expect((await getText('apollo-18-01')).text).toBe(SONG);
    });

    it('should let only one of two saves with the same If-Match win', async () => {
        const responses = await Promise.all([
            putText('apollo-18-01', '甲\n\n[00:01.00]甲'),
            putText('apollo-18-01', '乙\n\n乙'),
        ]);
        expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
        const winner = await json<Saved>(responses.find((r) => r.status === 200) as Response);
        expect((await getText('apollo-18-01')).text).toBe(winner.text);
        expect((await lyricsRow('apollo-18-01'))?.json_name).toBe(winner.lyrics);
        expect(await lyricsFiles()).toEqual([winner.lyrics]);
    });

    it('should answer 404 NOT_FOUND for an unknown track', async () => {
        const response = await putText('nope', '歌名');
        expect(response.status).toBe(404);
        expect((await json<ErrorBody>(response)).error).toEqual({
            code: 'NOT_FOUND',
            message: zhHant.tracks.errors.notFound,
        });
        expect(await lyricsFiles()).toEqual([]);
    });
});

describe('GET /api/tracks/:id/text', () => {
    it('should rebuild the text from the stored fields in the fixed order, without a subtitle', async () => {
        await insertTrack('apollo-18-09', 'apollo-18', 9, {
            title: '發現號',
            subtitle: 'Live',
            lyricist: '林夕',
            composer: '阿正',
        });
        expect(await getText('apollo-18-09')).toEqual({
            trackId: 'apollo-18-09',
            text: '發現號\n曲：阿正\n詞：林夕',
            updatedAt: NOW,
        });
    });

    it('should give back exactly what was saved', async () => {
        const saved = await json<Saved>(await putText('apollo-18-01', SONG));
        expect(await getText('apollo-18-01')).toEqual({
            trackId: 'apollo-18-01',
            text: SONG,
            updatedAt: saved.updatedAt,
        });
    });

    it('should answer 404 for an unknown track', async () => {
        expect((await api('GET', '/api/tracks/nope/text')).status).toBe(404);
    });
});
