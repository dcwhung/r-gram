import type { TvLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { px } from '../svgNumber';
import { TV_DEF, tvRef } from './tvDefIds';
import { crtPath, legShadePath, legSlices, maskCurve, roundBox } from './tvShapes';

/* 設計稿 tvSet() 嘅顏色（光源喺左上） */
const ROD = { shadow: '#000', body: '#7d8087', shine: '#f1f2f4' } as const;
const ROD_WIDTH = { body: 8, shine: 3, shineDx: -1.5 } as const;
const ROD_SHADOW = { dx: 5, dy: 8, opacity: 0.3 } as const;
const BALL = { rot: 40, bevel: 0.2 } as const;
const MOUNT_STROKE = '#6b6b6b';
const SHELL_SHADOW_OPACITY = 0.45;
const FRONT_EDGE = { colour: '#fff', opacity: 0.8, width: 1.5 } as const;
const MASK_SHADOW = { opacity: 0.6, dx: 4, dy: 7 } as const;

/** 天線：兩支桿 + 球頭，有落影；以座做原點，升起之後先彈出、收埋之前先縮返（CSS） */
const Antenna = ({ tv }: { tv: TvLayout }) => (
    <>
        <g transform={`translate(${tv.w / 2} ${tv.antenna.baseY})`}>
            <g className="tv-antenna" data-part="tv-antenna">
                {tv.antenna.rods.map(({ x, y }) => (
                    <g key={`${x},${y}`}>
                        <path
                            d={`M${ROD_SHADOW.dx} ${ROD_SHADOW.dy}l${x} ${y}`}
                            stroke={ROD.shadow}
                            strokeOpacity={ROD_SHADOW.opacity}
                            strokeWidth={ROD_WIDTH.body}
                            strokeLinecap="round"
                            filter={ref(DEF.shadow)}
                        />
                        <path
                            d={`M0 0l${x} ${y}`}
                            stroke={ROD.body}
                            strokeWidth={ROD_WIDTH.body}
                            strokeLinecap="round"
                        />
                        <path
                            d={`M${ROD_WIDTH.shineDx} 0l${x} ${y}`}
                            stroke={ROD.shine}
                            strokeWidth={ROD_WIDTH.shine}
                            strokeLinecap="round"
                        />
                        <Metal
                            cx={x}
                            cy={y}
                            r={tv.antenna.ball}
                            rot={BALL.rot}
                            bevel={BALL.bevel}
                            shadow={false}
                        />
                    </g>
                ))}
            </g>
        </g>
        <rect
            x={tv.w / 2 - tv.antenna.mount.w / 2}
            y={tv.antenna.mount.y}
            width={tv.antenna.mount.w}
            height={tv.antenna.mount.h}
            rx={tv.antenna.mount.h / 2 - 1}
            fill={ref(DEF.cylinder)}
            stroke={MOUNT_STROKE}
        />
    </>
);

/** 兩隻向外斜嘅錐形圓腳（喺機殼後面）：上面鋁色、下面三分一黑色膠腳 */
const Legs = ({ tv }: { tv: TvLayout }) => {
    const slices = legSlices(tv);
    const shade = legShadePath(tv);
    const at = [
        { x: tv.leg.inset, lean: 1 },
        { x: tv.w - tv.leg.inset, lean: -1 },
    ];
    return at.map(({ x, lean }) => (
        <g
            key={x}
            transform={`translate(${x} ${tv.h - tv.leg.tuck}) rotate(${px(lean * tv.leg.leanDeg)})`}
        >
            {slices.map(({ d, tip }) => (
                <path key={d} d={d} fill={tvRef(tip ? TV_DEF.legTip : TV_DEF.cylinderH)} />
            ))}
            <path d={shade} fill={tvRef(TV_DEF.legShade)} />
        </g>
    ));
};

/** 倒角鋁殼（外斜邊 → 內斜邊 → 正面）、凹入嘅深灰面板、暖白斜邊框（三層，向玻璃斜入去） */
const Body = ({ tv }: { tv: TvLayout }) => {
    const shell = { x: 0, y: 0, w: tv.w, h: tv.h };
    const [inner, face] = tv.shell.insets;
    const front = roundBox(tv.front, tv.front.corner);
    return (
        <>
            <rect
                {...roundBox(shell, tv.corner)}
                fill="#000"
                opacity={SHELL_SHADOW_OPACITY}
                filter={tvRef(TV_DEF.shadowXL)}
                transform={`translate(0 ${tv.shell.shadowDy})`}
            />
            <rect {...roundBox(shell, tv.corner)} fill={tvRef(TV_DEF.shellOuter)} />
            <rect {...roundBox(shell, tv.corner, inner)} fill={tvRef(TV_DEF.shellIn)} />
            <rect {...roundBox(shell, tv.corner, face)} fill={tvRef(TV_DEF.shellFace)} />
            <rect {...front} fill={tvRef(TV_DEF.front)} />
            <rect {...front} fill="#000" filter={tvRef(TV_DEF.inner)} />
            <rect
                {...front}
                fill="none"
                stroke={FRONT_EDGE.colour}
                strokeOpacity={FRONT_EDGE.opacity}
                strokeWidth={FRONT_EDGE.width}
            />
            <path
                d={crtPath(maskCurve(tv, 0))}
                fill="#000"
                opacity={MASK_SHADOW.opacity}
                filter={ref(DEF.shadow)}
                transform={`translate(${MASK_SHADOW.dx} ${MASK_SHADOW.dy})`}
            />
            {tv.mask.insets.map((inset, i) => (
                <path
                    key={inset}
                    d={crtPath(maskCurve(tv, inset))}
                    fill={tvRef(TV_DEF.mask[i] ?? TV_DEF.mask[0])}
                />
            ))}
        </>
    );
};

/** 機殼（設計稿 tvSet() 嘅頭半：天線、腳、殼、面板、斜邊框） */
export const TvShell = ({ tv }: { tv: TvLayout }) => (
    <>
        <Antenna tv={tv} />
        <Legs tv={tv} />
        <Body tv={tv} />
    </>
);
