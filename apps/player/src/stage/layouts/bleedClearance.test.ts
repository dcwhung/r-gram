import { updateHitBox, updatePillBox } from '../../components/update-button/updateBox';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../fitStage';
import {
    heldColumnBottom,
    hitAreas,
    hitSizeUnits,
    miniHitBox,
    spindleHitRadius,
} from '../geometry';
import { LAYOUTS } from './index';
import type { StageLayout } from './types';

/** 一個感應範圍（設計單位，舞台座標；貼底組以設計高度 1920 計，即係安全區底） */
interface Box {
    name: string;
    top: number;
    bottom: number;
    left: number;
    right: number;
}

const around = (name: string, x: number, y: number, half: number): Box => ({
    name,
    top: y - half,
    bottom: y + half,
    left: x - half,
    right: x + half,
});

/** 版本號變成更新掣時最闊嘅字（「有新版本 vX.Y.Z」一類）：字闊唔影響上下 */
const UPDATE_TEXT_WIDTH = 300;

/** 唱片機（貼底組）：細掣、唱片夾、旋鈕、♥；唱片夾用佢真正嘅感應半徑 */
const machineBoxes = (layout: StageLayout): Box[] => [
    ...hitAreas(layout).map(({ x, y, half }, index) => around(`hitArea ${index}`, x, y, half)),
    around('clamp', layout.disc.x, layout.disc.y, spindleHitRadius(layout)),
];

/** 貼頂組：細唱片機、版本號更新掣；拎住碟嘅歌單欄（欄底，字母盤開同唔開） */
const topBoxes = (layout: StageLayout): Box[] => {
    const update = updateHitBox(layout, updatePillBox(layout, UPDATE_TEXT_WIDTH));
    const column = { left: 0, right: 0, top: layout.heldTracks.top };
    return [
        { name: 'mini turntable', ...miniHitBox(layout) },
        {
            name: 'update button',
            top: update.y,
            bottom: update.y + update.h,
            left: update.x,
            right: update.x + update.w,
        },
        { name: 'held column (released)', ...column, bottom: heldColumnBottom(layout, false) },
        { name: 'held column (dial open)', ...column, bottom: heldColumnBottom(layout, true) },
    ];
};

/** MV 電視（貼底組，成部機以 tv.x、tv.y 擺）：▶ ❚❚ ■ 同兩粒旋鈕 */
const tvBoxes = (layout: StageLayout): Box[] => {
    const { tv } = layout;
    const half = hitSizeUnits(layout) / 2;
    const knobHalf = Math.max(half, tv.knobs.dialR + tv.knobs.rim);
    return [
        ...tv.buttons.xs.map((x, index) =>
            around(`tv button ${index}`, tv.x + x, tv.y + tv.buttons.y, half),
        ),
        around('tv volume', tv.x + tv.knobs.x, tv.y + tv.knobs.volumeY, knobHalf),
        around('tv seek', tv.x + tv.knobs.x, tv.y + tv.knobs.seekY, knobHalf),
    ];
};

/*
 * T-117 驗收 A3（review W-073）：舞台延伸到螢幕頂同底之後，延伸部分有畫嘢但㩒唔到（擋板）。
 * 所以每個感應範圍都要喺設計框（安全區）入面：唔可以伸入上下延伸，否則嗰部分會畀擋板食咗。
 * 高身手機：貼頂組貼舞台頂、貼底組貼舞台底，多出嚟嘅高度喺中間，所以喺設計框入面就喺安全區入面。
 */
describe.each(LAYOUTS.map((layout) => [layout.id, layout] as const))(
    'layout %s touch targets inside the safe area',
    (_id, layout) => {
        const boxes = [...machineBoxes(layout), ...topBoxes(layout), ...tvBoxes(layout)];

        it.each(boxes.map((box) => [box.name, box] as const))(
            'should keep %s inside the design box',
            (_name, box) => {
                expect(box.top).toBeGreaterThanOrEqual(0);
                expect(box.bottom).toBeLessThanOrEqual(DESIGN_HEIGHT);
                expect(box.left).toBeGreaterThanOrEqual(0);
                expect(box.right).toBeLessThanOrEqual(DESIGN_WIDTH);
            },
        );

        /*
         * 感應範圍跟住掣本身（設計稿畫喺邊就㩒邊）：細掣、唱片夾、旋鈕嘅感應圈以掣嘅中心做圓心。
         * 掣喺安全區入面（上面），感應圈就唔會靜靜雞移入延伸部分
         */
        it('should centre the round touch targets on their controls', () => {
            const { buttons, disc, knob } = layout;
            const controls = [...buttons.items, disc, knob].map(({ x, y }) => ({ x, y }));
            const centres = hitAreas(layout)
                .filter((area) => area.shape === 'round')
                .map(({ x, y }) => ({ x, y }));
            expect(centres).toEqual(controls);
        });
    },
);
