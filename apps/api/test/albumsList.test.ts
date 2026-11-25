/* API-010 GET /api/albums、API-012 GET /api/albums/:id：列表、完整度、全站統計（FR-114、D35）、catalog 狀態 */
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

/** 兩張碟：b 有 3 首歌（音檔 2、MV 1、歌詞 1）連封面；a 冇歌 */
const seedTwoAlbums = async () => {
    await insertAsset('cover0000000000a.webp');
    await insertAlbum('b', 2, { cover: 'cover0000000000a.webp', title: 'Beaming' });
    await insertAlbum('a', 1, { title: 'Apollo 18' });
    await insertTrack('b-01', 'b', 1, { audio_key: 'b/01 x.m4a', mv_key: 'b/01 x.mp4' });
    await insertTrack('b-02', 'b', 2, { audio_key: 'b/02 y.m4a' });
    await insertTrack('b-03', 'b', 3, { audio_key: '' });
    await insertLyrics('b-02');
};

describe('GET /api/albums', () => {
    it('should list albums in sort order with the editable fields and updatedAt', async () => {
        await seedTwoAlbums();
        const body = await list();
        expect(body.albums.map((album) => album.id)).toEqual(['a', 'b']);
        expect(body.albums[1]).toEqual({
            id: 'b',
            title: 'Beaming',
            wheelKey: 'A',
            releaseDate: null,
            year: null,
            type: '',
            label: '',
            accent: '#c8442b',
            cover: 'cover0000000000a.webp',
            thumb: null,
            folder: null,
            updatedAt: '2026-11-25T00:00:00.000Z',
            completeness: { tracks: 3, audio: 2, mv: 1, lyrics: 1 },
        });
    });

    it('should report an album without tracks as all zero', async () => {
        await seedTwoAlbums();
        const body = await list();
        expect(body.albums[0]?.completeness).toEqual({ tracks: 0, audio: 0, mv: 0, lyrics: 0 });
    });

    it('should not expose a shelf flag', async () => {
        await seedTwoAlbums();
        const body = await list();
        expect(body.albums[0]).not.toHaveProperty('enabled');
    });

    it('should total the site-wide statistics of D35', async () => {
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

    it('should break sort order ties by id', async () => {
        await insertAlbum('z', 1);
        await insertAlbum('m', 1);
        expect((await list()).albums.map((album) => album.id)).toEqual(['m', 'z']);
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

    it('should include the catalog generation state', async () => {
        await insertCatalogState({ status: 'failed', error: 'R2 write failed' });
        expect((await list()).catalog).toEqual({
            status: 'failed',
            generatedAt: null,
            updatedAt: '2026-11-25T00:00:00.000Z',
            error: 'R2 write failed',
        });
    });
});

describe('GET /api/albums/:id', () => {
    it('should return the album with its tracks in track order', async () => {
        await seedTwoAlbums();
        await insertTrack('b-00', 'b', 0);
        const body = await json<{ tracks: Record<string, unknown>[] }>(
            await api('GET', '/api/albums/b'),
        );
        expect(body).toMatchObject({ id: 'b', title: 'Beaming', cover: 'cover0000000000a.webp' });
        expect(body).not.toHaveProperty('completeness');
        expect(body.tracks.map((track) => track.id)).toEqual(['b-00', 'b-01', 'b-02', 'b-03']);
    });

    it('should describe each track without the lyrics text', async () => {
        await insertAlbum('b', 1);
        await insertTrack('b-01', 'b', 1, {
            subtitle: 'Live',
            audio_key: 'b/01.m4a',
            audio_manual: 1,
            composer: '阿正',
            lyrics_source_url: 'https://example.com/lyrics',
            note: 'n',
            youtube_id: 'yt',
            video_kind: 'MV',
        });
        await insertLyrics('b-01', 0);
        const body = await json<{ tracks: unknown[] }>(await api('GET', '/api/albums/b'));
        expect(body.tracks[0]).toEqual({
            id: 'b-01',
            no: 1,
            title: 'Track b-01',
            subtitle: 'Live',
            audio: 'b/01.m4a',
            audioManual: true,
            mv: null,
            mvManual: false,
            credits: { composer: '阿正', lyricist: null, arranger: null, producer: null },
            lyrics: { synced: false, lineCount: 1 },
            lyricsSourceUrl: 'https://example.com/lyrics',
            note: 'n',
            youtubeId: 'yt',
            videoKind: 'MV',
            updatedAt: '2026-11-25T00:00:00.000Z',
        });
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
