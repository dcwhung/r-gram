import { DESIGN_HEIGHT, DESIGN_WIDTH, fitStage } from './fitStage';

describe('fitStage', () => {
    it('should use the design size as is at 1080 × 1920', () => {
        expect(fitStage(DESIGN_WIDTH, DESIGN_HEIGHT)).toEqual({
            unit: 1,
            heightUnits: 1920,
            extraUnits: 0,
            offsetX: 0,
        });
    });

    it('should scale by width on a 9:16 phone', () => {
        const stage = fitStage(360, 640);
        expect(stage.unit).toBeCloseTo(1 / 3);
        expect(stage.heightUnits).toBeCloseTo(1920);
        expect(stage.extraUnits).toBeCloseTo(0);
    });

    it('should fill the width and report the extra height on a taller phone', () => {
        // iPhone 15：393 × 852pt（約 9 : 19.5）
        const stage = fitStage(393, 852);
        expect(stage.unit).toBeCloseTo(393 / 1080);
        expect(stage.heightUnits).toBeCloseTo(852 / (393 / 1080));
        expect(stage.extraUnits).toBeCloseTo(852 / (393 / 1080) - 1920);
        expect(stage.offsetX).toBe(0);
    });

    it('should fit the height and centre the stage on a wider viewport', () => {
        const stage = fitStage(1440, 960);
        expect(stage.unit).toBeCloseTo(0.5);
        expect(stage.heightUnits).toBe(1920);
        expect(stage.extraUnits).toBe(0);
        expect(stage.offsetX).toBeCloseTo((1440 - 540) / 2);
    });

    it.each([
        [0, 0],
        [0, 800],
        [-1, 100],
        [Number.NaN, 100],
    ])('should fall back to the design size for a viewport of %d × %d', (width, height) => {
        expect(fitStage(width, height)).toEqual({
            unit: 1,
            heightUnits: 1920,
            extraUnits: 0,
            offsetX: 0,
        });
    });
});
