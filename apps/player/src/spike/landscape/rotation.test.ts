import { quarterTurn, stageBox, stageDelta, toStagePoint, turnFor } from './rotation';

describe('quarterTurn', () => {
    it('should turn the stage back by -90 degrees when the phone is turned to angle 90', () => {
        expect(quarterTurn(90)).toBe(-90);
    });

    it('should turn the stage by +90 degrees for angle 270 or -90', () => {
        expect(quarterTurn(270)).toBe(90);
        expect(quarterTurn(-90)).toBe(90);
    });

    it('should treat an unknown angle as 90', () => {
        expect(quarterTurn(null)).toBe(-90);
        expect(quarterTurn(Number.NaN)).toBe(-90);
    });
});

describe('turnFor', () => {
    it('should not turn a portrait viewport', () => {
        expect(turnFor({ width: 393, height: 852, angle: 90, force: 'auto' })).toBe(0);
    });

    it('should follow the angle in a landscape viewport, unless a direction is forced', () => {
        const landscape = { width: 852, height: 393, angle: 270 };
        expect(turnFor({ ...landscape, force: 'auto' })).toBe(90);
        expect(turnFor({ ...landscape, force: -90 })).toBe(-90);
    });
});

describe('stageBox', () => {
    it('should keep the viewport as it is with no turn', () => {
        expect(stageBox(0, 393, 852)).toEqual({ width: 393, height: 852, transform: 'none' });
    });

    it('should swap width and height and move the turned stage back into the viewport', () => {
        expect(stageBox(-90, 852, 393)).toEqual({
            width: 393,
            height: 852,
            transform: 'translate(0px, 393px) rotate(-90deg)',
        });
        expect(stageBox(90, 852, 393)).toEqual({
            width: 393,
            height: 852,
            transform: 'translate(852px, 0px) rotate(90deg)',
        });
    });
});

describe('toStagePoint', () => {
    const viewport = { width: 852, height: 393 };

    it('should map the screen corners to the stage corners for -90', () => {
        // 舞台左上角（手機實際嘅左上）喺 viewport 嘅左下
        expect(toStagePoint(-90, viewport, 0, 393)).toEqual({ x: 0, y: 0 });
        expect(toStagePoint(-90, viewport, 852, 0)).toEqual({ x: 393, y: 852 });
    });

    it('should map the screen corners to the stage corners for +90', () => {
        // 舞台左上角喺 viewport 嘅右上
        expect(toStagePoint(90, viewport, 852, 0)).toEqual({ x: 0, y: 0 });
        expect(toStagePoint(90, viewport, 0, 393)).toEqual({ x: 393, y: 852 });
    });

    it('should leave the point alone with no turn', () => {
        expect(toStagePoint(0, viewport, 10, 20)).toEqual({ x: 10, y: 20 });
    });
});

describe('stageDelta', () => {
    it('should turn a finger move along the screen into a move down the stage', () => {
        // -90：舞台嘅「向下」= viewport 向右
        expect(stageDelta(-90, 30, 0)).toEqual({ dx: 0, dy: 30 });
        // +90：舞台嘅「向下」= viewport 向左
        expect(stageDelta(90, -30, 0)).toEqual({ dx: 0, dy: 30 });
        expect(stageDelta(0, 5, 7)).toEqual({ dx: 5, dy: 7 });
    });
});
