/*
 * rebuildCatalog()（T-026；Technical Spec API-061、「核心原則 1」、「R2 key layout」、catalog_state）：
 * D1 → document（全部專輯同歌，冇上下架；空字串轉 null，backlog B-005）→ parseCatalogDocument() →
 * hash 冇變就唔寫 R2 → 記 catalog_state。失敗唔掂上一份 catalog.json，catalog_state 保留上一份嘅值
 */
import { parseCatalogDocument } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { rebuildCatalog } from '../src/catalog/rebuild';
import { recordSuccess } from '../src/catalog/state';
import {
    insertAlbum,
    insertAsset,
    insertCatalogState,
    insertLyrics,
    insertTrack,
} from './albumFixtures';
import {
    CATALOG_KEY,
    IMAGE_BASE,
    LYRICS_BASE,
    SHA256_HEX,
    bucketWith,
    liveDocument,
    liveObject,
    stateRow,
} from './catalogFixtures';

const ACTOR = 'admin@example.com';
const rebuild = (bindings = env) => rebuildCatalog(bindings, ACTOR);

afterEach(() => vi.restoreAllMocks());

/** 兩張碟：b 排先、有歌；a 冇歌（D39） */
const seedTwo = async () => {
    await insertAsset('0123456789abcdef.webp');
    await insertAsset('fedcba9876543210.webp');
    await insertAlbum('b', 1, {
        title: 'Beaming',
        release_date: '2008-09-26',
        year: 2008,
        type: '錄音室專輯',
        category: 'ep',
        category_no: 3,
        label: '金牌娛樂',
        cover: '0123456789abcdef.webp',
        cover_source_etag: '"e1"',
        thumb: 'fedcba9876543210.webp',
        folder: 'Beaming 2008',
    });
    await insertAlbum('a', 2, { title: 'Apollo 18' });
    await insertTrack('b-02', 'b', 2, { title: '第二首', mv_key: 'b/02 二.mp4' });
    await insertTrack('b-01', 'b', 1, {
        title: '一早地下鐵',
        subtitle: 'Live',
        composer: '阿正',
        lyricist: 'Tim Lui / 6號',
        audio_key: 'b/01 一早地下鐵.m4a',
    });
    await insertLyrics('b-01');
};

describe('rebuildCatalog: document', () => {
    it('should write every album in admin order with every track in number order', async () => {
        await seedTwo();
        await rebuild();
        const document = await liveDocument();
        expect(parseCatalogDocument(document).ok).toBe(true);
        expect(document?.albums.map((album) => album.id)).toEqual(['b', 'a']);
        expect(document?.albums[0]?.tracks.map((track) => track.id)).toEqual(['b-01', 'b-02']);
        // D39：冇歌嘅專輯照出
        expect(document?.albums[1]?.tracks).toEqual([]);
    });

    it('should take the bases from MEDIA_BASE and WORKER_ORIGIN', async () => {
        await rebuild();
        expect(await liveDocument()).toMatchObject({
            version: 1,
            mediaBase: env.MEDIA_BASE,
            imageBase: IMAGE_BASE,
            lyricsBase: LYRICS_BASE,
            albums: [],
        });
    });

    it('should map album fields and keep stored keys as they are for the player to encode', async () => {
        await seedTwo();
        await rebuild();
        const [beaming, apollo] = (await liveDocument())?.albums ?? [];
        expect(beaming).toEqual({
            id: 'b',
            title: 'Beaming',
            wheelKey: 'A',
            releaseDate: '2008-09-26',
            year: 2008,
            type: '錄音室專輯',
            // CR-004：類別同序號入 catalog；folder、封面來源 ETag 係管理用，唔入
            category: 'ep',
            categoryNo: 3,
            label: '金牌娛樂',
            accent: '#c8442b',
            cover: '0123456789abcdef.webp',
            thumb: 'fedcba9876543210.webp',
            tracks: expect.any(Array),
        });
        expect(apollo).toMatchObject({ releaseDate: null, year: null, cover: null, thumb: null });
        expect(apollo).toMatchObject({ type: '', label: '' });
    });

    it('should map track fields, null credits when all four are empty, and null audio (D11)', async () => {
        await seedTwo();
        await rebuild();
        const [first, second] = (await liveDocument())?.albums[0]?.tracks ?? [];
        expect(first).toEqual({
            id: 'b-01',
            no: 1,
            title: '一早地下鐵',
            subtitle: 'Live',
            credits: {
                composer: '阿正',
                lyricist: 'Tim Lui / 6號',
                arranger: null,
                producer: null,
            },
            audio: 'b/01 一早地下鐵.m4a',
            mv: null,
            lyrics: 'b-01.json',
        });
        expect(second).toEqual({
            id: 'b-02',
            no: 2,
            title: '第二首',
            subtitle: null,
            credits: null,
            audio: null,
            mv: 'b/02 二.mp4',
            lyrics: null,
        });
    });

    // 年份跟發行日期：冇日期就冇年份（review W-022）
    it('should give no year when there is no release date, whatever the stored year', async () => {
        await insertAlbum('a', 1, { release_date: null, year: 2008 });
        await rebuild();
        expect((await liveDocument())?.albums[0]).toMatchObject({ releaseDate: null, year: null });
    });

    // backlog B-005：validator 唔收空字串（type / label 除外）
    it('should turn empty and blank strings into null', async () => {
        await insertAlbum('a', 1, { release_date: '', type: '', label: '' });
        await insertTrack('a-01', 'a', 1, {
            subtitle: '',
            composer: ' ',
            lyricist: '',
            audio_key: '',
            mv_key: '  ',
        });
        const result = await rebuild();
        expect(result.ok).toBe(true);
        const album = (await liveDocument())?.albums[0];
        expect(album).toMatchObject({ releaseDate: null, type: '', label: '' });
        expect(album?.tracks[0]).toMatchObject({
            subtitle: null,
            credits: null,
            audio: null,
            mv: null,
        });
    });
});

