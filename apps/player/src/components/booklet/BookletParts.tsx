import { t } from '../../i18n/t';
import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { StageLayout } from '../../stage/layouts';
import { frameEnds, hubClearRadius } from '../arc-list/ArcParts';
import { pressable } from '../pressable';
import { px } from '../svgNumber';

/**
 * 暗層（設計稿 dimLayer()）：成個舞台黑色 booklet.veil，中間留返唱片夾個窿（播／停照睇得清、照㩒得，決定 5）；
 * 㩒暗位 = 收返歌書。喺碟嘅座標（貼底組）：`top`、`height` 由 bleedSpan 計，蓋埋螢幕頂同底嘅延伸（D111）
 */
export const BookletVeil = ({
    layout,
    top,
    height,
    onClose,
}: {
    layout: StageLayout;
    top: number;
    height: number;
    onClose: () => void;
}) => {
    const { disc } = layout;
    const clear = px(hubClearRadius(layout));
    const hole = `M${px(disc.x - clear)} ${disc.y}a${clear} ${clear} 0 1 0 ${px(clear * 2)} 0a${clear} ${clear} 0 1 0 ${px(-clear * 2)} 0z`;
    return (
        <path
            data-part="booklet-veil"
            className="booklet-veil"
            fillRule="evenodd"
            d={`M0 ${px(top)}H${DESIGN_WIDTH}V${px(top + height)}H0z${hole}`}
            opacity={layout.booklet.veil}
            aria-label={t('booklet.close')}
            {...pressable(onClose)}
        />
    );
};

/**
 * 白色框線（設計稿 focusFrame()）：右端接住唱片夾，左邊圓頭喺弧線左邊 frame.gap 之外；線粗唔跟縮放。
 * 以唱片夾嗰邊做原點：過場時由唱片夾向左伸出、收返時縮返入去（booklet.css）
 */
export const BookletFrame = ({ layout, height }: { layout: StageLayout; height: number }) => {
    const { right, left } = frameEnds(layout);
    const { gap, stroke } = layout.booklet.frame;
    const half = px(height / 2);
    const d = `M0 ${-half}H${px(left - gap - right)}a${half} ${half} 0 0 0 0 ${px(height)}H0`;
    return (
        <g transform={`translate(${px(right)} ${layout.disc.y})`} aria-hidden="true">
            <g className="booklet-frame-motion">
                <path
                    data-part="booklet-frame"
                    className="booklet-frame"
                    d={d}
                    fill="none"
                    strokeWidth={stroke}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                />
            </g>
        </g>
    );
};
