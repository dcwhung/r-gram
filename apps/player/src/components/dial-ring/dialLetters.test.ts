import { scaleAngle } from '../../stage/geometry';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { dialClearance, dialLetterEvery, dialShowsLetter } from './dialLetters';

const DEG_TO_RAD = Math.PI / 180;
/** Technical Spec「字母盤嘅字母」：掃 1 至 30 張專輯 × 每個揀中位置 */
const ALBUM_COUNTS = Array.from({ length: 30 }, (_, index) => index + 1);
const ALL_LETTERS_UP_TO = 18;
const MAX_LETTERS = 9;

const shown = (current: number, positions: number) =>
    Array.from({ length: positions - 1 }, (_, pos) => pos).filter((pos) =>
        dialShowsLetter(LAYOUT, pos, current, positions),
    );

describe('dialLetterEvery', () => {
    it.each([
        [18, 1],
        [19, 2],
        [22, 3],
        [25, 3],
        [31, 4],
    ])('should show a letter every N positions for %d positions (N = %d)', (positions, every) => {
        expect(dialLetterEvery(LAYOUT, positions)).toBe(every);
    });
});

describe('dialClearance', () => {
    // 設計稿 DIAL_CLEARANCE = DIAL.letters × rad(11.25) × 1.3 ≈ 60.5
    it('should keep 1.3 times an 18-position step of room on the letter circle', () => {
        expect(dialClearance(LAYOUT)).toBeCloseTo(237 * 11.25 * DEG_TO_RAD * 1.3);
    });
});

describe('dialShowsLetter', () => {
    // 第 18 版 22 格（21 張 + ♥）、揀中 K（第 10 格）：每 3 格一個字母，9 太近 K 讓位改出細點
    it('should match the 22-position dial of mockup version 18', () => {
        expect(shown(10, 22)).toEqual([0, 3, 6, 10, 12, 15, 18]);
    });

    it.each(ALBUM_COUNTS)('should always show the selected letter (%d albums)', (albums) => {
        const positions = albums + 1;
        for (let current = 0; current < positions - 1; current += 1) {
            expect(dialShowsLetter(LAYOUT, current, current, positions)).toBe(true);
        }
    });

    it.each(ALBUM_COUNTS.filter((albums) => albums + 1 <= ALL_LETTERS_UP_TO))(
        'should show every letter up to 18 positions (%d albums)',
        (albums) => {
            expect(shown(0, albums + 1)).toHaveLength(albums);
        },
    );

    it.each(ALBUM_COUNTS.filter((albums) => albums + 1 > ALL_LETTERS_UP_TO))(
        'should keep to about nine letters and clear of the selected letter and ♥ (%d albums)',
        (albums) => {
            const positions = albums + 1;
            const step =
                LAYOUT.dial.letters *
                (scaleAngle(LAYOUT, 1, positions) - scaleAngle(LAYOUT, 0, positions)) *
                DEG_TO_RAD;
            for (let current = 0; current < positions - 1; current += 1) {
                const others = shown(current, positions).filter((pos) => pos !== current);
                expect(others.length).toBeLessThanOrEqual(MAX_LETTERS);
                others.forEach((pos) => {
                    expect(Math.abs(pos - current) * step).toBeGreaterThanOrEqual(
                        dialClearance(LAYOUT),
                    );
                    expect((positions - 1 - pos) * step).toBeGreaterThanOrEqual(
                        dialClearance(LAYOUT),
                    );
                });
            }
        },
    );
});
