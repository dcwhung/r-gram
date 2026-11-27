import { appendEntry, formatEntry, LOG_LIMIT, recentTimes } from './log';

const entry = (t: number) => ({ t, type: 'resize', detail: `inner ${t}` });

describe('appendEntry', () => {
    it('should put the newest entry first', () => {
        const log = appendEntry(appendEntry([], entry(1)), entry(2));
        expect(log.map(({ t }) => t)).toEqual([2, 1]);
    });

    it('should keep only the last 40 entries', () => {
        const log = Array.from({ length: 45 }, (_, index) => entry(index)).reduce(
            (all, next) => appendEntry(all, next),
            [] as ReturnType<typeof appendEntry>,
        );
        expect(LOG_LIMIT).toBe(40);
        expect(log).toHaveLength(LOG_LIMIT);
        expect(log[0]?.t).toBe(44);
        expect(log.at(-1)?.t).toBe(5);
    });
});

describe('recentTimes', () => {
    it('should keep the times within the last second', () => {
        expect(recentTimes([0, 500, 1001, 1999, 2000], 2000)).toEqual([1001, 1999, 2000]);
    });

    it('should take the window as a parameter', () => {
        expect(recentTimes([0, 50, 90], 100, 20)).toEqual([90]);
    });
});

describe('formatEntry', () => {
    it('should show the rounded ms since load, the type and the detail', () => {
        expect(formatEntry({ t: 1234.6, type: 'key', detail: '393 735 0 0 → 393 852 59 34' })).toBe(
            '+1235ms key 393 735 0 0 → 393 852 59 34',
        );
    });

    it('should not leave a trailing space without a detail', () => {
        expect(formatEntry({ t: 5, type: 'pageshow', detail: '' })).toBe('+5ms pageshow');
    });
});
