import { keyTarget, moveTurn, startTurn, turnDelta, turnedPosition } from './knobTurn';

/** 22 格：每格 (376.25 − 185) ÷ 21 ≈ 9.107° */
const POSITIONS = 22;
const STEP = (376.25 - 185) / (POSITIONS - 1);
const limits = { stepDeg: STEP, positions: POSITIONS };

/** 由 startPos 開始，pointer 依次經過呢啲角度（null = 喺旋鈕中心） */
const turnThrough = (startPos: number, angles: readonly (number | null)[]) =>
    angles.reduce((turn, deg) => moveTurn(turn, deg, limits), startTurn(startPos));

describe('turnDelta', () => {
    it.each([
        [10, 30, 20],
        [30, 10, -20],
        [170, -170, 20],
        [-170, 170, -20],
        [0, 180, 180],
    ])('should turn from %d° to %d° by the short way (%d°)', (from, to, delta) => {
        expect(turnDelta(from, to)).toBeCloseTo(delta);
    });
});

describe('knob turn', () => {
    it('should stay on the starting position until the pointer moves round the knob', () => {
        expect(turnedPosition(startTurn(10), limits)).toBe(10);
        expect(turnedPosition(turnThrough(10, [40]), limits)).toBe(10);
    });

    it('should move one position per scale step, clockwise = later discs', () => {
        expect(turnedPosition(turnThrough(10, [0, STEP]), limits)).toBe(11);
        expect(turnedPosition(turnThrough(10, [0, -3 * STEP]), limits)).toBe(7);
    });

    it('should snap to the nearest position', () => {
        expect(turnedPosition(turnThrough(10, [0, STEP * 0.4]), limits)).toBe(10);
        expect(turnedPosition(turnThrough(10, [0, STEP * 0.6]), limits)).toBe(11);
    });

    it('should follow a turn across the ±180° seam', () => {
        expect(turnedPosition(turnThrough(10, [175, -175]), limits)).toBe(11);
    });

    it('should stop at ♥ and at the first disc, and come straight back from either end', () => {
        const pastHeart = turnThrough(19, [0, 90, 180, -90]);
        expect(turnedPosition(pastHeart, limits)).toBe(POSITIONS - 1);
        // 頂咗尾之後一轉返轉頭就郁，唔使先「還返」轉過咗嘅角度
        expect(turnedPosition(moveTurn(pastHeart, -90 - STEP, limits), limits)).toBe(20);
        expect(turnedPosition(turnThrough(1, [0, -90, -180]), limits)).toBe(0);
    });

    it('should ignore the pointer while it is over the knob centre', () => {
        // 入咗中心再喺另一邊出返嚟：中間嗰段唔計
        expect(turnedPosition(turnThrough(10, [0, null, 120, 120 + STEP]), limits)).toBe(11);
    });

    it('should stay on the only position when there are no albums', () => {
        const single = { stepDeg: 0, positions: 1 };
        const turn = [0, 90].reduce((state, deg) => moveTurn(state, deg, single), startTurn(0));
        expect(turnedPosition(turn, single)).toBe(0);
    });
});

describe('keyTarget', () => {
    it.each([
        ['ArrowRight', 5, 6],
        ['ArrowUp', 5, 6],
        ['ArrowLeft', 5, 4],
        ['ArrowDown', 5, 4],
        ['Home', 5, 0],
        ['End', 5, POSITIONS - 1],
        ['ArrowRight', POSITIONS - 1, POSITIONS - 1],
        ['ArrowLeft', 0, 0],
    ])('should move %s from position %d to %d', (key, current, target) => {
        expect(keyTarget(key, current, POSITIONS)).toBe(target);
    });

    it('should leave other keys alone', () => {
        expect(keyTarget('a', 5, POSITIONS)).toBeNull();
        expect(keyTarget('Enter', 5, POSITIONS)).toBeNull();
    });
});
