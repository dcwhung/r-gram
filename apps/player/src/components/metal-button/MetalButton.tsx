import type { StageLayout } from '../../stage/layouts';
import { Icon, type IconName } from '../icons/Icon';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { pressable } from '../pressable';
import './metalButton.css';

const ICON_COLOR = '#262626';
const GLOW_HALO_WIDTH = 9;

interface MetalButtonProps {
    x: number;
    y: number;
    icon: IconName;
    /** 畀讀屏用嘅名（由 i18n 嚟） */
    label: string;
    /** 著燈：外圈同 icon 轉做著燈色 */
    lit?: boolean;
    /** 停用：變灰、㩒唔到，但仍然 focus 得到（讀屏會講「已停用」） */
    disabled?: boolean;
    glow: string;
    metrics: StageLayout['buttons'];
    /** 感應範圍半徑（由 44pt 規則計出嚟，大過掣本身） */
    hitRadius: number;
    onPress: () => void;
}

/** 著燈嘅外圈：一圈實線加一圈柔光 */
const GlowRing = ({
    x,
    y,
    r,
    width,
    glow,
}: {
    x: number;
    y: number;
    r: number;
    width: number;
    glow: string;
}) => (
    <>
        <circle
            cx={x}
            cy={y}
            r={r}
            fill="none"
            stroke={glow}
            strokeWidth={GLOW_HALO_WIDTH}
            opacity=".7"
            filter={ref(DEF.glow)}
        />
        <circle
            data-part="glow-ring"
            cx={x}
            cy={y}
            r={r}
            fill="none"
            stroke={glow}
            strokeWidth={width}
        />
    </>
);

/** 圓形拉絲鋁掣（設計稿 button()） */
export const MetalButton = (props: MetalButtonProps) => {
    const { x, y, icon, label, lit = false, disabled = false, glow, metrics, hitRadius } = props;
    const ringRadius = metrics.r + metrics.ringGap + metrics.ringWidth / 2;
    return (
        <g
            className="metal-button"
            aria-label={label}
            aria-pressed={lit}
            aria-disabled={disabled}
            {...pressable(props.onPress, disabled)}
        >
            <circle data-part="hit" cx={x} cy={y} r={hitRadius} fill="transparent" />
            {lit && <GlowRing x={x} y={y} r={ringRadius} width={metrics.ringWidth} glow={glow} />}
            <Metal cx={x} cy={y} r={metrics.r} />
            <Icon
                name={icon}
                cx={x}
                cy={y}
                size={metrics.iconSize}
                color={lit ? glow : ICON_COLOR}
            />
            {disabled && <circle cx={x} cy={y} r={metrics.r + 1} fill="#f1f1ee" opacity=".62" />}
        </g>
    );
};
