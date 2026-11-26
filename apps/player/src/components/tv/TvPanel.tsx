import type { TvView } from '../../app/tvView';
import type { StageLayout, TvLayout } from '../../stage/layouts';
import type { TvHandlers } from './TvButtons';
import { TV_DEF, tvRef } from './tvDefIds';
import { TvSeekKnob } from './TvSeekKnob';
import { roundBox } from './tvShapes';
import { TvVolumeKnob } from './TvVolumeKnob';

/* 設計稿 tvSet()：右邊控制板嘅喇叭坑 */
const PANEL_EDGE_WIDTH = 2;
const SLOT = {
    fill: '#050506',
    shine: '#fff',
    shineOpacity: 0.22,
    shineInset: 2,
    shineH: 1.2,
} as const;

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

interface TvPanelProps {
    layout: StageLayout;
    view: TvView;
    handlers: TvHandlers;
    /** 熄機期間鎖住 */
    locked: boolean;
}

/** 右邊控制板：喇叭坑 + 兩粒大旋鈕（音量；快轉／倒轉，T-061）同下面嘅 icon */
export const TvPanel = ({ layout, view, handlers, locked }: TvPanelProps) => (
    <>
        <rect
            {...roundBox(layout.tv.panel, layout.tv.panel.corner)}
            fill={tvRef(TV_DEF.panel)}
            stroke={tvRef(TV_DEF.panelEdge)}
            strokeWidth={PANEL_EDGE_WIDTH}
        />
        <Grille tv={layout.tv} />
        <TvVolumeKnob layout={layout} view={view} handlers={handlers} locked={locked} />
        <TvSeekKnob layout={layout} view={view} handlers={handlers} locked={locked} />
    </>
);
