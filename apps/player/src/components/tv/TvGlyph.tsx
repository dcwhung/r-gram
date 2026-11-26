import type { TvLayout } from '../../stage/layouts';

/* 設計稿 tvSet()：兩粒旋鈕下面嘅 icon（白色、78%） */
const GLYPH_OPACITY = 0.78;
/** 喇叭身（音量、靜音共用） */
const SPEAKER = 'M-15 -4h6l8 -6v20l-8 -6h-6z';
/** 喇叭嘅兩條聲波 */
const WAVES =
    'M4 -6a8 8 0 0 1 0 12l-2 -2a5 5 0 0 0 0 -8zM9 -11a14 14 0 0 1 0 22l-2 -2a11 11 0 0 0 0 -18z';
/** ◀◀ ▶▶（向左扭倒轉、向右扭快轉） */
const SEEK = 'M-5 -8v16l-10 -8zM-16 -8v16l-10 -8zM5 -8v16l10 -8zM16 -8v16l10 -8z';
/** 靜音：聲波換做一個交叉（設計稿冇畫靜音；🅰️ T-061） */
const CROSS = { d: 'M3 -6l12 12M15 -6l-12 12', width: 3 } as const;

export type GlyphKind = 'volume' | 'muted' | 'seek';

interface TvGlyphProps {
    tv: TvLayout;
    /** 旋鈕中心嘅 y；icon 喺刻度圈下面 glyphGap */
    y: number;
    kind: GlyphKind;
}

export const TvGlyph = ({ tv, y, kind }: TvGlyphProps) => (
    <g
        data-part={kind === 'seek' ? 'tv-seek-glyph' : 'tv-volume-glyph'}
        data-muted={kind === 'muted' || undefined}
        transform={`translate(${tv.knobs.x} ${y + tv.knobs.dialR + tv.knobs.glyphGap})`}
        fill="#fff"
        opacity={GLYPH_OPACITY}
        aria-hidden="true"
    >
        {kind === 'seek' && <path d={SEEK} />}
        {kind === 'volume' && <path d={`${SPEAKER}${WAVES}`} />}
        {kind === 'muted' && (
            <>
                <path d={SPEAKER} />
                <path
                    d={CROSS.d}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={CROSS.width}
                    strokeLinecap="round"
                />
            </>
        )}
    </g>
);
