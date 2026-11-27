/*
 * migrations/0002_reread_song_texts.sql（擁有人決定 2026-11-27：曲 / 詞 / 編 / 監認 prefix）：
 * 清走 tracks.text_source_etag，下一次同步重新讀、重新解析每個歌曲文字檔，重寫 credit 同歌詞；
 * 同步照舊唔寫、唔刪媒體 bucket；舊歌詞 JSON 等 catalog 生成成功先刪。文字全部係佔位，唔係真資料
 */
import { env } from 'cloudflare:test';
import {
    FOLDER,
    mediaKey,
    mediaWith,
    putKomorebi,
    putMedia,
    recordedMedia,
    syncFolder,
    type Loose,
} from './syncFixtures';
import { LYRICS_PREFIX, lyricsFiles, lyricsRow, trackRow } from './trackFixtures';

const MIGRATION = '0002_reread_song_texts.sql';
const TRACK_05 = 'komorebi-05';
const TRACK_01 = 'komorebi-01';

/** 擁有人嘅格式：歌名、空行、曲詞編監、空行、歌詞 */
const OWNER_TEXT =
    '太平門\n\n曲：作曲者甲\n詞：填詞者乙\n編：編曲者丙\n監：監製丁\n\n第一句\n第二句';
/** 舊 parser（標籤段遇到空行就完）匯入 OWNER_TEXT 嘅結果：冇 credit，標籤行變咗歌詞 */
const OLD_SOURCE = '曲：作曲者甲\n詞：填詞者乙\n編：編曲者丙\n監：監製丁\n\n第一句\n第二句';
const OLD_LINE_COUNT = 6;
const OLD_JSON_NAME = '0123456789abcdef.json';

const CREDITS = {
    composer: '作曲者甲',
    lyricist: '填詞者乙',
    arranger: '編曲者丙',
    producer: '監製丁',
};
const NO_CREDITS = { composer: null, lyricist: null, arranger: null, producer: null };

const CLEAR_CREDITS = `UPDATE tracks SET composer = NULL, lyricist = NULL, arranger = NULL, producer = NULL
    WHERE id = ?`;
const OLD_LYRICS = 'UPDATE lyrics SET source = ?, json_name = ?, line_count = ? WHERE track_id = ?';

/** D1 同 R2 變返舊 parser 匯入嘅樣（第 5 首）：credit 冇咗、歌詞連標籤行、歌詞 JSON 係舊檔 */
const storeOldImport = async () => {
    await env.CATALOG.delete(`${LYRICS_PREFIX}${(await lyricsRow(TRACK_05))?.json_name}`);
    await env.CATALOG.put(`${LYRICS_PREFIX}${OLD_JSON_NAME}`, '{"synced":false,"lines":[]}');
    await env.DB.batch([
        env.DB.prepare(CLEAR_CREDITS).bind(TRACK_05),
        env.DB.prepare(OLD_LYRICS).bind(OLD_SOURCE, OLD_JSON_NAME, OLD_LINE_COUNT, TRACK_05),
    ]);
};

/** 同 `wrangler d1 migrations apply` 一樣嘅 SQL（vitest.config.ts 用 readD1Migrations() 讀 migrations/） */
const applyMigration = async () => {
    const migration = env.TEST_MIGRATIONS.find(({ name }) => name === MIGRATION);
    if (!migration) throw new Error(`${MIGRATION} is missing`);
    await env.DB.batch(migration.queries.map((query) => env.DB.prepare(query)));
};

const allTracks = async () =>
    (await env.DB.prepare('SELECT * FROM tracks ORDER BY id').all<Loose>()).results;

const creditsOf = async (id: string) => {
    const row = await trackRow(id);
    return {
        composer: row?.composer,
        lyricist: row?.lyricist,
        arranger: row?.arranger,
        producer: row?.producer,
    };
};

beforeEach(async () => {
    await putKomorebi();
    await putMedia('05 太平門.txt', OWNER_TEXT);
    await putMedia('01 下一位參賽者.txt', '下一位參賽者\n曲：作曲者甲\n\n第一句');
    await syncFolder();
    await storeOldImport();
});

describe('migration 0002: re-read every song text on the next sync', () => {
    it('should be needed: a sync without it does not read unchanged files again', async () => {
        const { bindings, calls } = mediaWith();
        const { body } = await syncFolder(FOLDER, '', bindings);
        expect(body).toMatchObject({ updated: [], unchanged: 5 });
        expect(calls.get).toBeUndefined();
        expect(await creditsOf(TRACK_05)).toEqual(NO_CREDITS);
    });

    it('should clear text_source_etag of every track and change nothing else', async () => {
        const before = await allTracks();
        expect(before.filter((row) => row.text_source_etag !== null)).toHaveLength(2);
        await applyMigration();
        const cleared = before.map((row) => ({ ...row, text_source_etag: null }));
        expect(await allTracks()).toEqual(cleared);
    });

    it('should re-read and re-parse every song text on the next sync', async () => {
        await applyMigration();
        const { bindings, puts, calls } = recordedMedia();
        const { status, body } = await syncFolder(FOLDER, '', bindings);
        expect(status).toBe(200);
        expect(body.updated.map(({ no }: Loose) => no)).toEqual([1, 5]);
        expect(body.checks).toEqual([]);
        expect(calls.get).toBe(2);
        expect(await creditsOf(TRACK_05)).toEqual(CREDITS);
        expect(await lyricsRow(TRACK_05)).toMatchObject({
            source: '第一句\n第二句',
            line_count: 2,
        });
        const etag = (await env.MEDIA.head(mediaKey('05 太平門.txt')))?.httpEtag;
        expect((await trackRow(TRACK_05))?.text_source_etag).toBe(etag);
        // 同步只讀媒體 bucket：唔寫返 `.txt`、唔刪檔
        expect(puts).toEqual([]);
        expect(calls.delete).toBeUndefined();
    });

    it('should write the new lyrics JSON and drop the old one once the catalog is rebuilt', async () => {
        const kept = (await lyricsRow(TRACK_01))?.json_name;
        await applyMigration();
        const { body } = await syncFolder();
        expect(body.catalog).toMatchObject({ ok: true });
        const renamed = (await lyricsRow(TRACK_05))?.json_name;
        expect(renamed).not.toBe(OLD_JSON_NAME);
        expect((await lyricsRow(TRACK_01))?.json_name).toBe(kept);
        expect(await lyricsFiles()).toEqual([kept, renamed].sort());
    });

    it('should read only changed files again after the re-read', async () => {
        await applyMigration();
        await syncFolder();
        const { bindings, calls } = mediaWith();
        const { body } = await syncFolder(FOLDER, '', bindings);
        expect(body).toMatchObject({ updated: [], unchanged: 5 });
        expect(calls.get).toBeUndefined();
    });
});
