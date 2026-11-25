import { isTrackNo, TRACK_NO_MAX, TRACK_NO_MIN, trackIdFor } from './ids';

describe('trackIdFor', () => {
    // Functional Spec D61：建立時嘅歌 id = `<專輯 id>-<兩位歌號>`，跳號照用檔名嘅歌號
    it.each([
        [1, 'apollo-18-01'],
        [7, 'apollo-18-07'],
        [15, 'apollo-18-15'],
        [120, 'apollo-18-120'],
    ])('should pad track %i to at least two digits', (no, expected) => {
        expect(trackIdFor('apollo-18', no)).toBe(expected);
    });
});

describe('isTrackNo', () => {
    // Functional Spec D60：歌號 1 至 999，可以跳號
    it('should allow track numbers from 1 to 999', () => {
        expect([TRACK_NO_MIN, TRACK_NO_MAX]).toEqual([1, 999]);
    });

    it.each([1, 2, 7, 999])('should accept %j', (value) => {
        expect(isTrackNo(value)).toBe(true);
    });

    it.each([0, -1, 1000, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '3', null, undefined])(
        'should refuse %j',
        (value) => {
            expect(isTrackNo(value)).toBe(false);
        },
    );
});
