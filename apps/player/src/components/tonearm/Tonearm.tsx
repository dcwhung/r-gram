import { polar } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { px } from '../svgNumber';
import { ArmTube } from './ArmTube';
import './tonearm.css';

const BASE_SCREWS = 4;
const LED_OFF = '#5a5a5a';

interface TonearmProps {
    arm: StageLayout['arm'];
    /** 落咗針（播緊）；否則喺泊位 */
    playing: boolean;
    glow: string;
}

/** 針頭殼連小燈：喺臂管尾，播緊時燈著 */
const Headshell = ({ playing, glow }: Pick<TonearmProps, 'playing' | 'glow'>) => (
    <>
        <path d="M22 15L44 42" stroke="#9a9a9a" strokeWidth="5" strokeLinecap="round" />
        <rect
            x="-6"
            y="-19"
            width="66"
            height="38"
            rx="6"
            fill={ref(DEF.cylinder)}
            stroke="#5c5c5c"
            strokeWidth="1.5"
        />
        <rect x="6" y="-12" width="30" height="24" rx="3" fill="#2a2a2a" />
        {playing && (
            <circle
                data-part="led-glow"
                cx="47"
                cy="0"
                r="11"
                fill={glow}
                opacity=".5"
                filter={ref(DEF.glow)}
            />
        )}
        <circle data-part="led" cx="47" cy="0" r="5.5" fill={playing ? glow : LED_OFF} />
    </>
);

/** 唱臂（設計稿 tonearm()）：底座固定；臂以軸心轉動，泊位 ↔ 落針 */
export const Tonearm = ({ arm, playing, glow }: TonearmProps) => {
    const { x, y, base } = arm;
    const deg = playing ? arm.playDeg : arm.parkDeg;
    return (
        <>
            <Metal cx={x} cy={y} r={base} rot={-28} bevel={0.07} />
            {Array.from({ length: BASE_SCREWS }, (_, index) => {
                const screw = polar(arm, base * 0.72, 45 + (index * 360) / BASE_SCREWS);
                return (
                    <circle
                        key={index}
                        cx={px(screw.x)}
                        cy={px(screw.y)}
                        r={px(base * 0.07)}
                        fill="#6a6a6a"
                    />
                );
            })}
            <g
                data-part="arm"
                className="tonearm-arm"
                style={{ transform: `translate(${x}px, ${y}px) rotate(${deg}deg)` }}
            >
                <ArmTube length={arm.length} base={base}>
                    <Headshell playing={playing} glow={glow} />
                </ArmTube>
            </g>
            <Metal cx={x} cy={y} r={base * 0.34} rot={60} bevel={0.14} shadow={false} />
            <circle cx={x} cy={y} r={px(base * 0.1)} fill="#3d3d3d" />
        </>
    );
};
