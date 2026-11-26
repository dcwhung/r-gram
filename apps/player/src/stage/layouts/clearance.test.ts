import { DESIGN_WIDTH } from '../fitStage';
import { ARM_SHAPE } from '../../components/tonearm/armShape';
import {
    armCentreYAt,
    buttonCdGap,
    buttonKnobGap,
    buttonPlatterGap,
    heartHitPoint,
    heldColumnBottom,
    heldRowHitRight,
    hitAreas,
    hitSizeUnits,
    miniHitBox,
    miniLabelX,
    knobMargins,
    knobPlatterGap,
    minHitGap,
    positionsFor,
    screwGap,
} from '../geometry';
import { LAYOUTS } from './index';
import { PHONE_LAYOUT } from './phone';

/** 感應範圍低過 44pt 嘅明文例外（Functional Spec D57、FR-010）：只得拎住嘅碟嘅歌單欄嘅行 */
const BELOW_44PT_EXCEPTIONS = ['heldTrackRow'] as const;
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

    /*
     * T-048：右上角細唱片機（成組一粒掣）嘅感應範圍（Technical Spec「補充：第 18 版」淨空規則 ③）：
     * ≥ 44pt、喺畫面入面；喺版本號同碟名（兩款字）嘅基線下面；唔同 ♥ 嘅感應方格重疊。
     * 細唱片機貼頂、♥ 貼底：高身手機兩者只會再拉開
     */
    describe('mini turntable', () => {
        const box = miniHitBox(layout);
        const { info, miniTurntable: mini } = layout;

        it('should give the mini turntable a touch target of at least 44pt, on screen', () => {
            expect(box.right - box.left).toBeGreaterThanOrEqual(hitSizeUnits(layout));
            expect(box.bottom - box.top).toBeGreaterThanOrEqual(hitSizeUnits(layout));
            expect(box.left).toBeGreaterThanOrEqual(0);
            expect(box.right).toBeLessThanOrEqual(DESIGN_WIDTH);
            expect(box.top).toBeGreaterThanOrEqual(0);
        });

        it('should keep its touch target below the version number and the album title', () => {
            expect(box.top).toBeGreaterThan(info.version.y);
            expect(box.top).toBeGreaterThan(info.title.latin.y);
            expect(box.top).toBeGreaterThan(info.title.cjk.y);
        });

        it('should keep the narrowed album title left of the mini disc', () => {
            expect(info.title.rightWhenHeld).toBeLessThan(mini.x - mini.r);
            expect(info.title.rightWhenHeld).toBeGreaterThan(info.title.x);
        });

        it('should keep the label and song title right-aligned inside the info column', () => {
            expect(miniLabelX(layout)).toBeLessThan(mini.x - mini.r);
            expect(miniLabelX(layout)).toBeGreaterThan(info.title.x);
        });

        it('should keep its touch target apart from the ♥ square', () => {
            const half = hitSizeUnits(layout) / 2;
            const heart = heartHitPoint(layout);
            const apart =
                heart.y - half >= box.bottom ||
                heart.y + half <= box.top ||
                heart.x - half >= box.right ||
                heart.x + half <= box.left;
            expect(apart).toBe(true);
        });
    });

    /*
     * T-049：拎住嘅碟嘅歌單欄（Technical Spec「補充：第 18 版」淨空規則 ①②④）。字母盤同旋鈕貼底、欄頂貼頂：
     * 高身手機欄底跟住貼底組向下移（heldColumnBottom 加 extraUnits），兩者距離不變，所以只驗設計高度
     */
    describe('held track column', () => {
        const { heldTracks: column, knob, dial, scale } = layout;

        it('should end the column above the letter dial while the dial is open', () => {
            expect(heldColumnBottom(layout, true)).toBeLessThanOrEqual(knob.y - dial.outer);
        });

        it('should end the longer column above the knob scale and the ♥ square', () => {
            const bottom = heldColumnBottom(layout, false);
            expect(bottom).toBeLessThanOrEqual(knob.y - scale.long);
            expect(bottom).toBeLessThanOrEqual(heartHitPoint(layout).y - hitSizeUnits(layout) / 2);
            expect(bottom).toBeGreaterThan(heldColumnBottom(layout, true));
        });

        it('should start the column below the year line of the album title', () => {
            expect(column.top).toBeGreaterThan(layout.info.year.y);
        });

        /*
         * 設計稿嘅行感應範圍（到 right + 20 = 620）同細唱片機嘅感應範圍（由 510 起）喺頭兩行重疊；
         * 欄畫喺細唱片機上面（設計稿 scene() 次序），重疊嗰條屬歌單行。細唱片機餘下嘅部分仍然 ≥ 44pt
         */
        it('should leave the mini turntable a 44pt touch target right of the rows', () => {
            const box = miniHitBox(layout);
            expect(box.right - heldRowHitRight(layout)).toBeGreaterThanOrEqual(
                hitSizeUnits(layout),
            );
        });

        /* D57：唯一低過 44pt 嘅感應範圍係歌單欄嘅行（用戶揀咗密行距）；行闊仍然要 ≥ 44pt */
        it('should allow only the held track rows below 44pt, and keep them wide', () => {
            const below = Object.entries({ heldTrackRow: column.pitch }).filter(
                ([, size]) => size < hitSizeUnits(layout),
            );
            expect(below.map(([name]) => name)).toEqual([...BELOW_44PT_EXCEPTIONS]);
            expect(heldRowHitRight(layout)).toBeGreaterThanOrEqual(hitSizeUnits(layout));
        });
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
