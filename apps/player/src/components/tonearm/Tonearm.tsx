import { FULL_TURN_DEG, polar } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { px } from '../svgNumber';
import { type ArmLeadIn, type ArmPose, armLook } from './armPose';
import { ARM_SHAPE } from './armShape';
import { ArmTube } from './ArmTube';
import './tonearm.css';

const LED_OFF = '#5a5a5a';

interface TonearmProps {
    arm: StageLayout['arm'];
    /** 泊位｜落針（播緊）｜升針（暫停） */
    pose: ArmPose;
    /** 由泊位開始播嘅開場進行緊邊段（`useArmLeadIn`）；唔傳 = 冇開場 */
    leadIn?: ArmLeadIn;
    /** 淡出咗（揀碟期間）：姿勢變就即時到位，冇轉動過場（tonearm.css） */
    instant?: boolean;
    glow: string;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
    corner: number;
}
const box = ({ x, y, width, height, corner }: Box) => ({ x, y, width, height, rx: corner });

type HeadshellProps = { lit: boolean } & Pick<TonearmProps, 'glow'> &
    Pick<StageLayout['arm'], 'bend'>;

/** 針頭殼連小燈：喺臂管尾，落咗針播緊時燈著 */
const Headshell = ({ lit, glow, bend }: HeadshellProps) => {
    const { wire, shell, cartridge, led, outline } = ARM_SHAPE;
    const wirePath = `M${wire.x1} ${px(-bend * wire.y1)}L${wire.x2} ${px(-bend * wire.y2)}`;
    return (
        <>
            <path d={wirePath} stroke="#9a9a9a" strokeWidth={wire.width} strokeLinecap="round" />
            <rect {...box(shell)} fill={ref(DEF.cylinder)} stroke="#5c5c5c" strokeWidth={outline} />
            <rect {...box(cartridge)} fill="#2a2a2a" />
            {lit && (
                <circle
                    data-part="led-glow"
                    className="tonearm-led-glow"
                    cx={led.x}
                    cy={led.y}
                    r={led.glowR}
                    fill={glow}
                    opacity=".5"
                    filter={ref(DEF.glow)}
                />
            )}
            <circle data-part="led" cx={led.x} cy={led.y} r={led.r} fill={lit ? glow : LED_OFF} />
        </>
    );
};

/** 底座上面嗰圈螺絲 */
const BaseScrews = ({ arm }: Pick<TonearmProps, 'arm'>) => {
    const { count, startDeg, orbit, r } = ARM_SHAPE.baseScrews;
    return Array.from({ length: count }, (_, index) => {
        const screw = polar(arm, arm.base * orbit, startDeg + (index * FULL_TURN_DEG) / count);
        return (
            <circle
                key={index}
                cx={px(screw.x)}
                cy={px(screw.y)}
                r={px(arm.base * r)}
                fill="#6a6a6a"
            />
        );
    });
};

/**
 * 唱臂（設計稿 tonearm()）：底座固定；臂以軸心轉動（泊位 ↔ 碟上面）；升針 = 成支臂以軸心放大少少、落影移遠。
 * 角度同升降寫喺 inline style 嘅 transform，過場由 tonearm.css 做（減少動態效果時冇過場）。
 */
export const Tonearm = ({ arm, pose, leadIn = null, instant = false, glow }: TonearmProps) => {
    const { x, y, base } = arm;
    const { pivot, lift } = ARM_SHAPE;
    const look = armLook(pose, leadIn);
    const deg = look.onDisc ? arm.playDeg : arm.parkDeg;
    return (
        <>
            <Metal cx={x} cy={y} r={base} {...ARM_SHAPE.base} />
            <BaseScrews arm={arm} />
            <g
                data-part="arm"
                data-instant={instant || undefined}
                className="tonearm-arm"
                style={{ transform: `translate(${x}px, ${y}px) rotate(${deg}deg)` }}
            >
                <g
                    data-part="arm-lift"
                    className="tonearm-lift"
                    style={{ transform: `scale(${look.lifted ? lift.scale : 1})` }}
                >
                    <ArmTube length={arm.length} base={base} bend={arm.bend} lifted={look.lifted}>
                        <Headshell lit={look.lit} glow={glow} bend={arm.bend} />
                    </ArmTube>
                </g>
            </g>
            <Metal
                cx={x}
                cy={y}
                r={base * pivot.r}
                rot={pivot.rot}
                bevel={pivot.bevel}
                shadow={false}
            />
            <circle cx={x} cy={y} r={px(base * pivot.pin)} fill="#3d3d3d" />
        </>
    );
};
