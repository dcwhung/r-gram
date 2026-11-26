import { DESIGN_WIDTH } from '../../stage/fitStage';
import { hitSizeUnits, miniHitBox } from '../../stage/geometry';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { updateHitBox, updatePillBox } from './updateBox';

const { update, version } = PHONE_LAYOUT.info;
/** 量到嘅字闊（連每個字後面嘅字距，同 TextMeasure 一樣） */
const TEXT_WIDTH = 100;
/** 好短嘅字：膠囊比感應範圍窄 */
const SHORT_TEXT_WIDTH = 20;

describe('updatePillBox', () => {
    it('should hug the text with padX on both sides and keep its right edge fixed', () => {
        const box = updatePillBox(PHONE_LAYOUT, TEXT_WIDTH);
        // 最後一個字後面嘅字距唔計入膠囊（字形先係睇得見嘅闊度）
        expect(box.w).toBe(TEXT_WIDTH - version.spacing + update.padX * 2);
        expect(box.x + box.w).toBe(update.right);
        expect(box.x + box.w).toBe(1034);
    });

    it('should centre the pill a little above the version baseline', () => {
        const box = updatePillBox(PHONE_LAYOUT, TEXT_WIDTH);
        expect(box.mid).toBe(version.y + update.midDy);
        expect(box.y).toBe(box.mid - update.h / 2);
        expect(box.h).toBe(58);
        expect(box.rx).toBe(update.h / 2);
    });

    it('should end the text padX inside the right edge (the trailing spacing falls outside)', () => {
        const box = updatePillBox(PHONE_LAYOUT, TEXT_WIDTH);
        expect(box.textX).toBe(update.right - update.padX + version.spacing);
        expect(box.textY).toBe(version.y);
    });
});

describe('updateHitBox', () => {
    it('should be as tall as the mockup hit area, centred on the pill, reaching the screen edge', () => {
        const box = updatePillBox(PHONE_LAYOUT, TEXT_WIDTH);
        const hit = updateHitBox(PHONE_LAYOUT, box);
        expect(hit.h).toBe(update.hit);
        expect(hit.y + hit.h / 2).toBe(box.mid);
        expect(hit.x + hit.w).toBe(DESIGN_WIDTH);
        expect(hit.x).toBeLessThanOrEqual(box.x);
    });

    it('should stay at least 44pt wide and tall for a very short text', () => {
        const hit = updateHitBox(PHONE_LAYOUT, updatePillBox(PHONE_LAYOUT, SHORT_TEXT_WIDTH));
        expect(hit.h).toBeGreaterThanOrEqual(hitSizeUnits(PHONE_LAYOUT));
        expect(hit.w).toBeGreaterThanOrEqual(hitSizeUnits(PHONE_LAYOUT));
    });

    it('should stay clear of the mini turntable below it', () => {
        const hit = updateHitBox(PHONE_LAYOUT, updatePillBox(PHONE_LAYOUT, TEXT_WIDTH));
        expect(hit.y).toBeGreaterThanOrEqual(0);
        expect(hit.y + hit.h).toBeLessThanOrEqual(miniHitBox(PHONE_LAYOUT).top);
    });
});
