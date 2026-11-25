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
    category: 'album',
    categoryNo: 1,
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

/** 刪走某啲（選填）欄位 */
const without = (value: CatalogAlbum, ...keys: ('category' | 'categoryNo')[]): CatalogAlbum => {
    const copy = { ...value };
    keys.forEach((key) => delete copy[key]);
    return copy;
};

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

    // S-001：base 之後會直接駁 R2 key，唔可以有 query、fragment 或者 userinfo
    it.each([
        'https://m.example/?x=/',
        'https://m.example/#/',
        'https://user@evil.example/',
        'https://m.example/a b/',
        'https:///',
    ])('should reject the base URL %j', (mediaBase) => {
        expect(errorPaths({ ...document(), mediaBase })).toEqual(['mediaBase']);
    });

    it.each([
        'https://m.example/',
        'https://api.example/catalog/v1/img/',
        'https://m.example:8443/a/',
    ])('should accept the base URL %j', (mediaBase) => {
        expect(parseCatalogDocument({ ...document(), mediaBase }).ok).toBe(true);
    });

    // S-002
    it.each([' ', '\n', ' A'])('should reject the blank or padded wheel key %j', (wheelKey) => {
        expect(errorPaths(document({ albums: [album({ wheelKey })] }))).toEqual([
            'albums[0].wheelKey',
        ]);
    });

    it.each(['2008-13-45', '2008-02-30', '2008-00-10'])(
        'should reject the impossible release date %j',
        (releaseDate) => {
            expect(errorPaths(document({ albums: [album({ releaseDate })] }))).toEqual([
                'albums[0].releaseDate',
            ]);
        },
    );

    it('should accept a leap day', () => {
        expect(
            parseCatalogDocument(document({ albums: [album({ releaseDate: '2024-02-29' })] })).ok,
        ).toBe(true);
    });

    it.each(['1', 'Nov 24 2026', '2026-11-24', '2026-11-24T16:50:00'])(
        'should reject generatedAt %j that is not a full ISO 8601 instant',
        (generatedAt) => {
            expect(errorPaths({ ...document(), generatedAt })).toEqual(['generatedAt']);
        },
    );

    it.each(['2026-11-24T16:50:00Z', '2026-11-24T16:50:00.000Z', '2026-11-25T00:50:00+08:00'])(
        'should accept generatedAt %j',
        (generatedAt) => {
            expect(parseCatalogDocument({ ...document(), generatedAt }).ok).toBe(true);
        },
    );

    // S-003：結構錯（唔係 array / object）
    it.each([
        [{ albums: {} }, ['albums']],
        [{ albums: [null] }, ['albums[0]']],
        [{ albums: [{ ...album(), tracks: 'x' }] }, ['albums[0].tracks']],
        [{ albums: [{ ...album(), tracks: [42] }] }, ['albums[0].tracks[0]']],
        [
            { albums: [album({ tracks: [track({ credits: [] as never })] })] },
            ['albums[0].tracks[0].credits'],
        ],
    ])('should report the structural error in %j', (overrides, expected) => {
        expect(errorPaths({ ...document(), ...overrides })).toEqual(expected);
    });

    // CR-004（FR-124）：發行類別同類別內序號；播放端唔顯示，但驗證要收
    describe('release category and ordinal', () => {
        it('should accept every release category with a positive ordinal', () => {
            const albums = ['album', 'ep', 'best', 'live', 'ost', 'single'].map((category, i) =>
                album({
                    id: `a${i}`,
                    category: category as CatalogAlbum['category'],
                    categoryNo: i + 1,
                    tracks: [],
                }),
            );
            expect(parseCatalogDocument(document({ albums })).ok).toBe(true);
        });

        it('should still accept an album without both fields', () => {
            const bare = without(album(), 'category', 'categoryNo');
            expect(parseCatalogDocument(document({ albums: [bare] })).ok).toBe(true);
        });

        it.each(['Album', 'compilation', '', null, 3])(
            'should reject the category %j with INVALID_CATEGORY',
            (category) => {
                const input = document({ albums: [album({ category: category as never })] });
                expect(parseCatalogDocument(input)).toEqual({
                    ok: false,
                    errors: [{ path: 'albums[0].category', code: 'INVALID_CATEGORY' }],
                });
            },
        );

        it.each([0, -1, 1.5, '1', null])('should reject the ordinal %j', (categoryNo) => {
            const input = document({ albums: [album({ categoryNo: categoryNo as never })] });
            expect(parseCatalogDocument(input)).toEqual({
                ok: false,
                errors: [{ path: 'albums[0].categoryNo', code: 'INVALID_NUMBER' }],
            });
        });

        it('should require the ordinal with a category and the category with an ordinal', () => {
            const noOrdinal = without(album(), 'categoryNo');
            const noCategory = without(album({ id: 'beaming', tracks: [] }), 'category');
            expect(errorPaths(document({ albums: [noOrdinal, noCategory] }))).toEqual([
                'albums[0].categoryNo',
                'albums[1].category',
            ]);
        });
    });

    it('should describe each error with a code', () => {
        const result = parseCatalogDocument({ ...document(), version: 2 });
        expect(result).toEqual({
            ok: false,
            errors: [{ path: 'version', code: 'UNSUPPORTED_VERSION' }],
        });
    });
});
