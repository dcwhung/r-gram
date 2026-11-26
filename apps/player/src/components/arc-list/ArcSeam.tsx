import type { ArcListLayout } from '../../stage/layouts';
import type { ArcSeamPose } from '../../stage/arcRows';
import { px, ratio } from '../svgNumber';
import { HitBand } from './ArcRow';

interface ArcSeamProps {
    pose: ArcSeamPose;
    accent: string;
    list: ArcListLayout;
    /** 感應範圍右邊（同行一樣） */
    hitRight: number;
    /** 由歌單欄開：框線伸出時原地淡入 */
    appear: boolean;
}

/**
 * 接駁位（設計稿第 20 版 loopSeam()、LIST_LOOP）：最後一首之後、第一首之前一格，專輯色嘅點 + 隔少少一條短線，
 * 一眼睇到邊度係尾、邊度係頭。揀唔到（捲動跳過），唔係掣：同行一樣擋住暗層（㩒佢唔會收返歌單），喺度拖照捲。
 * 純裝飾：讀屏唔讀
 */
export const ArcSeam = ({ pose, accent, list, hitRight, appear }: ArcSeamProps) => {
    const { dot, gap, length, stroke } = list.seam;
    return (
        <g
            data-part="arc-seam"
            className={appear ? 'arc-seam arc-row-appear' : 'arc-seam'}
            opacity={ratio(pose.opacity)}
            aria-hidden="true"
        >
            <HitBand pose={pose} list={list} hitRight={hitRight} />
            <circle cx={px(pose.x + dot)} cy={px(pose.y)} r={dot} fill={accent} />
            <path
                d={`M${px(pose.x + dot * 2 + gap)} ${px(pose.y)}h${length}`}
                stroke={accent}
                strokeWidth={stroke}
                strokeLinecap="round"
            />
        </g>
    );
};