describe('rebuildCatalog: writing and state', () => {
    it('should store the document with its content hash and record an ok state', async () => {
        await seedTwo();
        const result = await rebuild();
        expect(result).toEqual({
            ok: true,
            unchanged: false,
            hash: expect.stringMatching(SHA256_HEX),
            generatedAt: (await liveDocument())?.generatedAt,
            albumCount: 2,
            trackCount: 2,
            updatedAt: expect.any(String),
            error: null,
        });
        const object = await liveObject();
        expect(object?.httpMetadata?.contentType).toBe('application/json');
        expect(object?.customMetadata?.hash).toBe(result.hash);
        expect(await stateRow()).toEqual({
            id: 1,
            status: 'ok',
            hash: result.hash,
            generated_at: result.generatedAt,
            album_count: 2,
            track_count: 2,
            updated_at: result.updatedAt,
            updated_by: ACTOR,
            error: null,
        });
    });

    it('should not rewrite catalog.json when only the time would change', async () => {
        await seedTwo();
        const first = await rebuild();
        const before = await liveObject();
        const second = await rebuild();
        expect(second).toMatchObject({ ok: true, unchanged: true, hash: first.hash });
        expect(second.generatedAt).toBe(first.generatedAt);
        expect((await liveObject())?.etag).toBe(before?.etag);
        expect((await stateRow())?.status).toBe('ok');
    });

    it('should write a new document with a new hash after a change', async () => {
        await seedTwo();
        const first = await rebuild();
        await env.DB.prepare("UPDATE albums SET title = 'Beaming 2' WHERE id = 'b'").run();
        const second = await rebuild();
        expect(second).toMatchObject({ ok: true, unchanged: false });
        expect(second.hash).not.toBe(first.hash);
        expect((await liveDocument())?.albums[0]?.title).toBe('Beaming 2');
    });

    it('should drop a deleted album from the document', async () => {
        await seedTwo();
        await rebuild();
        await env.DB.prepare("DELETE FROM albums WHERE id = 'a'").run();
        expect((await rebuild()).albumCount).toBe(1);
        expect((await liveDocument())?.albums.map((album) => album.id)).toEqual(['b']);
    });
});

