import { isAlbumYear, YEAR_MAX, YEAR_MIN } from './year';

// CR-006（Functional Spec D63）：專輯只有年份（可選），API 同 validator 用同一個範圍
describe('isAlbumYear', () => {
    it('should allow the years from 1900 to 2100', () => {
        expect([YEAR_MIN, YEAR_MAX]).toEqual([1900, 2100]);
    });

    it.each([1900, 2008, 2016, 2100])('should accept %j', (value) => {
        expect(isAlbumYear(value)).toBe(true);
    });

    it.each([1899, 2101, 0, -2008, 2008.5, Number.NaN, '2008', null, undefined])(
        'should refuse %j',
        (value) => {
            expect(isAlbumYear(value)).toBe(false);
        },
    );
});
