import { crossesSeam, keyTarget, moveTurn, startTurn, turnDelta, turnedPosition } from './knobTurn';

/** 22 格：每格 (376.25 − 185) ÷ 21 ≈ 9.107° */
const POSITIONS = 22;
const STEP = (376.25 - 185) / (POSITIONS - 1);
const limits = { stepDeg: STEP, positions: POSITIONS };

/** 由 startPos 開始，pointer 依次經過呢啲角度（null = 喺旋鈕中心） */
const turnThrough = (startPos: number, angles: readonly (number | null)[]) =>
    angles.reduce((turn, deg) => moveTurn(turn, deg), startTurn(startPos));

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

    // T-110 第 20 版：旋鈕頭尾相接：擰過 ♥ 就係第一隻碟，由第一隻碟向後擰就係 ♥
    it('should go from ♥ to the first disc and from the first disc to ♥', () => {
        expect(turnedPosition(turnThrough(POSITIONS - 1, [0, STEP]), limits)).toBe(0);
        expect(turnedPosition(turnThrough(0, [0, -STEP]), limits)).toBe(POSITIONS - 1);
        expect(turnedPosition(turnThrough(20, [0, STEP * 3]), limits)).toBe(1);
    });

    it('should go round and round while the pointer keeps turning one way', () => {
        const angles = Array.from({ length: 50 }, (_, index) => (index * STEP) % 360);
        // 49 格 = 兩圈（44 格）再多 5 格
        expect(turnedPosition(turnThrough(10, angles), limits)).toBe(15);
        const back = angles.map((deg) => -deg);
        expect(turnedPosition(turnThrough(10, back), limits)).toBe(5);
    });

    it('should report whether a step crossed the seam between ♥ and the first disc', () => {
        expect(crossesSeam(POSITIONS - 1, 0, POSITIONS)).toBe(true);
        expect(crossesSeam(0, POSITIONS - 1, POSITIONS)).toBe(true);
        expect(crossesSeam(20, 1, POSITIONS)).toBe(true);
        expect(crossesSeam(5, 6, POSITIONS)).toBe(false);
        expect(crossesSeam(6, 3, POSITIONS)).toBe(false);
        expect(crossesSeam(0, 1, 2)).toBe(false);
        expect(crossesSeam(0, 0, 1)).toBe(false);
    });

    it('should ignore the pointer while it is over the knob centre', () => {
        // 入咗中心再喺另一邊出返嚟：中間嗰段唔計
        expect(turnedPosition(turnThrough(10, [0, null, 120, 120 + STEP]), limits)).toBe(11);
    });

    it('should stay on the only position when there are no albums', () => {
        const single = { stepDeg: 0, positions: 1 };
        const turn = [0, 90].reduce((state, deg) => moveTurn(state, deg), startTurn(0));
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
        ['ArrowRight', POSITIONS - 1, 0],
        ['ArrowUp', POSITIONS - 1, 0],
        ['ArrowLeft', 0, POSITIONS - 1],
        ['ArrowDown', 0, POSITIONS - 1],
        ['End', POSITIONS - 1, POSITIONS - 1],
        ['Home', 0, 0],
    ])('should move %s from position %d to %d', (key, current, target) => {
        expect(keyTarget(key, current, POSITIONS)).toBe(target);
    });

    it('should stay on the only position', () => {
        expect(keyTarget('ArrowRight', 0, 1)).toBe(0);
        expect(keyTarget('ArrowLeft', 0, 1)).toBe(0);
    });

    it('should leave other keys alone', () => {
        expect(keyTarget('a', 5, POSITIONS)).toBeNull();
        expect(keyTarget('Enter', 5, POSITIONS)).toBeNull();
    });
});
