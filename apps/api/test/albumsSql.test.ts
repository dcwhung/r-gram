/*
 * Production 嘅初始資料（review W-034）：seed/albums.sql 由 discography.json 生成（同本機 seed 同一個 planAlbumSeed），
 * 由人用 `wrangler d1 execute <db> --remote --file` 行。呢度驗：入 repo 嘅檔同重新生成一模一樣；
 * 行出嚟同本機 seed 一樣（21 張、冇歌、中性色）；重跑冇害、唔蓋走改過嘅專輯；文字值安全咁轉義
 */
import { NEUTRAL_ACCENT, type SeedAlbum, type SeedDiscography } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import discography from '../seed/discography.json';
import committed from '../seed/albums.sql?raw';
import { albumSeedStatements, albumsSqlFile } from '../src/seed/albumsSql';
import { albumRow, countOf } from './albumFixtures';

const { albums } = discography as unknown as SeedDiscography;
const EXPECTED_ALBUMS = 21;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const runAll = (statements: readonly string[]) =>
    env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));

const album = (extra: Partial<SeedAlbum> = {}): SeedAlbum => ({
    order: 0,
    id: 'test-album',
    category: 'album',
    categoryNo: 1,
    wheelKey: 'T',
    title: 'Test',
    year: null,
    label: 'Label',
    tracks: [],
    ...extra,
});

describe('seed/albums.sql', () => {
    it('should match a fresh generation from discography.json', () => {
        expect(committed).toBe(albumsSqlFile(albums));
    });

    it('should say how it is applied and that the catalog is rebuilt afterwards', () => {
        expect(committed).toContain('--remote --file');
        expect(committed).toContain('/api/catalog/rebuild');
    });

    it('should insert the 21 albums with a neutral accent and no tracks', async () => {
        await runAll(albumSeedStatements(albums));
        expect(await countOf('albums')).toBe(EXPECTED_ALBUMS);
        expect(await countOf('tracks')).toBe(0);
        const row = await albumRow('apollo-18');
        expect(row).toMatchObject({ accent: NEUTRAL_ACCENT, category_no: 1, folder: null });
        expect(row?.created_at).toMatch(ISO_TIME);
        expect(row?.updated_at).toBe(row?.created_at);
    });

    it('should leave existing and renamed albums alone when run again', async () => {
        await runAll(albumSeedStatements(albums));
        await env.DB.prepare("UPDATE albums SET title = 'X' WHERE id = 'apollo-18'").run();
        await runAll(albumSeedStatements(albums));
        expect(await countOf('albums')).toBe(EXPECTED_ALBUMS);
        expect((await albumRow('apollo-18'))?.title).toBe('X');
    });

    it('should skip an album whose category number is already used', async () => {
        await runAll(albumSeedStatements([album({ id: 'first' })]));
        await runAll(albumSeedStatements([album({ id: 'second' })]));
        expect(await albumRow('second')).toBeNull();
    });

    it('should escape quotes so a value stays a value', async () => {
        const title = "It's'); DROP TABLE albums; --";
        await runAll(albumSeedStatements([album({ title, label: "O'Brien" })]));
        expect(await albumRow('test-album')).toMatchObject({ title, label: "O'Brien", year: null });
    });

    it('should refuse values it cannot write safely', () => {
        expect(() => albumSeedStatements([album({ title: 'a\u0000b' })])).toThrow();
        expect(() => albumSeedStatements([album({ categoryNo: 1.5 })])).toThrow();
    });
});
