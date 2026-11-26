/*
 * API-010 GET /api/albums、API-012 GET /api/albums/:id：列表、完整度、全站統計（FR-114、D35）、catalog 狀態。
 * CR-007（Technical Spec「API 一覽嘅變化」）：唯讀；次序固定（albumOrder）；字母盤標記由碟名計；
 * 每張碟有檢查結果（列表係數目，專輯頁係逐項）；冇唱片公司、預期資料夾名；歌冇副題、手動指定、參考欄
 */
import { checksOf } from '../src/albums/rows';
import { zhHant } from '../src/i18n/zh-Hant';
import {
    api,
    insertAlbum,
    insertAsset,
    insertCatalogState,
    insertLyrics,
    insertTrack,
    json,
} from './albumFixtures';

interface ListBody {
    albums: Record<string, unknown>[];
    stats: Record<string, number>;
    catalog: Record<string, unknown> | null;
}

const list = async () => json<ListBody>(await api('GET', '/api/albums'));

const CHECKS = [
    { level: 'warning', code: 'NO_INFO', params: {} },
    { level: 'error', code: 'AUDIO_NOT_LISTED', key: 'album-03-b/13 x.m4a', no: 13, params: {} },
];

/** 兩張碟：b 有 3 首歌（音檔 2、MV 1、歌詞 1）連封面同兩項檢查結果；a 冇歌 */
const seedTwoAlbums = async () => {
    await insertAsset('cover0000000000a.webp');
    await insertAlbum('b', 2, {
        cover: 'cover0000000000a.webp',
        title: 'Beaming',
        checks: JSON.stringify(CHECKS),
        // W-046：hasInfo 跟「用過 info.txt」嘅標記，唔跟只喺完整同步先記嘅 info_etag
        info_used: 1,
    });
    await insertAlbum('a', 1, { title: 'Apollo 18' });
    await insertTrack('b-01', 'b', 1, { audio_key: 'b/01 x.m4a', mv_key: 'b/01 x.mp4' });
    await insertTrack('b-02', 'b', 2, { audio_key: 'b/02 y.m4a' });
    await insertTrack('b-03', 'b', 3, { audio_key: '' });
    await insertLyrics('b-02');
};

describe('GET /api/albums', () => {
    it('should list albums in the fixed order with their read-only fields', async () => {
        await seedTwoAlbums();
        const body = await list();
        expect(body.albums.map((album) => album.id)).toEqual(['a', 'b']);
        expect(body.albums[1]).toEqual({
            id: 'b',
            title: 'Beaming',
            wheelKey: 'B',
            year: null,
            category: 'album',
            categoryNo: 3,
            accent: '#c8442b',
            cover: 'cover0000000000a.webp',
            coverSourceEtag: null,
            thumb: null,
            cover2: null,
            thumb2: null,
            cover2SourceEtag: null,
            folder: 'album-03-b',
            hasInfo: true,
            updatedAt: '2026-11-25T00:00:00.000Z',
            checkCount: 2,
            completeness: { tracks: 3, audio: 2, mv: 1, lyrics: 1 },
        });
    });

    it('should report an album without tracks or checks as all zero', async () => {
        await seedTwoAlbums();
        const [first] = (await list()).albums;
        expect(first).toMatchObject({ hasInfo: false, checkCount: 0 });
        expect(first?.completeness).toEqual({ tracks: 0, audio: 0, mv: 0, lyrics: 0 });
    });

    it('should not expose the fields CR-007 removed', async () => {
        await seedTwoAlbums();
        const [first] = (await list()).albums;
        for (const key of ['enabled', 'label', 'expectedFolder', 'checks', 'infoEtag', 'infoUsed'])
            expect(first, key).not.toHaveProperty(key);
    });

    // D69：類別（RELEASE_CATEGORIES 次序）→ 序號 → id。W-039：id 嘅字母次序同預期次序相反，
    // 唔排（D1 GROUP BY 按 id 出）就一定 fail
    it('should order by category, then number, then id', async () => {
        await insertAlbum('a', 0, { category: 'single', category_no: 1 });
        await insertAlbum('b', 0, { category: 'ep', category_no: 1 });
        await insertAlbum('c', 0, { category: 'album', category_no: 10 });
        await insertAlbum('e', 0, { category: 'album', category_no: 2 });
        await insertAlbum('d', 0, { category: 'album', category_no: 2 });
        expect((await list()).albums.map((album) => album.id)).toEqual(['d', 'e', 'c', 'b', 'a']);
    });

    it('should work out the wheel key from the title', async () => {
        await insertAlbum('f', 1, { title: '¿Frank?' });
        expect((await list()).albums[0]).toMatchObject({ wheelKey: 'F' });
    });

    // D1 嘅 CHECK 已經擋住唔係 JSON array 嘅值；讀嘅一方照樣唔信
    it('should read unreadable stored checks as none', () => {
        expect(checksOf({ checks: '{"not":"an array"}' })).toEqual([]);
        expect(checksOf({ checks: 'not json' })).toEqual([]);
        expect(checksOf({ checks: JSON.stringify(CHECKS) })).toEqual(CHECKS);
    });

    // D80（第 4 版四個錶）：歌曲已有音檔、歌詞、MV；專輯已有封面；加總數做分母
    it('should total the site-wide statistics of the four meters', async () => {
        await seedTwoAlbums();
        expect((await list()).stats).toEqual({
            albums: 2,
            tracks: 3,
            tracksWithAudio: 2,
            tracksWithLyrics: 1,
            tracksWithMv: 1,
            albumsWithCover: 1,
        });
    });

    it('should count an empty-string MV key as no MV in completeness and statistics', async () => {
        await insertAlbum('c', 1);
        await insertTrack('c-01', 'c', 1, { audio_key: 'c/01 x.m4a', mv_key: '' });
        const body = await list();
        expect(body.albums[0]?.completeness).toEqual({ tracks: 1, audio: 1, mv: 0, lyrics: 0 });
        expect(body.stats).toMatchObject({ tracks: 1, tracksWithAudio: 1, tracksWithMv: 0 });
    });

    it('should answer an empty site with zero statistics and no catalog yet', async () => {
        expect(await list()).toEqual({
            albums: [],
            stats: {
                albums: 0,
                tracks: 0,
                tracksWithAudio: 0,
                tracksWithLyrics: 0,
                tracksWithMv: 0,
                albumsWithCover: 0,
            },
            catalog: null,
        });
    });

    // backlog B-046 ②：同寫入回應嘅 `catalog` 同一個形狀（T-026）
    it('should include the catalog generation state in the write-response shape', async () => {
        await insertCatalogState({ status: 'failed', error: 'CATALOG_WRITE_FAILED' });
        expect((await list()).catalog).toEqual({
            ok: false,
            hash: null,
            generatedAt: null,
            albumCount: null,
            trackCount: null,
            updatedAt: '2026-11-25T00:00:00.000Z',
            error: 'CATALOG_WRITE_FAILED',
        });
    });

    it('should report the values of the live catalog after a success', async () => {
        await insertCatalogState({
            status: 'ok',
            hash: 'a'.repeat(64),
            generated_at: '2026-11-24T00:00:00.000Z',
            album_count: 3,
            track_count: 30,
        });
        expect((await list()).catalog).toEqual({
            ok: true,
            hash: 'a'.repeat(64),
            generatedAt: '2026-11-24T00:00:00.000Z',
            albumCount: 3,
            trackCount: 30,
            updatedAt: '2026-11-25T00:00:00.000Z',
            error: null,
        });
    });
});

