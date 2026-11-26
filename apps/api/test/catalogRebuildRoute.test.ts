/*
 * 儲存即生效（T-026；Functional Spec FR-121、D30；Technical Spec API-061）：
 * - 每個成功嘅 /api 寫入之後生成 catalog，回應帶 `catalog`（同 GET /api/albums 嘅 `catalog` 同一個形狀，backlog B-046 ②）
 * - 生成失敗唔令寫入失敗：200 + catalog.ok = false
 * - POST /api/catalog/rebuild：重試；唔會再行一次寫入後置步驟（backlog B-043 ③）
 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { ORIGIN, call, loginCookie } from './helpers';
import { api, insertAlbum, insertTrack, json } from './albumFixtures';
import { SHA256_HEX, bucketWith, liveDocument, stateRow } from './catalogFixtures';

const REBUILD = '/api/catalog/rebuild';
const NOW = '2026-11-25T00:00:00.000Z';

/** 歌曲文字（API-041）：CR-007 之後主要嘅寫入 */
const saveText = (trackId: string, text: string, bindings = env) =>
    api('PUT', `/api/tracks/${trackId}/text`, { text }, { 'if-match': `"${NOW}"` }, bindings);

/** D1 嘅 wrapper：SQL 有 `fragment` 嗰句一 prepare 就 throw（模擬 D1 出事），其他照行 */
const dbFailingOn = (fragment: string): D1Database =>
    new Proxy(env.DB, {
        get(target, key: string) {
            const value = (target as unknown as Record<string, unknown>)[key];
            if (typeof value !== 'function') return value;
            if (key !== 'prepare') return (value as () => unknown).bind(target);
            return (sql: string) => {
                if (sql.includes(fragment)) throw new Error('D1 down');
                return target.prepare(sql);
            };
        },
    });

const CATALOG_STATUS_KEYS = [
    'albumCount',
    'error',
    'generatedAt',
    'hash',
    'ok',
    'trackCount',
    'updatedAt',
];

interface ErrorBody {
    error: { code: string; message: string; details?: Record<string, unknown>[] };
}

/** 兩個壞欄（專輯 accent、歌名空白），內容有一段唔應該出現喺回應嘅字 */
const seedBroken = async () => {
    await insertAlbum('good', 1);
    await insertAlbum('bad', 2, { accent: 'crimson', title: '秘密碟名' });
    await insertTrack('bad-01', 'bad', 1, { title: ' ', composer: '秘密作曲' });
};

/** review S-092：只有 id 同欄名，冇內容 */
const BROKEN_DETAILS = [
    { albumId: 'bad', field: 'accent', code: 'INVALID_COLOUR' },
    { albumId: 'bad', trackId: 'bad-01', field: 'title', code: 'INVALID_STRING' },
];

const CONTENT = ['秘密碟名', '秘密作曲', 'crimson'];

afterEach(() => vi.restoreAllMocks());

describe('POST /api/catalog/rebuild', () => {
    it('should generate catalog.json and answer with the result', async () => {
        await insertAlbum('a', 1);
        const response = await api('POST', REBUILD);
        expect(response.status).toBe(200);
        const body = await json(response);
        expect(body).toEqual({
            ok: true,
            unchanged: false,
            hash: expect.stringMatching(SHA256_HEX),
            generatedAt: expect.any(String),
            albumCount: 1,
            trackCount: 0,
            updatedAt: expect.any(String),
            error: null,
        });
        expect((await liveDocument())?.albums).toHaveLength(1);
    });

    // backlog B-043 ③：唔行寫入後置步驟（唔會生成兩次，回應冇 catalog）
    it('should not run the post-write step again', async () => {
        const { bucket, calls } = bucketWith();
        const response = await api('POST', REBUILD, undefined, {}, { ...env, CATALOG: bucket });
        expect(await json(response)).not.toHaveProperty('catalog');
        expect(calls.head).toBe(1);
        expect(calls.put).toBe(1);
    });

    it('should answer unchanged when nothing changed since the last generation', async () => {
        await api('POST', REBUILD);
        expect(await json(await api('POST', REBUILD))).toMatchObject({ ok: true, unchanged: true });
    });

    it('should answer 422 INVALID_DOCUMENT when the document fails the validator', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('bad', 1, { accent: 'red' });
        const response = await api('POST', REBUILD);
        expect(response.status).toBe(422);
        const body = await json<ErrorBody>(response);
        expect(body.error).toEqual({
            code: 'INVALID_DOCUMENT',
            message: zhHant.catalog.errors.invalidDocument,
            details: [{ albumId: 'bad', field: 'accent', code: 'INVALID_COLOUR' }],
        });
        expect((await stateRow())?.status).toBe('failed');
    });

    // review S-092：管理員要搵到邊一行擋住生成
    it('should locate each problem by album id, track id and field, without content', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await seedBroken();
        const response = await api('POST', REBUILD);
        expect(response.status).toBe(422);
        const raw = await response.text();
        expect((JSON.parse(raw) as ErrorBody).error.details).toEqual(BROKEN_DETAILS);
        for (const text of CONTENT) expect(raw).not.toContain(text);
    });

    it('should answer 502 CATALOG_WRITE_FAILED when R2 refuses the write', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { bucket } = bucketWith({ put: () => Promise.reject(new Error('down')) });
        const response = await api('POST', REBUILD, undefined, {}, { ...env, CATALOG: bucket });
        expect(response.status).toBe(502);
        const body = await json<ErrorBody>(response);
        expect(body.error.code).toBe('CATALOG_WRITE_FAILED');
        expect(body.error.message).toBe(zhHant.catalog.errors.writeFailed);
    });

    it('should need a session and the same origin', async () => {
        expect((await call(REBUILD, { method: 'POST' })).status).toBe(401);
        const cookie = await loginCookie();
        const foreign = { method: 'POST', headers: { cookie, origin: 'https://evil.example' } };
        expect((await call(REBUILD, foreign)).status).toBe(403);
        expect(await stateRow()).toBeNull();
    });

    it('should only take POST', async () => {
        const cookie = await loginCookie();
        const response = await call(REBUILD, { headers: { cookie, origin: ORIGIN } });
        expect(response.status).toBe(404);
    });
});

