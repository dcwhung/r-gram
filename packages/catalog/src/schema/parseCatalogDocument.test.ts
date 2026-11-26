import { parseCatalogDocument } from './parseCatalogDocument';
import type { Fields } from './issues';
import type { CatalogAlbum, CatalogDocument, CatalogTrack } from './types';

const track = (overrides: Partial<CatalogTrack> = {}): CatalogTrack => ({
    id: 'apollo-18-01',
    no: 1,
    title: '一早地下鐵',
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
    year: 2008,
    category: 'album',
    categoryNo: 1,
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

/** 刪走某啲欄位（模擬漏咗欄嘅文件） */
const without = (value: CatalogAlbum, ...keys: ('category' | 'categoryNo')[]): Fields => {
    const copy: Fields = { ...value };
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

    // CR-007（Technical Spec「內容檔」）：專輯刪 label、歌刪 subtitle；播放端本機存住嘅舊 document 有呢兩個欄，照樣有效
    it('should still accept a document stored before CR-007 with label and subtitle', () => {
        const old = {
            ...document(),
            albums: [{ ...album(), label: '金牌娛樂', tracks: [{ ...track(), subtitle: 'Live' }] }],
        };
        expect(parseCatalogDocument(old)).toEqual({ ok: true, document: old });
    });

    it('should not check the old label and subtitle fields any more', () => {
        const old = {
            ...document(),
            albums: [{ ...album(), label: 7, tracks: [{ ...track(), subtitle: '' }] }],
        };
        expect(errorPaths(old)).toEqual([]);
    });

    it('should accept a track without audio, MV, lyrics or credits (a grey row)', () => {
        const grey = track({ audio: null, mv: null, lyrics: null, credits: null });
        expect(errorPaths(document({ albums: [album({ tracks: [grey] })] }))).toEqual([]);
    });

    it('should accept nullable fields being null', () => {
        const input = document({
            albums: [
                album({
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

    // CR-006（Functional Spec D63、D44）：專輯只有年份（可選），冇發行日期、冇自由文字類型
    it.each([1899, 2101, 0, -2008, 2008.5, '2008', Number.NaN])(
        'should reject the year %j',
        (year) => {
            expect(errorPaths(document({ albums: [album({ year: year as number })] }))).toEqual([
                'albums[0].year',
            ]);
        },
    );

    it.each([1900, 2016, 2100])('should accept the year %j', (year) => {
        expect(parseCatalogDocument(document({ albums: [album({ year })] })).ok).toBe(true);
    });

    it('should not look at a release date or a free-text type any more', () => {
        const old = { ...album(), releaseDate: '26/09/2008', type: 42 };
        expect(errorPaths(document({ albums: [old as CatalogAlbum] }))).toEqual([]);
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

        // Technical Spec API-072：兩個欄都係必填，漏晒都唔收
        it('should reject an album without both fields', () => {
            const bare = without(album(), 'category', 'categoryNo');
            expect(parseCatalogDocument({ ...document(), albums: [bare] })).toEqual({
                ok: false,
                errors: [
                    { path: 'albums[0].category', code: 'INVALID_CATEGORY' },
                    { path: 'albums[0].categoryNo', code: 'INVALID_NUMBER' },
                ],
            });
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
            expect(errorPaths({ ...document(), albums: [noOrdinal, noCategory] })).toEqual([
                'albums[0].categoryNo',
                'albums[1].category',
            ]);
        });
    });

    // CR-005（D55、FR-125）：可選嘅第二張封面；要成對，亦要有第一張。冇呢兩個欄嘅舊 document 照收
    describe('second cover', () => {
        const SECOND = { cover2: 'c2c2c2c2c2c2c2c2.webp', thumb2: 't2t2t2t2t2t2t2t2.webp' };

        it('should accept an album without the second cover fields', () => {
            const input = document();
            expect('cover2' in input.albums[0]!).toBe(false);
            expect(parseCatalogDocument(input).ok).toBe(true);
        });

        it('should accept a second cover with its thumb next to a first cover', () => {
            expect(parseCatalogDocument(document({ albums: [album(SECOND)] })).ok).toBe(true);
        });

        it('should accept both second cover fields being null, with or without a first cover', () => {
            const cleared = { cover2: null, thumb2: null };
            const albums = [
                album(cleared),
                album({ ...cleared, id: 'beaming', cover: null, thumb: null, tracks: [] }),
            ];
            expect(parseCatalogDocument(document({ albums })).ok).toBe(true);
        });

        it('should reject a second cover without its thumb, and a thumb without its cover', () => {
            const albums = [
                album({ cover2: SECOND.cover2 }),
                album({ id: 'beaming', cover2: SECOND.cover2, thumb2: null, tracks: [] }),
                album({ id: 'room', thumb2: SECOND.thumb2, tracks: [] }),
            ];
            expect(parseCatalogDocument(document({ albums }))).toEqual({
                ok: false,
                errors: [
                    { path: 'albums[0].thumb2', code: 'UNPAIRED_COVER2' },
                    { path: 'albums[1].thumb2', code: 'UNPAIRED_COVER2' },
                    { path: 'albums[2].cover2', code: 'UNPAIRED_COVER2' },
                ],
            });
        });

        it('should reject a second cover on an album without a first cover', () => {
            const input = document({ albums: [album({ ...SECOND, cover: null })] });
            expect(parseCatalogDocument(input)).toEqual({
                ok: false,
                errors: [{ path: 'albums[0].cover2', code: 'COVER2_WITHOUT_COVER' }],
            });
        });

        it.each(['', '  ', 3])('should reject the second cover name %j', (name) => {
            const input = document({
                albums: [album({ cover2: name as never, thumb2: name as never })],
            });
            expect(errorPaths(input)).toEqual(['albums[0].cover2', 'albums[0].thumb2']);
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
