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

    it('should give every control a touch target of at least 44pt that overlaps no other', () => {
        const minimum = hitSizeUnits(layout) / 2;
        const areas = hitAreas(layout, DESIGN_POSITIONS);
        expect(areas.every((area) => area.half >= minimum)).toBe(true);
        expect(minHitGap(layout, DESIGN_POSITIONS)).toBeGreaterThanOrEqual(0);
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
