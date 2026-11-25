import type { ReactNode } from 'react';
import { SvgDefs } from '../components/metal/SvgDefs';
import { DEF, ref } from '../components/metal/defIds';
import { DESIGN_WIDTH } from './fitStage';
import { useStageFitContext } from './StageContext';

interface StageSvgProps {
    /** 貼頂嘅內容（左上資訊、頂部螺絲） */
    top?: ReactNode;
    /** 貼底嘅內容（唱片機：碟、轉盤、唱臂、控件）。畫面比 9:16 高時成組向下移 */
    bottom?: ReactNode;
}

/**
 * 舞台嘅 SVG 畫布：1 個 SVG 單位 = 1 個設計單位。高度跟舞台（最少 1920）。
 * 高身手機多出嚟嘅高度留喺中間：`top` 貼頂、`bottom` 貼底（backlog B-009：等用戶睇過預覽再定）。
 */
export const StageSvg = ({ top, bottom }: StageSvgProps) => {
    const { heightUnits, extraUnits } = useStageFitContext();
    return (
        <svg
            className="stage-svg"
            viewBox={`0 0 ${DESIGN_WIDTH} ${heightUnits}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMin meet"
        >
            <SvgDefs />
            <rect width={DESIGN_WIDTH} height={heightUnits} fill={ref(DEF.stage)} />
            <g data-anchor="bottom" transform={`translate(0 ${extraUnits})`}>
                {bottom}
            </g>
            <g data-anchor="top">{top}</g>
        </svg>
    );
};
