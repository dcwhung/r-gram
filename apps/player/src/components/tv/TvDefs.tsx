import { memo } from 'react';
import { LINEARS, type Stop, TV_DEF } from './tvDefIds';

/* 電視自己嘅漸層同濾鏡（數值喺 tvDefIds）；共用嘅車床紋、落影喺 SvgDefs */
const Linear = ({ id, to, stops }: { id: string; to: string; stops: readonly Stop[] }) => {
    const [x2, y2] = to.split(' ');
    return (
        <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
            {stops.map(([offset, colour, opacity]) => (
                <stop key={offset} offset={offset} stopColor={colour} stopOpacity={opacity} />
            ))}
        </linearGradient>
    );
};

/** 內陰影：令形狀睇落係凹入去（設計稿 fInner） */
const InnerShadow = () => (
    <filter id={TV_DEF.inner} x="-10%" y="-10%" width="120%" height="120%">
        <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feGaussianBlur stdDeviation="11" />
        <feOffset dx="5" dy="9" result="shade" />
        <feFlood floodColor="#000" floodOpacity=".85" />
        <feComposite in2="shade" operator="in" />
        <feComposite in2="SourceAlpha" operator="in" />
    </filter>
);

export const TvDefs = memo(() => (
    <defs>
        {LINEARS.map((gradient) => (
            <Linear key={gradient.id} {...gradient} />
        ))}
        <radialGradient id={TV_DEF.tube} cx="45%" cy="40%" r="75%">
            <stop offset="0" stopColor="#222b2e" />
            <stop offset="1" stopColor="#080b0c" />
        </radialGradient>
        <radialGradient id={TV_DEF.vignette} cx="50%" cy="50%" r="72%">
            <stop offset=".42" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".62" />
        </radialGradient>
        <linearGradient
            id={TV_DEF.legShade}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="14"
            x2="0"
            y2="64"
        >
            <stop offset="0" stopColor="#000" stopOpacity=".55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <pattern id={TV_DEF.scan} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="1.5" fill="#000" opacity=".16" />
        </pattern>
        <InnerShadow />
        <filter id={TV_DEF.shadowXL} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="40" />
        </filter>
    </defs>
));
TvDefs.displayName = 'TvDefs';
