import {
    albumOrder,
    expectedFolder,
    isReleaseCategory,
    parseAlbumFolder,
    RELEASE_CATEGORIES,
    type ReleaseCategory,
} from './releaseCategory';

describe('RELEASE_CATEGORIES', () => {
    // Functional Spec D43：六個類別嘅短名，次序 = 用戶歌單檔嘅類別次序（D47）
    it('should list the six short names in the order of the source file', () => {
        expect(RELEASE_CATEGORIES).toEqual(['album', 'ep', 'best', 'live', 'ost', 'single']);
    });

    it.each(RELEASE_CATEGORIES)('should recognise %j', (category) => {
        expect(isReleaseCategory(category)).toBe(true);
    });

    it.each(['', 'Album', 'compilation', ' album', 'constructor', 1, null, undefined])(
        'should refuse %j',
        (value) => {
            expect(isReleaseCategory(value)).toBe(false);
        },
    );
});

describe('expectedFolder', () => {
    it.each([
        ['album', 1, 'apollo-18', 'album-01-apollo-18'],
        ['ep', 1, 'frank-ep', 'ep-01-frank-ep'],
        ['live', 2, 'rubberband-ciao-2021-live', 'live-02-rubberband-ciao-2021-live'],
        ['album', 10, 'juntos', 'album-10-juntos'],
    ] as const)('should name %s no. %i of %s as %s', (category, no, id, folder) => {
        expect(expectedFolder(category, no, id)).toBe(folder);
    });

    it('should print an ordinal of 100 or more with all its digits', () => {
        expect(expectedFolder('single', 100, 'x')).toBe('single-100-x');
    });
});

describe('parseAlbumFolder', () => {
    it.each([
        ['album-11-komorebi', 'album', 11, 'komorebi'],
        ['album-01-apollo-18', 'album', 1, 'apollo-18'],
        ['ep-01-frank-ep', 'ep', 1, 'frank-ep'],
        ['live-02-rubberband-ciao-2021-live', 'live', 2, 'rubberband-ciao-2021-live'],
        ['single-100-x', 'single', 100, 'x'],
        ['ost-07-1-2-3', 'ost', 7, '1-2-3'],
    ] as const)('should read %s', (name, category, categoryNo, id) => {
        expect(parseAlbumFolder(name)).toEqual({ category, categoryNo, id });
    });

    it.each([
        ['', 'empty'],
        ['_fonts', 'reserved'],
        ['komorebi', 'no category or number'],
        ['Album-11-komorebi', 'upper-case category'],
        ['album-1-komorebi', 'one-digit number'],
        ['album-1000-komorebi', 'four-digit number'],
        ['album-00-komorebi', 'number zero'],
        ['album-000-komorebi', 'number zero (three digits)'],
        ['mixtape-01-x', 'unknown category'],
        ['album-01-', 'no id'],
        ['album-01-Komorebi', 'upper-case id'],
        ['album-01-komorebi-', 'trailing hyphen'],
        ['album-01-a--b', 'double hyphen'],
        ['album-01-favourites', 'reserved id'],
        ['album-01-komorebi/', 'slash'],
        ['album-01-..', 'dots'],
        [' album-01-komorebi', 'leading space'],
        ['album-01-komorebi\n', 'line break'],
    ])('should refuse %j (%s)', (name) => {
        expect(parseAlbumFolder(name)).toBeUndefined();
    });

    it('should be the reverse of expectedFolder', () => {
        const name = expectedFolder('best', 3, 'the-best');
        expect(parseAlbumFolder(name)).toEqual({ category: 'best', categoryNo: 3, id: 'the-best' });
    });
});

describe('albumOrder', () => {
    const album = (category: ReleaseCategory, categoryNo: number, id: string) => ({
        category,
        categoryNo,
        id,
    });
    const nameOf = (a: ReturnType<typeof album>) => `${a.category}-${a.categoryNo}-${a.id}`;

    it('should sort by category order, then number, then id', () => {
        const albums = [
            album('single', 1, 'a'),
            album('album', 2, 'b'),
            album('ep', 1, 'c'),
            album('album', 1, 'z'),
            album('album', 1, 'y'),
            album('album', 10, 'a'),
        ];
        expect(albums.sort(albumOrder).map(nameOf)).toEqual([
            'album-1-y',
            'album-1-z',
            'album-2-b',
            'album-10-a',
            'ep-1-c',
            'single-1-a',
        ]);
    });

    it('should compare ids by code unit, not by locale', () => {
        expect(albumOrder(album('album', 1, 'b'), album('album', 1, 'a-z'))).toBeGreaterThan(0);
        expect(albumOrder(album('album', 1, 'a'), album('album', 1, 'a'))).toBe(0);
        expect(albumOrder(album('album', 1, 'a1'), album('album', 1, 'a-1'))).toBeGreaterThan(0);
        // S-159：英文細楷、數字同 `-` 嘅 id，語系次序同 code unit 一樣；大楷先分得出（code unit：`B` < `a`）
        expect(albumOrder(album('album', 1, 'a'), album('album', 1, 'B'))).toBeGreaterThan(0);
    });
});
