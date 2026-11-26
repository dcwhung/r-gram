import { useMemo } from 'react';
import { APP_VERSION } from '../../config/appVersion';
import { t } from '../../i18n/t';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { pressable } from '../pressable';
import { px } from '../svgNumber';
import { type UpdatePillBox, updateHitBox, updatePillBox } from './updateBox';
import './updateButton.css';

/** 版本掣嘅字用 slab 正常字重（設計稿 SLAB；版本號平時係 SLAB_LIGHT） */
const TEXT_WEIGHT = 400;

interface UpdateButtonProps {
    layout: StageLayout;
    /** 量版本號嘅闊度：膠囊跟真字大細 */
    measure: TextMeasure;
    /** 㩒：即刻換新版本並重新載入（同以前「立即更新」一樣，唔理防 loop 嘅 30 秒） */
    onPress: () => void;
    /** 暗層蓋住（歌單、歌書、MV）：照畫（跟住變暗），唔係掣（㩒唔到、Tab 唔到），版本號照畀讀屏讀（W-058） */
    covered?: boolean;
}

/** 量真字（字體載入完會換新嘅量字函數，膠囊跟住重新計） */
const usePill = (layout: StageLayout, measure: TextMeasure, text: string): UpdatePillBox =>
    useMemo(() => {
        const { update, version } = layout.info;
        const font = {
            family: 'slab',
            size: update.size,
            weight: TEXT_WEIGHT,
            spacing: version.spacing,
        } as const;
        return updatePillBox(layout, measure(text, font));
    }, [layout, measure, text]);

/** 會閃嘅部分：膠囊框線同版本號（純色，冇光暈） */
const Body = ({
    layout,
    pill,
    text,
}: {
    layout: StageLayout;
    pill: UpdatePillBox;
    text: string;
}) => (
    <g data-part="update-blink" className="update-blink">
        <rect
            data-part="update-pill"
            className="update-pill"
            x={px(pill.x)}
            y={px(pill.y)}
            width={px(pill.w)}
            height={pill.h}
            rx={pill.rx}
            fill="none"
            strokeWidth={layout.info.update.stroke}
        />
        <text
            data-part="update-text"
            className="update-text"
            x={px(pill.textX)}
            y={pill.textY}
            textAnchor="end"
            fontSize={layout.info.update.size}
            letterSpacing={layout.info.version.spacing}
        >
            {text}
        </text>
    </g>
);

/**
 * 有新版本時右上版本號變成嘅掣（T-109；設計稿第 20 版 updateButton()）：透明底、膠囊框線、橙黃字，
 * 成粒（框 + 字）一明一暗；感應範圍唔閃。字闊用真字量，膠囊右邊固定。
 */
export const UpdateButton = ({ layout, measure, onPress, covered = false }: UpdateButtonProps) => {
    const text = t('app.version', { version: APP_VERSION });
    const pill = usePill(layout, measure, text);
    const hit = updateHitBox(layout, pill);
    // 暗層下面（W-058，D95 🅰️ ①）：淨係一組普通圖形（唔係掣、唔入 Tab 次序、㩒唔到），版本號照畀讀屏讀
    const behaviour = covered
        ? { pointerEvents: 'none' }
        : { 'aria-label': t('update.applyLabel'), ...pressable(onPress) };
    return (
        <g data-part="update-button" className="update-button" {...behaviour}>
            <Body layout={layout} pill={pill} text={text} />
            {covered ? null : (
                <rect
                    data-part="update-hit"
                    className="update-hit"
                    x={px(hit.x)}
                    y={px(hit.y)}
                    width={px(hit.w)}
                    height={hit.h}
                    fill="transparent"
                />
            )}
        </g>
    );
};