describe('recordSuccess', () => {
    const live = (generatedAt: string, hash: string) => ({
        hash,
        generatedAt,
        albumCount: 1,
        trackCount: 0,
    });

    // review W-022：hash / 時間 / 數目只會向前行，遲到嘅舊成功唔可以蓋過新嘅
    it('should not let a late, older success overwrite a newer recorded state', async () => {
        const newer = live('2026-11-25T02:00:00.000Z', 'b'.repeat(64));
        await recordSuccess(env.DB, newer, { updatedAt: newer.generatedAt, actor: ACTOR });
        const older = live('2026-11-25T01:00:00.000Z', 'a'.repeat(64));
        await recordSuccess(env.DB, older, { updatedAt: older.generatedAt, actor: 'late' });
        expect(await stateRow()).toMatchObject({
            hash: newer.hash,
            generated_at: newer.generatedAt,
            updated_by: ACTOR,
        });
    });
});

describe('rebuildCatalog: failures', () => {
    const seedGood = async () => {
        await insertAlbum('a', 1);
        return rebuild();
    };

    it('should not write a document the validator refuses and keep the previous one', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const good = await seedGood();
        await insertAlbum('bad', 2, { accent: 'red', title: '秘密碟名' });
        const result = await rebuild();
        expect(result).toEqual({
            ok: false,
            unchanged: false,
            hash: good.hash,
            generatedAt: good.generatedAt,
            albumCount: 1,
            trackCount: 0,
            updatedAt: expect.any(String),
            error: 'INVALID_DOCUMENT',
            details: [{ albumId: 'bad', field: 'accent', code: 'INVALID_COLOUR' }],
        });
        expect((await liveDocument())?.albums.map((album) => album.id)).toEqual(['a']);
        expect(await stateRow()).toMatchObject({
            status: 'failed',
            hash: good.hash,
            error: 'INVALID_DOCUMENT',
        });
        expect(JSON.stringify(log.mock.calls)).not.toContain('秘密碟名');
    });

    // review S-092：文件頂層嘅欄冇專輯 id，只有欄名
    it('should locate a problem outside the albums by its field alone', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const result = await rebuild({ ...env, MEDIA_BASE: 'http://media.example/' });
        expect(result.details).toEqual([{ field: 'mediaBase', code: 'INVALID_URL' }]);
    });

    it('should give no details for a failure that is not about the document', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { bucket } = bucketWith({ put: () => Promise.reject(new Error('R2 down')) });
        expect(await rebuild({ ...env, CATALOG: bucket })).not.toHaveProperty('details');
    });

    it('should record CATALOG_WRITE_FAILED when R2 refuses the write, keeping the previous values', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const good = await seedGood();
        await insertAlbum('b', 2);
        const { bucket } = bucketWith({
            put: () => Promise.reject(new Error('R2 down')),
        });
        const result = await rebuild({ ...env, CATALOG: bucket });
        expect(result).toMatchObject({ ok: false, error: 'CATALOG_WRITE_FAILED', hash: good.hash });
        expect((await liveDocument())?.albums).toHaveLength(1);
        expect(await stateRow()).toMatchObject({ status: 'failed', album_count: 1 });
    });

    it('should record a failed state with no previous values before any success', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('bad', 1, { wheel_key: '' });
        const result = await rebuild();
        expect(result).toMatchObject({
            ok: false,
            hash: null,
            generatedAt: null,
            albumCount: null,
        });
        expect(await liveObject()).toBeNull();
        expect(await stateRow()).toMatchObject({ status: 'failed', hash: null, updated_by: ACTOR });
    });

    it('should clear the failure once a later generation succeeds', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('bad', 1, { wheel_key: '' });
        await rebuild();
        await env.DB.prepare("UPDATE albums SET wheel_key = 'B' WHERE id = 'bad'").run();
        expect((await rebuild()).ok).toBe(true);
        expect(await stateRow()).toMatchObject({ status: 'ok', error: null });
    });

    it('should regenerate when the stored state says ok but catalog.json is missing', async () => {
        await insertAlbum('a', 1);
        await insertCatalogState({
            status: 'ok',
            hash: 'f'.repeat(64),
            generated_at: '2026-11-25T00:00:00.000Z',
            album_count: 1,
            track_count: 0,
        });
        expect((await rebuild()).unchanged).toBe(false);
        expect(await liveDocument()).not.toBeNull();
    });
});

