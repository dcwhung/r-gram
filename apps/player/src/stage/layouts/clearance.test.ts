import {
    buttonCdGap,
    buttonKnobGap,
    buttonPlatterGap,
    hitAreas,
    hitSizeUnits,
    knobMargins,
    knobPlatterGap,
    minHitGap,
    screwGap,
} from '../geometry';
import { LAYOUTS } from './index';
import { PHONE_LAYOUT } from './phone';

/** 設計稿嘅格數：17 張專輯 + ♥ */
const DESIGN_POSITIONS = 18;
const MARGIN_TOLERANCE = 2;

/*
 * 淨空同感應範圍規則（Functional Spec CR-002、FR-032）。每份幾何表都要過；加裝置版面時同一組測試照跑。
 */
describe.each(LAYOUTS.map((layout) => [layout.id, layout] as const))('layout %s', (_id, layout) => {
    const { clearance } = layout;

    it('should keep the small buttons (with ring) clear of the CD', () => {
        expect(buttonCdGap(layout)).toBeGreaterThanOrEqual(clearance.cd);
    });

    it('should keep every control clear of the platter edge', () => {
        expect(buttonPlatterGap(layout)).toBeGreaterThanOrEqual(clearance.platter);
        expect(knobPlatterGap(layout)).toBeGreaterThanOrEqual(clearance.platter);
    });

    it('should centre the knob between the screen edge and the platter', () => {
        const [left, right] = knobMargins(layout);
        expect(Math.abs(left - right)).toBeLessThanOrEqual(MARGIN_TOLERANCE);
    });

    it('should keep the small buttons clear of the knob scale', () => {
        expect(buttonKnobGap(layout)).toBeGreaterThanOrEqual(clearance.controlGap);
    });

    it('should keep the zone around the bottom-left screw free of controls', () => {
        expect(screwGap(layout, DESIGN_POSITIONS)).toBeGreaterThanOrEqual(clearance.screwZone);
    });

    it('should keep the touch targets from overlapping at the design position count', () => {
        expect(minHitGap(layout, DESIGN_POSITIONS)).toBeGreaterThanOrEqual(0);
    });

    it('should size the round touch targets from the 44pt rule, never smaller than the control', () => {
        const half = hitSizeUnits(layout) / 2;
        const [booklet, , , clamp, knob] = hitAreas(layout, DESIGN_POSITIONS);
        expect(half).toBeCloseTo((clearance.hitPt / clearance.viewportPt) * 1080 * 0.5);
        expect(booklet?.half).toBe(half);
        expect(clamp?.half).toBe(half);
        expect(knob?.half).toBe(Math.max(layout.knob.r, half));
    });
});

/*
 * W-006：格數 = 已上架專輯數 + 1，會變。♥ 嘅感應方格跟最尾一格嘅角度走但唔轉向，
 * 所以唔係每個格數都過到「感應範圍互不重疊」同「螺絲周圍留空」。呢度明寫而家邊啲格數過到；
 * 其餘格數點處理係設計問題（backlog B-010），要喺 T-036 之前由用戶決定。幾何一改，呢個清單要有意識咁跟住改。
 */
describe('phone layout across position counts', () => {
    const MIN_POSITIONS = 2;
    const MAX_POSITIONS = 21;
    const SUPPORTED_POSITIONS = [8, 9, 10, 15, 16, 17, 18];

    const passes = (positions: number) =>
        minHitGap(PHONE_LAYOUT, positions) >= 0 &&
        screwGap(PHONE_LAYOUT, positions) >= PHONE_LAYOUT.clearance.screwZone;

    it('should pass the touch-target and screw rules exactly at the listed position counts', () => {
        const counts = Array.from(
            { length: MAX_POSITIONS - MIN_POSITIONS + 1 },
            (_, index) => MIN_POSITIONS + index,
        );
        expect(counts.filter(passes)).toEqual(SUPPORTED_POSITIONS);
    });

    it('should include the current catalogue size (17 albums and the favourites slot)', () => {
        expect(SUPPORTED_POSITIONS).toContain(DESIGN_POSITIONS);
    });
});

/* 手機版面嘅量度值同設計稿第 15 版嘅量度表一致（_mockups_/home-turntable/index.html） */
describe('phone layout measurements', () => {
    it('should place the knob where the mockup does', () => {
        expect(PHONE_LAYOUT.knob).toMatchObject({ x: 266, y: 1784, r: 76 });
    });

    it('should reproduce the measurements shown in the mockup', () => {
        const [left, right] = knobMargins(PHONE_LAYOUT);
        expect([Math.round(left), Math.round(right)]).toEqual([154, 153]);
        expect(Math.round(screwGap(PHONE_LAYOUT, DESIGN_POSITIONS))).toBe(125);
        expect(Math.round(buttonKnobGap(PHONE_LAYOUT))).toBe(42);
        expect(Math.round(knobPlatterGap(PHONE_LAYOUT))).toBe(66);
        expect(Math.round(buttonPlatterGap(PHONE_LAYOUT))).toBe(76);
        expect(Math.round(buttonCdGap(PHONE_LAYOUT))).toBe(92);
        expect(Math.round(minHitGap(PHONE_LAYOUT, DESIGN_POSITIONS))).toBe(4);
    });
});
