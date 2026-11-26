import { t } from '../../i18n/t';
import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { StageLayout } from '../../stage/layouts';
import { pressable } from '../pressable';
import { px } from '../svgNumber';

/** 碟芯透明膠圈嘅半徑：暗層喺呢度留窿（唱片夾照睇得清、照㩒得），框嘅右端亦喺呢度 */
export const hubClearRadius = ({ disc, hub }: StageLayout): number => disc.r * hub.clear;

/** 框嘅右端（接住唱片夾）同弧線最左（揀中嗰行嘅 x） */
export const frameEnds = (layout: StageLayout) => ({
    right: layout.disc.x - hubClearRadius(layout),
    left: layout.disc.x - layout.arc.r,
});

/**
 * 暗層（設計稿 dimLayer()）：成個舞台 80% 黑，中間留返唱片夾個窿；㩒暗位 = 收返（D25）。
 * 喺碟嘅座標（貼底組）入面：向上伸返多出嚟嘅高度，蓋住成個舞台
 */
export const ArcVeil = ({
    layout,
    top,
    height,
    onClose,
    entering = false,
}: {
    layout: StageLayout;
    top: number;
    height: number;
    onClose: () => void;
    /** 由歌單欄開：淡入（設計稿第 19 版 list-dim-in） */
    entering?: boolean;
}) => {
    const { disc } = layout;
    const clear = px(hubClearRadius(layout));
    const hole = `M${px(disc.x - clear)} ${disc.y}a${clear} ${clear} 0 1 0 ${px(clear * 2)} 0a${clear} ${clear} 0 1 0 ${px(-clear * 2)} 0z`;
    return (
        <path
            data-part="arc-veil"
            className={entering ? 'arc-veil arc-veil--in' : 'arc-veil'}
            fillRule="evenodd"
            d={`M0 ${px(top)}H${DESIGN_WIDTH}V${px(top + height)}H0z${hole}`}
            fill="#000"
            opacity={layout.list.veil}
            aria-label={t('list.close')}
            {...pressable(onClose)}
        />
    );
};

/**
 * 白色框線（設計稿 focusFrame()）：右端接住唱片夾，左邊圓頭喺弧線左邊 gap 之外；線粗唔跟縮放。
 * 由歌單欄開：等一陣先由唱片夾向左伸出（設計稿第 19 版 list-frame-in）
 */
export const ArcFrame = ({
    layout,
    entering = false,
}: {
    layout: StageLayout;
    entering?: boolean;
}) => {
    const { frame } = layout.list;
    const { right, left } = frameEnds(layout);
    const half = frame.height / 2;
    const d = `M0 ${-half}H${px(left - frame.gap - right)}a${half} ${half} 0 0 0 0 ${frame.height}H0`;
    return (
        <g transform={`translate(${px(right)} ${layout.disc.y})`} aria-hidden="true">
            {entering ? (
                <g className="arc-frame-in">
                    <path
                        data-part="arc-frame"
                        className="arc-frame"
                        d={d}
                        fill="none"
                        strokeWidth={frame.stroke}
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                    />
                </g>
            ) : (
                <path
                    data-part="arc-frame"
                    className="arc-frame"
                    d={d}
                    fill="none"
                    strokeWidth={frame.stroke}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

/** 冇歌（D39）：框入面一行（設計稿 listLayer() 嘅 st.empty：揀中嗰行嘅位、字級） */
export const ArcEmpty = ({ layout, text }: { layout: StageLayout; text: string }) => (
    <text
        data-part="arc-empty"
        className="arc-empty"
        dominantBaseline="central"
        x={px(frameEnds(layout).left)}
        y={layout.disc.y}
        fontSize={layout.list.focusSize}
    >
        {text}
    </text>
);
