import { formatTime, padTrackNumber } from './formatTime';

describe('formatTime', () => {
    it.each([
        [0, '0:00'],
        [41, '0:41'],
        [41.9, '0:41'],
        [60, '1:00'],
        [605, '10:05'],
        [3725, '62:05'],
    ])('should show %f seconds as %s', (seconds, text) => {
        expect(formatTime(seconds)).toBe(text);
    });

    it('should treat a negative or unknown position as zero', () => {
        expect(formatTime(-3)).toBe('0:00');
        expect(formatTime(Number.NaN)).toBe('0:00');
    });
});

describe('padTrackNumber', () => {
    it('should pad the track number to two digits as in the mockup', () => {
        expect(padTrackNumber(7)).toBe('07');
        expect(padTrackNumber(12)).toBe('12');
        expect(padTrackNumber(123)).toBe('123');
    });
});
