/*
 * 冇人用嘅歌詞檔（backlog B-048）要等 catalog 生成成功先由 R2 刪走（review W-021；Functional Spec D30、核心原則 1）：
 * 生成失敗 = 播放端繼續用上一份 catalog.json，嗰份仲指住舊歌詞檔，所以唔可以刪。
 * CR-007：刪專輯、刪歌嘅 route 拎走（移除喺同步確認，T-105），呢度用歌曲文字清歌詞做代表
 * 刪檔本身出錯唔可以令已儲存嘅寫入變錯誤回應
 */
import { env } from 'cloudflare:test';
import { api, insertAlbum, insertLyrics, insertTrack, json } from './albumFixtures';
import { bucketWith, liveDocument } from './catalogFixtures';
import {
    LYRICS_PREFIX,
    lyricsFiles,
    lyricsRow,
    mirrorAlbumToMedia,
    saveSongText,
    seedAlbum,
} from './trackFixtures';

const SONG = '一早地下鐵\n\n[00:12.30]第一句歌詞';

/** 一行 validator 唔收嘅資料（專輯色唔係 #rrggbb）：之後每次生成都 INVALID_DOCUMENT */
const breakGeneration = () => insertAlbum('broken', 9, { accent: 'bad' });

const catalogOf = async (response: Response) =>
    (await json<{ catalog: { ok: boolean; error: string | null } }>(response)).catalog;

const liveLyricsOf = async (trackId: string) =>
    (await liveDocument())?.albums
        .flatMap((album) => album.tracks)
        .find((track) => track.id === trackId)?.lyrics;

/** 存咗之後嗰首歌嘅歌詞檔名 */
const lyricsNameOf = async (trackId: string) =>
    ((await lyricsRow(trackId))?.json_name as string | undefined) ?? null;

const saveSong = async () => {
    await saveSongText('apollo-18-01', SONG);
    return { lyrics: await lyricsNameOf('apollo-18-01') };
};

beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await seedAlbum();
    // T-106：歌曲文字寫返媒體 bucket；CR-007（D54）：冇音檔嘅歌喺 catalog 冇歌詞，所以每首歌都有音檔
    await mirrorAlbumToMedia('apollo-18');
});

afterEach(() => vi.restoreAllMocks());

describe('lyrics files stay while catalog generation fails', () => {
    it('should keep a file that the live catalog still lists', async () => {
        const saved = await saveSong();
        await breakGeneration();
        const cleared = await saveSongText('apollo-18-01', '一早地下鐵', '?force=1');
        expect((await catalogOf(cleared)).ok).toBe(false);
        expect(await liveLyricsOf('apollo-18-01')).toBe(saved.lyrics);
    });

    it('should keep the old file when the lyrics change', async () => {
        const saved = await saveSong();
        await breakGeneration();
        const changed = await saveSongText('apollo-18-01', `${SONG}改`);
        const lyrics = await lyricsNameOf('apollo-18-01');
        expect((await catalogOf(changed)).ok).toBe(false);
        expect(await lyricsFiles()).toEqual([lyrics, saved.lyrics].sort());
    });

    it('should keep the file when the lyrics are cleared', async () => {
        const saved = await saveSong();
        await breakGeneration();
        const cleared = await saveSongText('apollo-18-01', '一早地下鐵', '?force=1');
        expect((await catalogOf(cleared)).ok).toBe(false);
        expect(await lyricsFiles()).toEqual([saved.lyrics]);
    });
});

describe('lyrics files go once catalog generation succeeds', () => {
    it('should drop the old file after a successful generation', async () => {
        await saveSong();
        const cleared = await saveSongText('apollo-18-01', '一早地下鐵', '?force=1');
        expect((await catalogOf(cleared)).ok).toBe(true);
        expect(await lyricsFiles()).toEqual([]);
    });

    it('should drop the file only after catalog.json no longer lists it', async () => {
        await insertTrack('other-01', 'apollo-18', 4, { audio_key: 'other-01.m4a' });
        await insertLyrics('other-01');
        await mirrorAlbumToMedia('apollo-18');
        const key = `${LYRICS_PREFIX}other-01.json`;
        await env.CATALOG.put(key, '{}');
        await api('POST', '/api/catalog/rebuild');
        expect(await liveLyricsOf('other-01')).toBe('other-01.json');
        let listedWhenDropped: unknown = 'not dropped';
        const { bucket } = bucketWith({
            delete: async (args, original) => {
                listedWhenDropped = await liveLyricsOf('other-01');
                return original(...args);
            },
        });
        await saveSongText('other-01', '其他', '?force=1', { ...env, CATALOG: bucket });
        expect(listedWhenDropped).toBeNull();
        expect(await env.CATALOG.head(key)).toBeNull();
    });
});

describe('a failing R2 delete does not fail the saved write', () => {
    const failingDelete = () => bucketWith({ delete: () => Promise.reject(new Error('R2 down')) });

    it('should answer the save with 200 and catalog ok, logging no file name', async () => {
        const saved = await saveSong();
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { bucket } = failingDelete();
        const bindings = { ...env, CATALOG: bucket };
        const response = await saveSongText('apollo-18-01', '一早地下鐵', '?force=1', bindings);
        expect(response.status).toBe(200);
        expect((await catalogOf(response)).ok).toBe(true);
        expect(log.mock.calls.flat()).toContain('Error');
        expect(JSON.stringify(log.mock.calls)).not.toContain(saved.lyrics ?? '');
        // 刪唔到嘅檔留低
        expect(await lyricsFiles()).toEqual([saved.lyrics]);
    });
});
