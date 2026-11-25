import { DEF } from './defIds';
import { latheWedges } from './lathe';

/* 漸層：數值同設計稿 template.html <defs> 一樣 */
const Gradients = () => (
    <>
        <radialGradient id={DEF.dome} cx="34%" cy="28%" r="80%">
            <stop offset="0" stopColor="#fff" stopOpacity=".62" />
            <stop offset=".45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".2" />
        </radialGradient>
        <linearGradient id={DEF.bevel} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".5" stopColor="#bdbdbd" />
            <stop offset="1" stopColor="#787878" />
        </linearGradient>
        <linearGradient id={DEF.cylinder} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7c7c7c" />
            <stop offset=".22" stopColor="#f7f7f7" />
            <stop offset=".55" stopColor="#b3b3b3" />
            <stop offset=".85" stopColor="#8a8a8a" />
            <stop offset="1" stopColor="#5e5e5e" />
        </linearGradient>
        <radialGradient id={DEF.clamp} cx="38%" cy="35%" r="68%">
            <stop offset="0" stopColor="#34353a" />
            <stop offset=".55" stopColor="#17171a" />
            <stop offset="1" stopColor="#070708" />
        </radialGradient>
        <radialGradient id={DEF.ball} cx="38%" cy="30%" r="75%">
            <stop offset="0" stopColor="#f2f3f5" />
            <stop offset="1" stopColor="#5d5f65" />
        </radialGradient>
        <linearGradient id={DEF.sheen} x1="0" y1="0" x2="1" y2="1">
            <stop offset=".3" stopColor="#fff" stopOpacity="0" />
            <stop offset=".47" stopColor="#fff" stopOpacity=".2" />
            <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={DEF.stage} cx="30%" cy="12%" r="110%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eeefec" />
        </radialGradient>
    </>
);

const BLUR_FILTERS = [
    { id: DEF.shadow, deviation: 9, margin: 40 },
    { id: DEF.shadowLarge, deviation: 26, margin: 40 },
    { id: DEF.glow, deviation: 7, margin: 60 },
] as const;

/** 共用嘅 SVG 定義：漸層、模糊濾鏡、車床紋。成個舞台 render 一次 */
export const SvgDefs = () => (
    <defs>
        <Gradients />
        {BLUR_FILTERS.map(({ id, deviation, margin }) => (
            <filter
                key={id}
                id={id}
                x={`-${margin}%`}
                y={`-${margin}%`}
                width={`${100 + margin * 2}%`}
                height={`${100 + margin * 2}%`}
            >
                <feGaussianBlur stdDeviation={deviation} />
            </filter>
        ))}
        <g id={DEF.lathe}>
            {latheWedges().map(({ d, fill }) => (
                <path key={d} d={d} fill={fill} />
            ))}
        </g>
    </defs>
);
