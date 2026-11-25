import { parseCatalogDocument } from './parseCatalogDocument';
import type { CatalogAlbum, CatalogDocument, CatalogTrack } from './types';

const track = (overrides: Partial<CatalogTrack> = {}): CatalogTrack => ({
    id: 'apollo-18-01',
    no: 1,
    title: '一早地下鐵',
    subtitle: null,
    credits: { composer: '阿正', lyricist: 'Tim Lui / 6號', arranger: '阿正', producer: null },
    audio: 'apollo-18/01 一早地下鐵.m4a',
    mv: null,
    lyrics: null,
    ...overrides,
});

const album = (overrides: Partial<CatalogAlbum> = {}): CatalogAlbum => ({
    id: 'apollo-18',
    title: 'Apollo 18',
    wheelKey: 'A',
    releaseDate: '2008-09-26',
    year: 2008,
    type: '錄音室專輯',
    label: '金牌娛樂',
    accent: '#c8442b',
    cover: '9f2c1a7b3d4e5f60.webp',
    thumb: '1a2b3c4d5e6f7081.webp',
    tracks: [track()],
    ...overrides,
});

const document = (overrides: Partial<CatalogDocument> = {}): CatalogDocument => ({
    version: 1,
    generatedAt: '2026-11-24T16:50:00.000Z',
    mediaBase: 'https://media.example/',
    imageBase: 'https://api.example/catalog/v1/img/',
    lyricsBase: 'https://api.example/catalog/v1/lyrics/',
    albums: [album()],
    ...overrides,
});

/** 驗證失敗時攞返 error 嘅 path */
const errorPaths = (input: unknown) => {
    const result = parseCatalogDocument(input);
    return result.ok ? [] : result.errors.map((error) => error.path);
};

describe('parseCatalogDocument', () => {
    it('should accept a well-formed document and return it', () => {
        const input = document();
        expect(parseCatalogDocument(input)).toEqual({ ok: true, document: input });
    });

    it('should accept nullable fields being null', () => {
        const input = document({
            albums: [
                album({
                    releaseDate: null,
                    year: null,
                    cover: null,
                    thumb: null,
                    tracks: [track({ credits: null, audio: null })],
                }),
            ],
        });
        expect(parseCatalogDocument(input).ok).toBe(true);
    });

    it('should accept an empty album list', () => {
        expect(parseCatalogDocument(document({ albums: [] })).ok).toBe(true);
    });

    it.each([null, undefined, 'catalog', 42, []])('should reject a non-object root %j', (input) => {
        expect(errorPaths(input)).toEqual(['$']);
    });

    it('should reject an unknown version', () => {
        expect(errorPaths({ ...document(), version: 2 })).toEqual(['version']);
    });

    it('should reject a base URL that is not https or lacks the trailing slash', () => {
        const input = {
            ...document(),
            mediaBase: 'http://media.example/',
            imageBase: 'https://api.example/img',
        };
        expect(errorPaths(input)).toEqual(['mediaBase', 'imageBase']);
    });

    it('should reject a malformed generatedAt', () => {
        expect(errorPaths({ ...document(), generatedAt: 'yesterday' })).toEqual(['generatedAt']);
    });

    it('should point at the album field that is wrong', () => {
        const input = document({
            albums: [
                album({ id: 'Apollo 18', accent: 'red', wheelKey: 'ABC', year: 2008.5 as number }),
            ],
        });
        expect(errorPaths(input)).toEqual([
            'albums[0].id',
            'albums[0].wheelKey',
            'albums[0].year',
            'albums[0].accent',
        ]);
    });

    it('should reject the reserved album id', () => {
        expect(errorPaths(document({ albums: [album({ id: 'favourites' })] }))).toEqual([
            'albums[0].id',
        ]);
    });

    it('should reject a malformed release date', () => {
        expect(errorPaths(document({ albums: [album({ releaseDate: '26/09/2008' })] }))).toEqual([
            'albums[0].releaseDate',
        ]);
    });

    it('should point at the track field that is wrong', () => {
        const input = document({
            albums: [album({ tracks: [track({ id: 'Bad Id', no: 0, title: '' })] })],
        });
        expect(errorPaths(input)).toEqual([
            'albums[0].tracks[0].id',
            'albums[0].tracks[0].no',
            'albums[0].tracks[0].title',
        ]);
    });

    it('should reject credits with a missing field', () => {
        const credits = {
            composer: '阿正',
            lyricist: null,
            arranger: null,
        } as unknown as CatalogTrack['credits'];
        expect(errorPaths(document({ albums: [album({ tracks: [track({ credits })] })] }))).toEqual(
            ['albums[0].tracks[0].credits.producer'],
        );
    });

    it('should reject duplicate album ids', () => {
        const input = document({ albums: [album(), album()] });
        const result = parseCatalogDocument(input);
        expect(result.ok).toBe(false);
        expect(errorPaths(input)).toContain('albums[1].id');
    });

    it('should reject a track id used twice, even across albums', () => {
        const input = document({
            albums: [album(), album({ id: 'beaming', tracks: [track({ id: 'apollo-18-01' })] })],
        });
        expect(errorPaths(input)).toEqual(['albums[1].tracks[0].id']);
    });

    it('should reject a track number used twice in one album', () => {
        const input = document({
            albums: [album({ tracks: [track(), track({ id: 'apollo-18-02', no: 1 })] })],
        });
        expect(errorPaths(input)).toEqual(['albums[0].tracks[1].no']);
    });

    it('should describe each error with a code', () => {
        const result = parseCatalogDocument({ ...document(), version: 2 });
        expect(result).toEqual({
            ok: false,
            errors: [{ path: 'version', code: 'UNSUPPORTED_VERSION' }],
        });
    });
});