describe('GET /api/albums/:id', () => {
    it('should return the album with its checks and its tracks in track order', async () => {
        await seedTwoAlbums();
        // 歌號可以跳號（D60）：按歌號排，唔係按 id
        await insertTrack('b-00', 'b', 9);
        const body = await json<{ tracks: Record<string, unknown>[] }>(
            await api('GET', '/api/albums/b'),
        );
        expect(body).toMatchObject({
            id: 'b',
            title: 'Beaming',
            wheelKey: 'B',
            cover: 'cover0000000000a.webp',
            category: 'album',
            categoryNo: 3,
            folder: 'album-03-b',
            hasInfo: true,
            checks: CHECKS,
        });
        expect(body).not.toHaveProperty('completeness');
        expect(body).not.toHaveProperty('checkCount');
        expect(body.tracks.map((track) => track.id)).toEqual(['b-01', 'b-02', 'b-03', 'b-00']);
    });

    it('should give no checks for an album without stored checks', async () => {
        await insertAlbum('a', 1);
        expect(await json(await api('GET', '/api/albums/a'))).toMatchObject({ checks: [] });
    });

    it('should describe each track without the lyrics text', async () => {
        await insertAlbum('b', 1);
        await insertTrack('b-01', 'b', 1, {
            audio_key: 'b/01.m4a',
            composer: '阿正',
            text_key: 'album-02-b/01 x.txt',
        });
        await insertTrack('b-04', 'b', 4);
        await insertLyrics('b-01', 0);
        const body = await json<{ tracks: unknown[] }>(await api('GET', '/api/albums/b'));
        expect(body.tracks).toEqual([
            {
                id: 'b-01',
                no: 1,
                title: 'Track b-01',
                audio: 'b/01.m4a',
                mv: null,
                textKey: 'album-02-b/01 x.txt',
                credits: { composer: '阿正', lyricist: null, arranger: null, producer: null },
                lyrics: { synced: false, lineCount: 1 },
                updatedAt: '2026-11-25T00:00:00.000Z',
            },
            // D70：info.txt 列咗、冇音檔嘅歌（灰色行）
            {
                id: 'b-04',
                no: 4,
                title: 'Track b-04',
                audio: null,
                mv: null,
                textKey: null,
                credits: { composer: null, lyricist: null, arranger: null, producer: null },
                lyrics: null,
                updatedAt: '2026-11-25T00:00:00.000Z',
            },
        ]);
    });

    it('should answer 404 NOT_FOUND in written Chinese for an unknown or malformed id', async () => {
        for (const id of ['nope', 'Bad_Id', 'favourites']) {
            const response = await api('GET', `/api/albums/${id}`);
            expect(response.status, id).toBe(404);
            expect(await response.json(), id).toEqual({
                error: { code: 'NOT_FOUND', message: zhHant.albums.errors.notFound },
            });
        }
    });
});
