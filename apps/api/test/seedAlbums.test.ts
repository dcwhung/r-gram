/*
 * T-027 初始資料（Technical Spec「CR-006 → 初始資料只入專輯」、Functional Spec D59）：
 * discography.json 嘅 21 張專輯入 D1（唔入歌、credit、封面），已有嘅 id 唔郁，同類別序號撞咗就跳過並報告，
 * 之後生成一次 catalog（updated_by = seed）
 */
import { NEUTRAL_ACCENT, parseCatalogDocument, type SeedDiscography } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import discography from '../seed/discography.json';
import { seedAlbums, SEED_ACTOR } from '../src/seed/seedAlbums';
import seedWorker from '../src/seed/worker';
import { albumRow, countOf as count, insertAlbum } from './albumFixtures';
import { CATALOG_KEY } from './catalogFixtures';

const { albums } = discography as unknown as SeedDiscography;
const EXPECTED_ALBUMS = 21;

describe('seedAlbums', () => {
    it('should insert the 21 albums and no tracks', async () => {
        const report = await seedAlbums(env, albums);
        expect(report.inserted).toHaveLength(EXPECTED_ALBUMS);
        expect(report.existing).toEqual([]);
        expect(report.ordinalTaken).toEqual([]);
        expect(await count('albums')).toBe(EXPECTED_ALBUMS);
        expect(await count('tracks')).toBe(0);
    });

    it('should write the album fields with a neutral accent and no folder or cover', async () => {
        await seedAlbums(env, albums);
        const source = albums.find(({ id }) => id === 'apollo-18');
        expect(await albumRow('apollo-18')).toMatchObject({
            title: source?.title,
            wheel_key: source?.wheelKey,
            category: 'album',
            category_no: 1,
            year: source?.year,
            label: source?.label,
            accent: NEUTRAL_ACCENT,
            sort_order: source?.order,
            folder: null,
            cover: null,
            thumb: null,
            cover_source_etag: null,
            cover2: null,
        });
    });

    it('should generate a valid catalog once with 21 albums and 0 tracks', async () => {
        const report = await seedAlbums(env, albums);
        expect(report.catalog).toMatchObject({ ok: true, albumCount: 21, trackCount: 0 });
        const stored = await (await env.CATALOG.get(CATALOG_KEY))?.json();
        expect(parseCatalogDocument(stored).ok).toBe(true);
        const actor = await env.DB.prepare('SELECT updated_by FROM catalog_state').first(
            'updated_by',
        );
        expect(actor).toBe(SEED_ACTOR);
    });

    it('should not overwrite albums that already exist when run again', async () => {
        await seedAlbums(env, albums);
        await env.DB.prepare("UPDATE albums SET title = 'Edited' WHERE id = 'apollo-18'").run();
        const report = await seedAlbums(env, albums);
        expect(report.inserted).toEqual([]);
        expect(report.existing).toHaveLength(EXPECTED_ALBUMS);
        expect((await albumRow('apollo-18'))?.title).toBe('Edited');
    });

    it('should skip and report an album whose ordinal the admin gave to another album', async () => {
        await insertAlbum('my-album', 0, { category: 'album', category_no: 2 });
        const report = await seedAlbums(env, albums);
        expect(report.ordinalTaken).toEqual([
            { id: 'beaming', category: 'album', categoryNo: 2, takenBy: 'my-album' },
        ]);
        expect(report.inserted).toHaveLength(EXPECTED_ALBUMS - 1);
        expect(await albumRow('beaming')).toBeNull();
    });

    it('should still generate the catalog when every album already exists', async () => {
        await seedAlbums(env, albums);
        await env.CATALOG.delete(CATALOG_KEY);
        const report = await seedAlbums(env, albums);
        expect(report.catalog.ok).toBe(true);
        expect(await env.CATALOG.head(CATALOG_KEY)).not.toBeNull();
    });
});

describe('seed worker', () => {
    it('should seed the albums from discography.json and answer with the report', async () => {
        const response = await seedWorker.fetch(new Request('http://seed.local/'), env);
        const report = await response.json<{ inserted: string[] }>();
        expect(report.inserted).toHaveLength(EXPECTED_ALBUMS);
    });
});
