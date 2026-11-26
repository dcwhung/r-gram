import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { Point, StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { ChromeFade } from '../chrome-fade/ChromeFade';
import { DEF, ref } from '../metal/defIds';
import { Screws } from '../metal/Screws';
import { useSvgId } from '../svgId';
import { ratio } from '../svgNumber';

/** mask 嘅值：白色，透明度 = 層有幾實（唔係畫面顏色） */
const MASK_COLOUR = '#fff';

interface HeldScrimProps {
    layout: StageLayout;
    /** 有歌單欄先顯示（設計稿第 19 版 showsColumn()；chromeFade 過場；減少動態效果即時） */
    shown: boolean;
    /** 同層嘅螺絲（貼底組：左下）：喺層上面再畫一次，唔好俾佢遮淡 */
    screws: readonly Point[];
}

/**
 * 碟上面嘅半透明層（設計稿第 18 版 listScrim()；Functional Spec FR-044 ④）：舞台底色，
 * 由左邊 `scrim.opacity`（到 `scrim.solid`）直線淡到 `scrim.end` 嘅 0，隻碟仍然透得出。
 * 喺碟上面、字母盤同旋鈕下面；淨係畫面，唔接受 pointer。喺貼底組：向上伸返多出嚟嘅高度蓋住成個舞台
 */
export const HeldScrim = ({ layout, shown, screws }: HeldScrimProps) => {
    const { heightUnits, extraUnits } = useStageFitContext();
    const { scrim } = layout.heldTracks;
    const id = useSvgId('held-scrim');
    const area = { x: 0, y: -extraUnits, width: DESIGN_WIDTH, height: heightUnits };
    return (
        <ChromeFade part="held-scrim" hidden={!shown}>
            <g aria-hidden="true" pointerEvents="none">
                <linearGradient
                    id={`${id}-g`}
                    gradientUnits="userSpaceOnUse"
                    x1={0}
                    y1={0}
                    x2={scrim.end}
                    y2={0}
                >
                    <stop offset={0} stopColor={MASK_COLOUR} stopOpacity={scrim.opacity} />
                    <stop
                        offset={ratio(scrim.solid / scrim.end)}
                        stopColor={MASK_COLOUR}
                        stopOpacity={scrim.opacity}
                    />
                    <stop offset={1} stopColor={MASK_COLOUR} stopOpacity={0} />
                </linearGradient>
                <mask id={id} maskUnits="userSpaceOnUse" {...area}>
                    <rect {...area} width={scrim.end} fill={`url(#${id}-g)`} />
                </mask>
                <rect {...area} fill={ref(DEF.stage)} mask={`url(#${id})`} />
                <g data-part="scrim-screws">
                    <Screws points={screws} />
                </g>
            </g>
        </ChromeFade>
    );
};
