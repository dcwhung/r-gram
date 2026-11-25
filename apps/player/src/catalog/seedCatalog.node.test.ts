// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seedToCatalog, type SeedCredits, type SeedDiscography } from '@r-gram/catalog';
import { createCatalogStore } from './catalogStore';
import { loadCatalog } from './loader';
import { albumTracks, dialAlbums, playableTracks } from './selectors';
import { FIXTURE_CATALOG_URL, jsonResponse, memoryStorage } from './testing/catalogFixtures';

// 真實初始資料（apps/api/seed/，由 _design_/tools/ 生成）砌出嚟嘅 catalog：播放端讀得到成份
const readSeed = <T>(name: string): T =>
    JSON.parse(
        readFileSync(fileURLToPath(new URL(`../../../api/seed/${name}`, import.meta.url)), 'utf8'),
    ) as T;

const EXPECTED_ALBUMS = 17;
const TIMEOUT_MS = 1000;

/** 每隻碟淨係第 1 首有音檔，其餘係灰色行 */
const firstTrackOnly = (albumId: string, track: { no: number }) => ({
    audio: track.no === 1 ? `${albumId}/01.m4a` : null,
    mv: null,
});

const seedDocument = () =>
    seedToCatalog(
        readSeed<SeedDiscography>('discography.json'),
        readSeed<SeedCredits>('credits.json'),
        {
            generatedAt: '2026-11-25T00:00:00.000Z',
            mediaBase: 'https://media.example/',
            imageBase: 'https://api.example/catalog/v1/img/',
            lyricsBase: 'https://api.example/catalog/v1/lyrics/',
            mediaFor: firstTrackOnly,
        },
    );

describe('loadCatalog with the seed catalog', () => {
    it('should load, store and reload the full seed catalog', async () => {
        const document = seedDocument();
        const storage = memoryStorage();
        const deps = {
            url: FIXTURE_CATALOG_URL,
            fetch: () => Promise.resolve(jsonResponse(document)),
            store: createCatalogStore(storage),
            timeoutMs: TIMEOUT_MS,
        };
        const result = await loadCatalog(deps);
        expect(result).toEqual({ status: 'ready', source: 'network', document });

        const offline = await loadCatalog({
            ...deps,
            fetch: () => Promise.reject(new TypeError()),
        });
        expect(offline).toMatchObject({ status: 'ready', source: 'cache', document });
        expect(dialAlbums(document)).toHaveLength(EXPECTED_ALBUMS);
        const first = dialAlbums(document)[0];
        expect(first && playableTracks(albumTracks(document, first.id))).toHaveLength(1);
    });
});
