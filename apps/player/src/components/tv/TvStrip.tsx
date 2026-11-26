import type { TvView } from '../../app/tvView';
import type { TvLayout } from '../../stage/layouts';
import { truncateLine } from '../../utils/truncateLine';
import type { TextMeasure } from '../../utils/textMeasure';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';

/* 設計稿 tvSet() 機身下面嗰條：顏色同透明度 */
const TRACK = { fill: '#000', opacity: 0.14 } as const;
const LED_HALO_OPACITY = 0.5;
/** 時間用 slab light（量字時當 300）；歌名比基線低 1（設計稿 textY + 1） */
const TIME_WEIGHT = 300;
const TITLE_DY = 1;
const VENT = { h: 5, rx: 2.5, opacity: 0.3, shineDy: 5, shineH: 1.2, shineOpacity: 0.8 } as const;
const TITLE_WEIGHT = 700;
const MV_LABEL = 'MV';

const Vents = ({ tv }: { tv: TvLayout }) => {
    const { lineX, textY, vents } = tv.strip;
    return Array.from({ length: vents.count }, (_, i) => {
        const x = lineX + i * vents.pitch;
        const y = textY + vents.dy;
        return (
            <g key={x}>
                <rect
                    x={x}
                    y={y}
                    width={vents.w}
                    height={VENT.h}
                    rx={VENT.rx}
                    fill="#000"
                    opacity={VENT.opacity}
                />
                <rect
                    x={x}
                    y={y + VENT.shineDy}
                    width={vents.w}
                    height={VENT.shineH}
                    fill="#fff"
                    opacity={VENT.shineOpacity}
                />
            </g>
        );
    });
};

interface TvStripProps {
    tv: TvLayout;
    view: TvView;
    measure: TextMeasure;
}

/** 歌名放唔落（撞到時間）就截短（設計稿寫死 40 號字，冇講長歌名） */
const fittedTitle = ({ tv, view, measure }: TvStripProps) => {
    const { strip } = tv;
    const timeFont = {
        family: 'slab',
        size: strip.time.size,
        weight: TIME_WEIGHT,
        spacing: strip.time.spacing,
    } as const;
    const timeLeft = strip.lineX + strip.lineW - measure(view.timeText, timeFont);
    const room = timeLeft - strip.title.gap - strip.title.x;
    const font = {
        family: 'cjk',
        size: strip.title.size,
        weight: TITLE_WEIGHT,
        spacing: 0,
    } as const;
    return truncateLine(view.title, room, (text) => measure(text, font));
};

/** 進度線（底條 + 專輯色）同指示燈 */
const Progress = ({ tv, view }: Pick<TvStripProps, 'tv' | 'view'>) => {
    const { strip } = tv;
    const ledY = strip.textY + strip.led.dy;
    const line = { x: strip.lineX, y: strip.lineY, height: strip.lineH, rx: strip.lineH / 2 };
    return (
        <>
            <rect {...line} width={strip.lineW} fill={TRACK.fill} opacity={TRACK.opacity} />
            <rect
                {...line}
                data-part="tv-progress"
                width={px(strip.lineW * view.progress)}
                fill={view.accent}
            />
            <circle
                cx={strip.led.x}
                cy={ledY}
                r={strip.led.halo}
                fill={view.glow}
                opacity={LED_HALO_OPACITY}
                filter={ref(DEF.glow)}
            />
            <circle cx={strip.led.x} cy={ledY} r={strip.led.r} fill={view.glow} />
        </>
    );
};

/** 機身下面：進度線（專輯色）、指示燈、`MV` + 歌名、已播時間、散熱坑（US-007） */
export const TvStrip = (props: TvStripProps) => {
    const { tv, view } = props;
    const { strip } = tv;
    return (
        <g data-part="tv-strip">
            <Progress tv={tv} view={view} />
            <text className="tv-mv" x={strip.mv.x} y={strip.textY} fontSize={strip.mv.size}>
                {MV_LABEL}
            </text>
            <text
                data-part="tv-title"
                className="tv-title"
                x={strip.title.x}
                y={strip.textY + TITLE_DY}
                fontSize={strip.title.size}
            >
                {fittedTitle(props)}
            </text>
            <text
                data-part="tv-time"
                className="tv-time"
                x={strip.lineX + strip.lineW}
                y={strip.textY}
                textAnchor="end"
                fontSize={strip.time.size}
                letterSpacing={strip.time.spacing}
            >
                {view.timeText}
            </text>
            <Vents tv={tv} />
        </g>
    );
};
