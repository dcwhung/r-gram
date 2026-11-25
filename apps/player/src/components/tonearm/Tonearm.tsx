import { FULL_TURN_DEG, polar } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { px } from '../svgNumber';
import { ARM_SHAPE } from './armShape';
import { ArmTube } from './ArmTube';
import './tonearm.css';

const LED_OFF = '#5a5a5a';

interface TonearmProps {
    arm: StageLayout['arm'];
    /** 落咗針（播緊）；否則喺泊位 */
    playing: boolean;
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

type HeadshellProps = Pick<TonearmProps, 'playing' | 'glow'> & Pick<StageLayout['arm'], 'bend'>;

/** 針頭殼連小燈：喺臂管尾，播緊時燈著 */
const Headshell = ({ playing, glow, bend }: HeadshellProps) => {
    const { wire, shell, cartridge, led, outline } = ARM_SHAPE;
    const wirePath = `M${wire.x1} ${px(-bend * wire.y1)}L${wire.x2} ${px(-bend * wire.y2)}`;
    return (
        <>
            <path d={wirePath} stroke="#9a9a9a" strokeWidth={wire.width} strokeLinecap="round" />
            <rect {...box(shell)} fill={ref(DEF.cylinder)} stroke="#5c5c5c" strokeWidth={outline} />
            <rect {...box(cartridge)} fill="#2a2a2a" />
            {playing && (
                <circle
                    data-part="led-glow"
                    cx={led.x}
                    cy={led.y}
                    r={led.glowR}
                    fill={glow}
                    opacity=".5"
                    filter={ref(DEF.glow)}
                />
            )}
            <circle
                data-part="led"
                cx={led.x}
                cy={led.y}
                r={led.r}
                fill={playing ? glow : LED_OFF}
            />
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

/** 唱臂（設計稿 tonearm()）：底座固定；臂以軸心轉動，泊位 ↔ 落針 */
export const Tonearm = ({ arm, playing, glow }: TonearmProps) => {
    const { x, y, base } = arm;
    const { pivot } = ARM_SHAPE;
    const deg = playing ? arm.playDeg : arm.parkDeg;
    return (
        <>
            <Metal cx={x} cy={y} r={base} {...ARM_SHAPE.base} />
            <BaseScrews arm={arm} />
            <g
                data-part="arm"
                className="tonearm-arm"
                style={{ transform: `translate(${x}px, ${y}px) rotate(${deg}deg)` }}
            >
                <ArmTube length={arm.length} base={base} bend={arm.bend}>
                    <Headshell playing={playing} glow={glow} bend={arm.bend} />
                </ArmTube>
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
