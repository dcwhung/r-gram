import { DESIGN_WIDTH } from '../fitStage';
import { ARM_SHAPE } from '../../components/tonearm/armShape';
import {
    armCentreYAt,
    buttonCdGap,
    buttonKnobGap,
    buttonPlatterGap,
    hitAreas,
    hitSizeUnits,
    knobMargins,
    knobPlatterGap,
    minHitGap,
    positionsFor,
    screwGap,
} from '../geometry';
import { LAYOUTS } from './index';
import { PHONE_LAYOUT } from './phone';

/** 設計稿嘅格數：17 張專輯 + ♥ */
const DESIGN_POSITIONS = 18;
const MARGIN_TOLERANCE = 2;
/** CR-003 決定 2：任何專輯數都要過，測試掃 1 至 30 張 */
const MIN_ALBUMS = 1;
const MAX_ALBUMS = 30;
const ALBUM_COUNTS = Array.from(
    { length: MAX_ALBUMS - MIN_ALBUMS + 1 },
    (_, index) => MIN_ALBUMS + index,
);

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

    it.each(ALBUM_COUNTS)(
        'should keep the zone around the bottom-left screw free of controls with %i albums',
        (albums) => {
            expect(screwGap(layout, positionsFor(albums))).toBeGreaterThanOrEqual(
                clearance.screwZone,
            );
        },
    );

    // ♥ 固定喺弧尾，所以感應範圍同專輯數無關：唔重疊、♥ 嘅方格唔出界
    it('should keep the touch targets apart and on screen whatever the album count', () => {
        expect(minHitGap(layout)).toBeGreaterThanOrEqual(0);
        hitAreas(layout).forEach(({ x, y, half }) => {
            expect(x - half).toBeGreaterThanOrEqual(0);
            expect(x + half).toBeLessThanOrEqual(DESIGN_WIDTH);
            expect(y - half).toBeGreaterThanOrEqual(0);
        });
    });

    // CR-005 D51：歌名斷兩行時，第二行（到 secondRight）喺泊位嘅唱臂上面，唔會畀臂管遮住
    it('should keep the second line of a long song title above the parked tonearm', () => {
        const { arm, info } = layout;
        const tubeHalf = Math.max(arm.base * ARM_SHAPE.tube.width, ARM_SHAPE.tube.minWidth) / 2;
        const secondBaseline = info.song.y - info.song.lift + info.song.pitch;
        const tubeTop = armCentreYAt(layout, arm.parkDeg, info.song.secondRight) - tubeHalf;
        expect(tubeTop).toBeGreaterThan(secondBaseline);
        expect(info.song.secondRight).toBeLessThan(info.song.maxRight);
    });

    it('should keep the track line where it is when the song title takes two lines', () => {
        const { song, track } = layout.info;
        expect(song.y - song.lift + song.pitch).toBeLessThan(track.y - track.size);
    });

    it('should size the round touch targets from the 44pt rule, never smaller than the control', () => {
        const half = hitSizeUnits(layout) / 2;
        const [booklet, , , clamp, knob] = hitAreas(layout);
        expect(half).toBeCloseTo((clearance.hitPt / clearance.viewportPt) * 1080 * 0.5);
        expect(booklet?.half).toBe(half);
        expect(clamp?.half).toBe(half);
        expect(knob?.half).toBe(Math.max(layout.knob.r, half));
    });
});

/* 手機版面嘅量度值同設計稿第 17 版嘅量度表一致（_mockups_/home-turntable/index.html） */
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
        expect(Math.round(minHitGap(PHONE_LAYOUT))).toBe(4);
    });

    // 最近螺絲嘅永遠係 185° 嗰條刻度線，所以幾多張專輯都係 125（Functional Spec §CR-003「刻度弧」）
    it('should keep the 185° tick as the nearest control to the screw for every album count', () => {
        const gaps = ALBUM_COUNTS.map((albums) =>
            Math.round(screwGap(PHONE_LAYOUT, positionsFor(albums))),
        );
        expect(new Set(gaps)).toEqual(new Set([125]));
    });
});
