import { createTapCounter, isInside, tapZone } from './tapZone';

const tapAll = (times: number[]) => {
    const tap = createTapCounter();
    return times.map((time) => tap(time));
};

describe('createTapCounter', () => {
    it('should fire on the fifth tap within three seconds', () => {
        expect(tapAll([0, 100, 200, 300, 400])).toEqual([false, false, false, false, true]);
    });

    it('should count five taps that span exactly three seconds', () => {
        expect(tapAll([0, 750, 1500, 2250, 3000]).at(-1)).toBe(true);
    });

    it('should drop taps older than the window', () => {
        expect(tapAll([0, 1000, 2000, 3000, 3100, 3200])).toEqual([
            false,
            false,
            false,
            false,
            false,
            true,
        ]);
    });

    it('should start again after it fires', () => {
        expect(tapAll([0, 10, 20, 30, 40, 50, 60, 70, 80, 90])).toEqual([
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            true,
        ]);
    });

    it('should take the count and window as parameters', () => {
        const tap = createTapCounter(2, 100);
        expect([tap(0), tap(150), tap(200)]).toEqual([false, false, true]);
    });
});

describe('tapZone', () => {
    it('should grow a small label to the minimum height and run to the right edge', () => {
        const label = { left: 300, top: 50, right: 340, bottom: 60 };
        expect(tapZone(label, 393)).toEqual({ left: 300, top: 33, right: 393, bottom: 77 });
    });

    it('should keep at least the minimum width', () => {
        const label = { left: 380, top: 50, right: 390, bottom: 100 };
        expect(tapZone(label, 393)).toEqual({ left: 349, top: 50, right: 393, bottom: 100 });
    });
});

describe('isInside', () => {
    const zone = { left: 10, top: 10, right: 20, bottom: 20 };

    it.each([
        [10, 10, true],
        [20, 20, true],
        [15, 15, true],
        [9, 15, false],
        [15, 21, false],
    ])('should report (%d, %d) inside = %s', (x, y, inside) => {
        expect(isInside({ x, y }, zone)).toBe(inside);
    });
});
