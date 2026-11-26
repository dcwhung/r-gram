import type { TvLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';
import { TV_DEF, tvRef } from './tvDefIds';
import { crtPath } from './tvShapes';

/* 設計稿 tvSet()：玻璃四周外擴 30 嘅三層（掃描線、暗角、反光）；頂部弧位一條光邊 */
const OVERLAY_PAD = 30;
const RIM_FILL = '#0a0a0b';
const BOW = { inset: 70, drop: 26, lift: 1.3, width: 5, glow: 0.5, line: 0.16 } as const;

/** 頂部弧位嘅光邊 */
const bowPath = ({ glass }: TvLayout) => {
    const cx = glass.x + glass.w / 2;
    const y = glass.y + BOW.drop;
    return `M${glass.x + BOW.inset} ${y}Q${cx} ${px(y - glass.bulgeY * BOW.lift)} ${glass.x + glass.w - BOW.inset} ${y}`;
};

/**
 * 黑膠邊 → 玻璃（管面）→ 掃描線、暗角、反光、光邊 → 內陰影（玻璃凹入去）。
 * MV 本身係疊喺上面嘅 HTML `<video>`（TvScreen，Technical Spec「電視」）；呢度係關機時見到嘅管面
 */
export const TvGlass = ({ tv }: { tv: TvLayout }) => {
    const { glass } = tv;
    const shape = crtPath(glass);
    const cover = {
        x: glass.x - OVERLAY_PAD,
        y: glass.y - OVERLAY_PAD,
        width: glass.w + OVERLAY_PAD * 2,
        height: glass.h + OVERLAY_PAD * 2,
    };
    const bow = bowPath(tv);
    return (
        <>
            <clipPath id={TV_DEF.glassClip}>
                <path d={shape} />
            </clipPath>
            <path
                d={crtPath({ ...glass, corner: glass.corner + glass.rimCorner }, glass.rim)}
                fill={RIM_FILL}
            />
            <path data-part="tv-glass" d={shape} fill={tvRef(TV_DEF.tube)} />
            <g clipPath={tvRef(TV_DEF.glassClip)}>
                <rect {...cover} fill={tvRef(TV_DEF.scan)} />
                <rect {...cover} fill={tvRef(TV_DEF.vignette)} />
                <rect {...cover} fill={tvRef(TV_DEF.glare)} />
                <path
                    d={bow}
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={BOW.glow}
                    strokeWidth={BOW.width}
                    strokeLinecap="round"
                    filter={ref(DEF.glow)}
                />
                <path
                    d={bow}
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={BOW.line}
                    strokeWidth={BOW.width}
                    strokeLinecap="round"
                />
            </g>
            <path d={shape} fill="#000" filter={tvRef(TV_DEF.inner)} />
        </>
    );
};
