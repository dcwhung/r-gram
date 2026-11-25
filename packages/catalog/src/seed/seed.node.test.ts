import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCatalogDocument } from '../schema/parseCatalogDocument';
import { trackIdFor } from '../schema/ids';
import { expectedFolder, RELEASE_CATEGORIES } from '../schema/releaseCategory';
import { wheelKeyFor } from '../wheel/wheelKeyFor';
import { matchCredits } from './matchCredits';
import { seedToCatalog } from './seedToCatalog';
import type { SeedCredits, SeedDiscography } from './types';

// 真實初始資料（apps/api/seed/，由 _design_/tools/ 嘅 script 由 2026-11-25 版來源檔生成；CR-004、T-097）
const readJson = <T>(relative: string): T =>
    JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')) as T;
const readSeed = <T>(name: string): T => readJson<T>(`../../../../apps/api/seed/${name}`);
const discography = readSeed<SeedDiscography>('discography.json');
const credits = readSeed<SeedCredits>('credits.json');

/** CR-004 之前嘅歌 id（commit bce4dde 嘅 discography.json，凍結）：用戶本機收藏同續播靠佢哋 */
const previous = readJson<{ tracks: { id: string; albumId: string; title: string }[] }>(
    './testing/previousTrackIds.json',
);

const EXPECTED_ALBUMS = 21;
const EXPECTED_TRACKS = 291;
const EXPECTED_CREDIT_ROWS = 252;
const SOUNDTRACK_ALBUM_ID = 'men-on-the-dragon-ost';
const SOUNDTRACK_TRACKS_WITHOUT_CREDITS = 39;
/** 已取消嘅假專輯「單曲（未收錄於專輯）」；佢唯一一首歌 Ciao 而家係迷你專輯《在一起》第 1 首 */
const FORMER_SINGLES_ALBUM_ID = 'singles';

/** 交咗畀用戶照住開資料夾嘅清單（Implementation Plan U-13）：一個字都唔可以變 */
const EXPECTED_FOLDERS = [
    'album-01-apollo-18',
    'album-02-beaming',
    'album-03-connected',
    'album-04-dedicated-to',
    'album-05-easy',
    'album-06-frank',
    'album-07-gotta-go',
    'album-08-hours',
    'album-09-i',
    'album-10-juntos',
    'album-11-komorebi',
    'ep-01-frank-ep',
    'ep-02-ni-dou',
    'ep-03-zoi-jat-hei',
    'best-01-zoeng-ngaa',
    'best-02-we-are-rubberband',
    'live-01-rubberband-concert-1',
    'live-02-rubberband-ciao-2021-live',
    'ost-01-men-on-the-dragon-ost',
    'single-01-zung-jyu-hou-tin-hei',
    'single-02-joeng-sai-gaai-dou-dung',
];

const byOrder = [...discography.albums].sort((a, b) => a.order - b.order);
const tracksById = new Map(
    discography.albums.flatMap((album) =>
        album.tracks.map((track) => [trackIdFor(album.id, track.no), track.title] as const),
    ),
);

describe('seed data: releases', () => {
    it('should give every release the folder name the user was given, in D47 order', () => {
        const folders = byOrder.map((album) =>
            expectedFolder(album.category, album.categoryNo, album.id),
        );
        expect(folders).toEqual(EXPECTED_FOLDERS);
    });

    it('should number the order 0..20 by category, then by ordinal (D47)', () => {
        expect(byOrder.map((album) => album.order)).toEqual([...Array(EXPECTED_ALBUMS).keys()]);
        const rank = byOrder.map((album) => [
            RELEASE_CATEGORIES.indexOf(album.category),
            album.categoryNo,
        ]);
        const sorted = [...rank].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
        expect(rank).toEqual(sorted);
    });

    it('should number each category from 1 without gaps', () => {
        for (const category of RELEASE_CATEGORIES) {
            const numbers = byOrder
                .filter((album) => album.category === category)
                .map((album) => album.categoryNo);
            expect(numbers, category).toEqual(numbers.map((_, index) => index + 1));
        }
    });

    it('should give every release the default wheel key of its title', () => {
        for (const album of discography.albums) {
            expect(album.wheelKey, album.title).toBe(wheelKeyFor(album.title));
        }
    });
});

describe('seed data: track ids', () => {
    it('should keep every track id of the 16 releases that existed before, with its song', () => {
        const kept = previous.tracks.filter((t) => t.albumId !== FORMER_SINGLES_ALBUM_ID);
        expect(new Set(kept.map((track) => track.albumId)).size).toBe(16);
        const changed = kept.filter((track) => tracksById.get(track.id) !== track.title);
        expect(changed).toEqual([]);
    });

    it('should drop the former singles pseudo-album; Ciao is now on the EP 在一起', () => {
        const formerIds = previous.tracks.filter((t) => t.albumId === FORMER_SINGLES_ALBUM_ID);
        expect(formerIds).toEqual([{ id: 'singles-01', albumId: 'singles', title: 'Ciao' }]);
        expect(tracksById.has('singles-01')).toBe(false);
        expect(tracksById.get('zoi-jat-hei-01')).toBe('Ciao');
    });
});

describe('seed data: credits and catalog', () => {
    it('should cover all 21 releases with 252 credit rows, each tied to a release id', () => {
        const ids = new Set(discography.albums.map((album) => album.id));
        expect(credits.albums).toHaveLength(EXPECTED_ALBUMS);
        expect(credits.albums.every((album) => ids.has(album.albumId))).toBe(true);
        expect(credits.albums.flatMap((album) => album.tracks)).toHaveLength(EXPECTED_CREDIT_ROWS);
    });

    // US-109：配對結果（T-097 重新生成之後嘅數字）：246 首直接對到、0 首靠同名歌補、45 首冇
    it('should match credits: 246 direct, 0 by title, 45 missing', () => {
        const { stats, byTrackId } = matchCredits(discography, credits);
        expect(stats).toEqual({ direct: 246, byTitle: 0, missing: 45 });
        expect(Object.keys(byTrackId)).toHaveLength(246);
    });

    // 45 首冇 credit 嘅歌入面，39 首係《逆流大叔》原聲大碟嘅配樂
    it('should leave 39 tracks of the film soundtrack without credits', () => {
        const { byTrackId } = matchCredits(discography, credits);
        const soundtrack = discography.albums.find((album) => album.id === SOUNDTRACK_ALBUM_ID);
        const missing = soundtrack?.tracks.filter(
            (track) => !byTrackId[trackIdFor(SOUNDTRACK_ALBUM_ID, track.no)],
        );
        expect(missing).toHaveLength(SOUNDTRACK_TRACKS_WITHOUT_CREDITS);
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
        expect(document.albums[0]).toMatchObject({ category: 'album', categoryNo: 1 });
    });
});
