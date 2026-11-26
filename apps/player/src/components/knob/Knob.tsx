import { t } from '../../i18n/t';
import { hitSizeUnits, scaleAngle } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal, Shadow } from '../metal/Metal';
import { px } from '../svgNumber';
import { KNOB_SHAPE } from './knobShape';
import { KnobScale } from './KnobScale';
import { type KnobTurnOptions, useKnobTurn } from './useKnobTurn';
import './knob.css';

interface KnobProps extends KnobTurnOptions {
    accent: string;
    glow: string;
    /** 讀屏讀嘅而家指住嗰隻碟（碟名） */
    valueText: string;
    /** 俾歌單嘅暗層蓋住（S-074）：Tab 唔到、讀屏唔讀 */
    covered?: boolean;
}

const { outline, knurl, face, pointer, glow: glowRing } = KNOB_SHAPE;

/** 旋鈕身：落影、圓柱、滾花邊、車床面 */
const KnobBody = ({ knob }: Pick<StageLayout, 'knob'>) => (
    <>
        <Shadow cx={knob.x} cy={knob.y} r={knob.r} {...KNOB_SHAPE.shadow} />
        <circle
            cx={knob.x}
            cy={knob.y}
            r={knob.r}
            fill={ref(DEF.cylinder)}
            stroke={outline.color}
            strokeWidth={outline.width}
        />
        <circle
            cx={knob.x}
            cy={knob.y}
            r={knob.r - knurl.inset}
            fill="none"
            stroke={knurl.color}
            strokeOpacity={knurl.opacity}
            strokeWidth={knurl.width}
            strokeDasharray={knurl.dash}
        />
        <Metal
            cx={knob.x}
            cy={knob.y}
            r={knob.r - face.inset}
            rot={face.rot}
            bevel={face.bevel}
            shadow={false}
        />
    </>
);

/** 指針（專輯色）：轉去而家嗰格嘅角度（CSS 過場） */
const KnobPointer = ({
    knob,
    angle,
    accent,
}: Pick<StageLayout, 'knob'> & { angle: number; accent: string }) => {
    const top = knob.r - face.inset;
    return (
        <g
            data-part="knob-pointer"
            className="knob-move"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px) rotate(${px(angle)}deg)` }}
        >
            <path
                d={`M${px(top * pointer.from)} 0H${px(top - pointer.endInset)}`}
                stroke={accent}
                strokeWidth={pointer.width}
                strokeLinecap="round"
            />
        </g>
    );
};

/** 轉碟中外圈著燈 */
const KnobGlow = ({
    knob,
    open,
    glow,
}: Pick<StageLayout, 'knob'> & { open: boolean; glow: string }) => (
    <circle
        data-part="knob-glow"
        data-on={open}
        className="knob-glow"
        cx={knob.x}
        cy={knob.y}
        r={knob.r + glowRing.gap}
        fill="none"
        stroke={glow}
        strokeWidth={glowRing.width}
        filter={ref(DEF.glow)}
    />
);

/**
 * 大旋鈕（設計稿 knob()）：滾花邊 + 車床面；指針（專輯色）指住而家嗰隻碟；轉碟中外圈著燈。
 * 拖住打圈揀碟、鍵盤方向鍵揀碟（useKnobTurn）；`role="slider"`（Technical Spec 實現注意事項 14）。
 */
export const Knob = (props: KnobProps) => {
    const { layout, positions, current, open, accent, glow, valueText, covered = false } = props;
    const { hitRef, handlers } = useKnobTurn(props);
    const { knob } = layout;
    return (
        <>
            <KnobScale layout={layout} positions={positions} current={current} accent={accent} />
            <KnobGlow knob={knob} open={open} glow={glow} />
            <g
                className="knob"
                role="slider"
                tabIndex={covered ? -1 : 0}
                aria-hidden={covered || undefined}
                aria-label={t('disc.change')}
                aria-valuemin={0}
                aria-valuemax={positions - 1}
                aria-valuenow={current}
                aria-valuetext={valueText}
                {...handlers}
            >
                <circle
                    ref={hitRef}
                    data-part="knob-hit"
                    cx={knob.x}
                    cy={knob.y}
                    r={px(Math.max(knob.r, hitSizeUnits(layout) / 2))}
                    fill="transparent"
                />
                <KnobBody knob={knob} />
                <KnobPointer
                    knob={knob}
                    angle={scaleAngle(layout, current, positions)}
                    accent={accent}
                />
            </g>
        </>
    );
};
