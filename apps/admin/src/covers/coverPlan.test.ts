import { coverPlan } from './coverPlan';

describe('coverPlan', () => {
    it('should keep a square source whole', () => {
        expect(coverPlan({ width: 1500, height: 1500 })).toEqual({
            crop: { x: 0, y: 0, side: 1500 },
            notSquare: false,
            upscaled: false,
        });
    });

    it('should centre-crop a landscape source', () => {
        expect(coverPlan({ width: 1600, height: 1200 })).toEqual({
            crop: { x: 200, y: 0, side: 1200 },
            notSquare: true,
            upscaled: false,
        });
    });

    it('should centre-crop a portrait source, rounding the offset down', () => {
        expect(coverPlan({ width: 1300, height: 1401 }).crop).toEqual({ x: 0, y: 50, side: 1300 });
    });

    // D50：細過 1200 嘅放大到 1200（唔擋，只提示）
    it('should mark a source smaller than the cover side as upscaled', () => {
        expect(coverPlan({ width: 640, height: 640 }).upscaled).toBe(true);
        expect(coverPlan({ width: 1200, height: 1199 }).upscaled).toBe(true);
    });
});
