/*
 * 清冇人用嘅歌詞檔（backlog B-048）要喺每個請求嘅操作上限之內（T-105；Technical Spec「每個請求嘅操作上限」）：
 * 確認刪幾張大碟可以一次過放出幾千個歌詞檔，唔可以逐個檔 D1 查一次、R2 刪一次。
 * 一句 D1 查最多 100 個檔名（D1 每句參數上限），R2 一次刪晒
 */
import { env } from 'cloudflare:test';
import { dropUnusedLyrics } from '../src/tracks/lyricsCleanup';
import { insertAlbum, insertLyrics, insertTrack } from './albumFixtures';
import { bucketWith } from './catalogFixtures';
import { LYRICS_PREFIX, lyricsFiles } from './trackFixtures';

/** 大過 D1 每句參數上限（100） */
const MANY = 250;
const D1_PARAMS_MAX = 100;

const names = Array.from({ length: MANY }, (_, index) => `${String(index).padStart(16, '0')}.json`);

beforeEach(async () => {
    for (const name of names) await env.CATALOG.put(`${LYRICS_PREFIX}${name}`, '{}');
    await insertAlbum('keep', 0);
    await insertTrack('keep-01', 'keep', 1);
    await insertLyrics('keep-01');
    // 第一個檔仲有歌用緊
    await env.DB.prepare('UPDATE lyrics SET json_name = ? WHERE track_id = ?')
        .bind(names[0], 'keep-01')
        .run();
});

describe('dropUnusedLyrics in bulk', () => {
    it('should delete every unused file with one R2 call and few D1 queries', async () => {
        const { bucket, calls } = bucketWith();
        const queries: string[] = [];
        const db = new Proxy(env.DB, {
            get(target, key: string) {
                const value = Reflect.get(target, key) as unknown;
                if (key !== 'prepare' || typeof value !== 'function')
                    return typeof value === 'function' ? value.bind(target) : value;
                return (sql: string) => {
                    queries.push(sql);
                    return target.prepare(sql);
                };
            },
        });
        await dropUnusedLyrics({ DB: db, CATALOG: bucket }, [...names, null, undefined, names[1]]);
        expect(await lyricsFiles()).toEqual([names[0]]);
        expect(calls.delete).toBe(1);
        expect(queries.length).toBeLessThanOrEqual(Math.ceil(MANY / D1_PARAMS_MAX));
    });

    it('should do nothing for no names', async () => {
        const { bucket, calls } = bucketWith();
        await dropUnusedLyrics({ DB: env.DB, CATALOG: bucket }, [null, undefined]);
        expect(calls.delete).toBeUndefined();
        expect(await lyricsFiles()).toHaveLength(MANY);
    });
});
