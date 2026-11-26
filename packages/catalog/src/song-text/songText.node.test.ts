import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { seedToCatalog } from '../seed/seedToCatalog';
import type { SeedCredits, SeedDiscography } from '../seed/types';
import { formatSongText } from './formatSongText';
import { parseSongText } from './parseSongText';

// 真實初始資料（apps/api/seed/）：全部歌嘅歌名、credit 經文字框格式行一轉都唔變
const readSeed = <T>(name: string): T =>
    JSON.parse(
        readFileSync(
            fileURLToPath(new URL(`../../../../apps/api/seed/${name}`, import.meta.url)),
            'utf8',
        ),
    ) as T;

const EXPECTED_TRACKS = 291;

const tracks = seedToCatalog(
    readSeed<SeedDiscography>('discography.json'),
    readSeed<SeedCredits>('credits.json'),
    {
        generatedAt: '2026-11-25T00:00:00.000Z',
        mediaBase: 'https://media.example/',
        imageBase: 'https://api.example/catalog/v1/img/',
        lyricsBase: 'https://api.example/catalog/v1/lyrics/',
    },
).albums.flatMap((album) => album.tracks);

describe('song text with the seed data', () => {
    it('should cover every seed track', () => {
        expect(tracks).toHaveLength(EXPECTED_TRACKS);
    });

    it('should round-trip the title and credits of every seed track', () => {
        const failures = tracks.filter(({ title, credits }) => {
            const song = { title, credits, lyrics: null };
            const parsed = parseSongText(formatSongText(song));
            return !isDeepStrictEqual(parsed, { ...song, errors: [], hints: [] });
        });
        expect(failures.map((track) => track.id)).toEqual([]);
    });
});