describe('save takes effect (afterWrite → rebuildCatalog)', () => {
    // CR-007：剩低嘅寫入係歌曲文字（API-041）、封面上載同掃描套用；用歌曲文字做代表
    it('should put a saved song text in catalog.json at once', async () => {
        await insertAlbum('apollo-18', 1);
        await insertTrack('apollo-18-01', 'apollo-18', 1, { audio_key: 'apollo-18/01.m4a' });
        const response = await saveText('apollo-18-01', '新歌名\n曲：阿正');
        expect(response.status).toBe(200);
        const body = await json<{ catalog: Record<string, unknown> }>(response);
        expect(body.catalog).toMatchObject({ ok: true, albumCount: 1, trackCount: 1, error: null });
        const [track] = (await liveDocument())?.albums[0]?.tracks ?? [];
        expect(track).toMatchObject({ title: '新歌名', credits: { composer: '阿正' } });
    });

    it('should answer every write with the same catalog shape as GET /api/albums', async () => {
        await insertAlbum('a', 1);
        await insertTrack('a-01', 'a', 1);
        const write = await json<{ catalog: Record<string, unknown> }>(await saveText('a-01', 'x'));
        expect(Object.keys(write.catalog).sort()).toEqual(CATALOG_STATUS_KEYS);
        const listed = await json<{ catalog: unknown }>(await api('GET', '/api/albums'));
        expect(listed.catalog).toEqual(write.catalog);
    });

    it('should keep a saved write successful when generation fails (D30)', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('bad', 1, { accent: 'bad' });
        await insertTrack('bad-01', 'bad', 1);
        const response = await saveText('bad-01', 'Apollo');
        expect(response.status).toBe(200);
        const body = await json<{ track: { title: string }; catalog: Record<string, unknown> }>(
            response,
        );
        expect(body.track.title).toBe('Apollo');
        expect(body.catalog).toMatchObject({ ok: false, error: 'INVALID_DOCUMENT' });
        expect(await liveDocument()).toBeNull();
    });

    it('should locate the problem in the write response catalog too (S-092)', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await seedBroken();
        await insertTrack('good-01', 'good', 1);
        const response = await saveText('good-01', '好歌');
        expect(response.status).toBe(200);
        const raw = await response.text();
        const { catalog } = JSON.parse(raw) as { catalog: Record<string, unknown> };
        expect(catalog).toMatchObject({ ok: false, error: 'INVALID_DOCUMENT' });
        expect(catalog.details).toEqual(BROKEN_DETAILS);
        for (const text of CONTENT) expect(raw).not.toContain(text);
        for (const text of CONTENT) expect(JSON.stringify(log.mock.calls)).not.toContain(text);
    });

    it('should not generate after a failed write', async () => {
        const response = await saveText('nope-01', 'x');
        expect(response.status).toBe(404);
        expect(await stateRow()).toBeNull();
    });

    it('should keep the shape when the generation step throws unexpectedly', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('a', 1);
        await insertTrack('a-01', 'a', 1);
        const { bucket } = bucketWith({ head: () => Promise.reject(new Error('down')) });
        const response = await saveText('a-01', 'x', { ...env, CATALOG: bucket });
        expect(response.status).toBe(200);
        const body = await json<{ catalog: Record<string, unknown> }>(response);
        expect(Object.keys(body.catalog).sort()).toEqual(CATALOG_STATUS_KEYS);
        expect(body.catalog.ok).toBe(false);
    });

    // review S-094：INTERNAL 唔可以同「未生成過」分唔到：照回上一份成功嘅值
    it('should keep the previous good values when the generation step throws unexpectedly', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await insertAlbum('a', 1);
        const good = await json<Record<string, unknown>>(await api('POST', REBUILD));
        await insertAlbum('b', 2);
        await insertTrack('b-01', 'b', 1);
        // 記低成功嗰句（catalog_state）出錯：生成步驟 throw
        const response = await saveText('b-01', 'x', {
            ...env,
            DB: dbFailingOn("VALUES (1, 'ok'"),
        });
        expect(response.status).toBe(200);
        const { catalog } = await json<{ catalog: Record<string, unknown> }>(response);
        expect(catalog).toEqual({
            ok: false,
            hash: good.hash,
            generatedAt: good.generatedAt,
            albumCount: 1,
            trackCount: 0,
            updatedAt: expect.any(String),
            error: 'INTERNAL',
        });
    });
});
