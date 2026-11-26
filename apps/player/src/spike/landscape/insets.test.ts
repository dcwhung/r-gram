import { stageInsets } from './insets';

const PHONE_LANDSCAPE = { top: 0, right: 59, bottom: 21, left: 0 };

describe('stageInsets', () => {
    it('should keep the insets as they are when the stage is not turned', () => {
        expect(stageInsets(0, PHONE_LANDSCAPE)).toEqual(PHONE_LANDSCAPE);
    });

    it('should move the viewport insets to the stage sides for -90', () => {
        // 舞台頂 = viewport 左；舞台右 = viewport 頂；舞台底 = viewport 右；舞台左 = viewport 底
        expect(stageInsets(-90, PHONE_LANDSCAPE)).toEqual({
            top: 0,
            right: 0,
            bottom: 59,
            left: 21,
        });
    });

    it('should move the viewport insets to the stage sides for +90', () => {
        expect(stageInsets(90, PHONE_LANDSCAPE)).toEqual({
            top: 59,
            right: 21,
            bottom: 0,
            left: 0,
        });
    });
});
