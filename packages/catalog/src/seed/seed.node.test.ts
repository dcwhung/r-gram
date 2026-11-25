import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCatalogDocument } from '../schema/parseCatalogDocument';
import { matchCredits } from './matchCredits';
import { seedToCatalog } from './seedToCatalog';
import type { SeedCredits, SeedDiscography } from './types';

// 真實初始資料（apps/api/seed/）：鎖住 Functional Spec US-109 寫明嘅配對結果
const readSeed = <T>(name: string): T =>
    JSON.parse(
        readFileSync(
            fileURLToPath(new URL(`../../../../apps/api/seed/${name}`, import.meta.url)),
            'utf8',
        ),
    ) as T;
const discography = readSeed<SeedDiscography>('discography.json');
const credits = readSeed<SeedCredits>('credits.json');

const EXPECTED_ALBUMS = 17;
const EXPECTED_TRACKS = 262;

describe('seed data', () => {
    it('should match credits as the spec states: 187 direct, 22 by title, 53 missing', () => {
        const { stats, byTrackId } = matchCredits(discography, credits);
        expect(stats).toEqual({ direct: 187, byTitle: 22, missing: 53 });
        expect(Object.keys(byTrackId)).toHaveLength(187 + 22);
    });

    it('should build a catalog document that passes the validator', () => {
        const document = seedToCatalog(discography, credits, {
            generatedAt: '2026-11-25T00:00:00.000Z',
            mediaBase: 'https://media.example/',
            imageBase: 'https://api.example/catalog/v1/img/',
            lyricsBase: 'https://api.example/catalog/v1/lyrics/',
        });
        const result = parseCatalogDocument(document);
        expect(result).toEqual({ ok: true, document });
        expect(document.albums).toHaveLength(EXPECTED_ALBUMS);
        expect(document.albums.flatMap((album) => album.tracks)).toHaveLength(EXPECTED_TRACKS);
    });
});
