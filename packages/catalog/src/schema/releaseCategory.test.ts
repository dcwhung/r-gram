import { expectedFolder, isReleaseCategory, RELEASE_CATEGORIES } from './releaseCategory';

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
