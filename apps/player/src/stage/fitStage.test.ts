import { bleedSpan, DESIGN_HEIGHT, DESIGN_WIDTH, fitStage } from './fitStage';

describe('fitStage', () => {
    it('should use the design size as is at 1080 × 1920', () => {
        expect(fitStage(DESIGN_WIDTH, DESIGN_HEIGHT)).toEqual({
            unit: 1,
            heightUnits: 1920,
            extraUnits: 0,
            offsetX: 0,
            offsetY: 0,
            bleedTop: 0,
            bleedBottom: 0,
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
            offsetY: 0,
            bleedTop: 0,
            bleedBottom: 0,
        });
    });
});

// W-005：舞台只用安全區入面嘅位（狀態列 / 動態島同底部指示條以外）
describe('fitStage with safe-area insets', () => {
    const IPHONE_15 = { top: 59, bottom: 34 };

    it('should fit the stage inside the safe area and start it below the top inset', () => {
        const stage = fitStage(393, 852, IPHONE_15);
        const unit = 393 / 1080;
        expect(stage.unit).toBeCloseTo(unit);
        expect(stage.heightUnits).toBeCloseTo((852 - 59 - 34) / unit);
        expect(stage.extraUnits).toBeCloseTo((852 - 59 - 34) / unit - 1920);
        expect(Math.round(stage.extraUnits)).toBe(166);
        expect(stage.offsetY).toBe(59);
    });

    it('should scale by the safe height on a wider viewport', () => {
        const stage = fitStage(1440, 1000, { top: 20, bottom: 20 });
        expect(stage.unit).toBeCloseTo(0.5);
        expect(stage.offsetX).toBeCloseTo((1440 - 540) / 2);
        expect(stage.offsetY).toBe(20);
    });

    it.each([
        [{ top: Number.NaN, bottom: 34 }, 34],
        [{ top: -10, bottom: 0 }, 0],
    ])('should ignore the unusable inset in %j', (insets, usedPx) => {
        const stage = fitStage(393, 852, insets);
        expect(stage.heightUnits).toBeCloseTo((852 - usedPx) / (393 / 1080));
        expect(stage.offsetY).toBe(0);
    });

    it('should ignore insets that leave no room for the stage', () => {
        expect(fitStage(393, 852, { top: 500, bottom: 500 })).toEqual(fitStage(393, 852));
    });
});

/** T-039：高身手機（Functional Spec US-011「畫面固定」；CR-003 決定 1）連典型安全區 */
describe('fitStage on tall phones', () => {
    const TALL_PHONES = [
        { width: 390, height: 844, insets: { top: 47, bottom: 34 } },
        { width: 393, height: 852, insets: { top: 59, bottom: 34 } },
        { width: 360, height: 800, insets: { top: 24, bottom: 0 } },
    ];

    it.each(TALL_PHONES)(
        'should fill the width and stay inside the safe area at $width × $height',
        ({ width, height, insets }) => {
            const stage = fitStage(width, height, insets);
            expect(stage.offsetX).toBe(0);
            expect(stage.unit * DESIGN_WIDTH).toBeCloseTo(width);
            expect(stage.offsetY).toBe(insets.top);
            expect(stage.offsetY + stage.heightUnits * stage.unit).toBeCloseTo(
                height - insets.bottom,
            );
        },
    );

    it.each(TALL_PHONES)(
        'should keep the whole design height and only add room in the middle at $width × $height',
        ({ width, height, insets }) => {
            const stage = fitStage(width, height, insets);
            expect(stage.extraUnits).toBeGreaterThan(0);
            expect(stage.heightUnits).toBeCloseTo(DESIGN_HEIGHT + stage.extraUnits);
        },
    );
});

/*
 * T-117（B-094）：畫面延伸去安全區外。舞台仍然只喺安全區入面擺嘢，但底色同貼底嘅唱片機畫到螢幕最頂最底：
 * 舞台上下各有一段「延伸」（單位），即係頂部同底部安全區
 */
describe('fitStage bleed', () => {
    const IPHONE_15 = { top: 59, bottom: 34 };

    it('should bleed by the safe-area insets in design units on a tall phone', () => {
        const stage = fitStage(393, 852, IPHONE_15);
        expect(stage.bleedTop).toBeCloseTo(59 / stage.unit);
        expect(stage.bleedBottom).toBeCloseTo(34 / stage.unit);
    });

    it('should reach the screen edges: the bleed and the stage fill the viewport height', () => {
        const stage = fitStage(393, 852, IPHONE_15);
        const { bleedTop, heightUnits, bleedBottom, unit } = stage;
        expect(stage.offsetY - bleedTop * unit).toBeCloseTo(0);
        expect((bleedTop + heightUnits + bleedBottom) * unit).toBeCloseTo(852);
    });

    it('should bleed vertically only on a wider viewport, scaled by the safe height', () => {
        const stage = fitStage(1440, 1000, { top: 20, bottom: 20 });
        expect(stage.bleedTop).toBeCloseTo(20 / 0.5);
        expect(stage.bleedBottom).toBeCloseTo(20 / 0.5);
        expect(stage.offsetX).toBeCloseTo((1440 - 540) / 2);
    });

    it.each([
        ['no insets', {}],
        ['unusable insets', { top: Number.NaN, bottom: -3 }],
        ['insets that leave no room', { top: 500, bottom: 500 }],
    ])('should not bleed with %s', (_name, insets) => {
        const stage = fitStage(393, 852, { top: 0, bottom: 0, ...insets });
        expect(stage.bleedTop).toBe(0);
        expect(stage.bleedBottom).toBe(0);
    });
});

/* T-117：要蓋住成個畫面（連延伸）嘅層用嘅範圍（設計單位，喺舞台座標或者向下移咗嘅貼底組座標） */
describe('bleedSpan', () => {
    const stage = fitStage(393, 852, { top: 59, bottom: 34 });

    it('should run from the top of the screen to the bottom in stage coordinates', () => {
        const span = bleedSpan(stage);
        expect(span.y).toBeCloseTo(-stage.bleedTop);
        expect(span.height).toBeCloseTo(stage.bleedTop + stage.heightUnits + stage.bleedBottom);
    });

    it('should move up by the group offset for the bottom-anchored group', () => {
        const span = bleedSpan(stage, stage.extraUnits);
        expect(span.y).toBeCloseTo(-stage.bleedTop - stage.extraUnits);
        expect(span.height).toBeCloseTo(bleedSpan(stage).height);
    });

    it('should be the stage itself when there is no bleed', () => {
        expect(bleedSpan(fitStage(1080, 1920))).toEqual({ y: 0, height: 1920 });
    });
});
