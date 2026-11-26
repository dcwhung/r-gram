import type { TvLayout } from '../../stage/layouts';
import { roundBox } from './tvShapes';
import { TvDialFace } from './TvDial';
import { TV_DEF, tvRef } from './tvDefIds';

/* 設計稿 tvSet()：右邊控制板嘅喇叭坑、兩粒旋鈕下面嘅 icon */
const PANEL_EDGE_WIDTH = 2;
const SLOT = {
    fill: '#050506',
    shine: '#fff',
    shineOpacity: 0.22,
    shineInset: 2,
    shineH: 1.2,
} as const;
const GLYPH_OPACITY = 0.78;
/** 喇叭（音量） */
export const SPEAKER_GLYPH =
    'M-15 -4h6l8 -6v20l-8 -6h-6zM4 -6a8 8 0 0 1 0 12l-2 -2a5 5 0 0 0 0 -8zM9 -11a14 14 0 0 1 0 22l-2 -2a11 11 0 0 0 0 -18z';
/** ◀◀ ▶▶（向左扭倒轉、向右扭快轉） */
const SEEK_GLYPH = 'M-5 -8v16l-10 -8zM-16 -8v16l-10 -8zM5 -8v16l10 -8zM16 -8v16l10 -8z';
/** 設計稿嘅把手角度：音量 26°、快轉／倒轉 −63° */
export const MOCKUP_TURN = { volume: 26, seek: -63 } as const;

const Grille = ({ tv }: { tv: TvLayout }) => {
    const { panel } = tv;
    const { top, bottom, pitch, inset, slot } = panel.grille;
    const count = Math.ceil((bottom - top) / pitch);
    return Array.from({ length: count }, (_, i) => {
        const y = panel.y + top + i * pitch;
        return (
            <g key={y}>
                <rect
                    x={panel.x + inset}
                    y={y}
                    width={panel.w - inset * 2}
                    height={slot}
                    rx={slot / 2}
                    fill={SLOT.fill}
                />
                <rect
                    x={panel.x + inset + SLOT.shineInset}
                    y={y + slot}
                    width={panel.w - (inset + SLOT.shineInset) * 2}
                    height={SLOT.shineH}
                    fill={SLOT.shine}
                    opacity={SLOT.shineOpacity}
                />
            </g>
        );
    });
};

export const TvGlyph = ({ tv, y, d }: { tv: TvLayout; y: number; d: string }) => (
    <path
        d={d}
        transform={`translate(${tv.knobs.x} ${y + tv.knobs.dialR + tv.knobs.glyphGap})`}
        fill="#fff"
        opacity={GLYPH_OPACITY}
    />
);

/** 右邊控制板：喇叭坑 + 兩粒大旋鈕（音量；快轉／倒轉）同下面嘅 icon（T-061 先郁得） */
export const TvPanel = ({ tv }: { tv: TvLayout }) => (
    <>
        <rect
            {...roundBox(tv.panel, tv.panel.corner)}
            fill={tvRef(TV_DEF.panel)}
            stroke={tvRef(TV_DEF.panelEdge)}
            strokeWidth={PANEL_EDGE_WIDTH}
        />
        <Grille tv={tv} />
        <g aria-hidden="true">
            <TvDialFace tv={tv} y={tv.knobs.volumeY} turn={MOCKUP_TURN.volume} />
            <TvGlyph tv={tv} y={tv.knobs.volumeY} d={SPEAKER_GLYPH} />
            <TvDialFace tv={tv} y={tv.knobs.seekY} turn={MOCKUP_TURN.seek} />
            <TvGlyph tv={tv} y={tv.knobs.seekY} d={SEEK_GLYPH} />
        </g>
    </>
);