describe('rebuildCatalog: concurrent writes', () => {
    it('should never let an older document replace a newer one', async () => {
        await insertAlbum('a', 1);
        await rebuild();
        let raced = false;
        // 呢個 rebuild 讀完 D1 之後、寫 R2 之前，另一個請求加咗碟 b 而且先生成咗
        const { bucket, calls } = bucketWith({
            put: async (args, original) => {
                if (!raced) {
                    raced = true;
                    await insertAlbum('b', 2);
                    await rebuild();
                }
                return original(...args);
            },
        });
        await env.DB.prepare("UPDATE albums SET title = 'Apollo' WHERE id = 'a'").run();
        const result = await rebuild({ ...env, CATALOG: bucket });
        expect(result.ok).toBe(true);
        expect(calls.head).toBeGreaterThanOrEqual(2);
        const document = await liveDocument();
        expect(document?.albums.map((album) => [album.id, album.title])).toEqual([
            ['a', 'Apollo'],
            ['b', 'Album b'],
        ]);
        expect((await stateRow())?.hash).toBe((await liveObject())?.customMetadata?.hash);
    });

    it('should give up with CATALOG_WRITE_FAILED when other writers keep winning', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('a', 1);
        // put 回 null = 條件唔啱（期間有人寫咗）
        const { bucket, calls } = bucketWith({ put: async () => null });
        const result = await rebuild({ ...env, CATALOG: bucket });
        expect(result).toMatchObject({ ok: false, error: 'CATALOG_WRITE_FAILED' });
        expect(calls.put).toBe(3);
    });

    // review W-020（A→B→A）：「冇變」嘅一輪唔寫 R2，etag 唔郁；讀 D1 比較早嘅生成寫入時條件照啱
    it('should not leave older content live when a newer save found nothing to write', async () => {
        const setTitle = (title: string) =>
            env.DB.prepare('UPDATE albums SET title = ? WHERE id = ?').bind(title, 'a').run();
        await insertAlbum('a', 1, { title: 'T1' });
        await rebuild();
        let saved: Awaited<ReturnType<typeof rebuild>> | undefined;
        // 請求 B 將 D1 改做 T0，佢嘅生成讀完 D1、寫 R2 之前：請求 A 改返 T1，生成見到同 R2 一樣，乜都唔寫
        const { bucket } = bucketWith({
            put: async (args, original) => {
                if (!saved) {
                    await setTitle('T1');
                    saved = await rebuild();
                }
                return original(...args);
            },
        });
        await setTitle('T0');
        const late = await rebuild({ ...env, CATALOG: bucket });
        expect(saved).toMatchObject({ ok: true, unchanged: true });
        expect(late.ok).toBe(true);
        expect((await liveDocument())?.albums[0]?.title).toBe('T1');
        expect((await stateRow())?.hash).toBe((await liveObject())?.customMetadata?.hash);
    });

    it('should record a failure, never ok, when D1 keeps moving after every write', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('a', 1);
        let saves = 0;
        // 每次寫入之後 D1 都已經再改過：寫入嘅永遠唔係最新
        const { bucket, calls } = bucketWith({
            put: async (args, original) => {
                const written = await original(...args);
                saves += 1;
                await env.DB.prepare('UPDATE albums SET title = ? WHERE id = ?')
                    .bind(`Moved ${saves}`, 'a')
                    .run();
                return written;
            },
        });
        const result = await rebuild({ ...env, CATALOG: bucket });
        expect(result).toMatchObject({ ok: false, error: 'CATALOG_WRITE_FAILED' });
        expect(calls.put).toBe(3);
        expect((await stateRow())?.status).toBe('failed');
    });

    it('should only write catalog.json when it is still the one read before D1', async () => {
        await insertAlbum('a', 1);
        await rebuild();
        let others = 0;
        const { bucket } = bucketWith({
            put: async (args, original) => {
                // 模擬期間另一個請求寫咗：直接改 R2，條件寫入應該唔成功。
                // 每次內容唔同：R2 嘅 etag 係內容 MD5，一模一樣嘅內容 etag 都一樣
                others += 1;
                await env.CATALOG.put(CATALOG_KEY, JSON.stringify({ other: others }));
                return original(...args);
            },
        });
        await env.DB.prepare("UPDATE albums SET title = 'X' WHERE id = 'a'").run();
        const result = await rebuild({ ...env, CATALOG: bucket });
        expect(result).toMatchObject({ ok: false, error: 'CATALOG_WRITE_FAILED' });
        // 每次重試都會被「另一個請求」蓋過，最後一份係佢嘅；冇一份過時嘅 document 蓋咗佢
        expect(await liveDocument()).toEqual({ other: 3 });
    });
});
