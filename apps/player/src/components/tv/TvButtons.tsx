import type { ReactNode } from 'react';
import type { TvButton, TvView } from '../../app/tvView';
import { t } from '../../i18n/t';
import { hitSizeUnits } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { pressable } from '../pressable';

/* 設計稿 tvSet()：金屬掣（同其他掣同一種質感），生效嗰粒外圈同 icon 著燈 */
const RING = { width: 3, idle: '#9a9ca2' } as const;
const HALO = { width: 8, opacity: 0.7 } as const;
const ICON_IDLE = '#2c2e34';
const METAL = { rot: 24, bevel: 0.12 } as const;

const ICONS: Readonly<Record<TvButton, ReactNode>> = {
    play: <path d="M-8 -12L13 0L-8 12z" />,
    pause: (
        <>
            <rect x="-10" y="-11" width="7" height="22" rx="1.5" />
            <rect x="3" y="-11" width="7" height="22" rx="1.5" />
        </>
    ),
    stop: <rect x="-10" y="-10" width="20" height="20" rx="2.5" />,
};

const ORDER: readonly TvButton[] = ['play', 'pause', 'stop'];

export interface TvHandlers {
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    /** 音量旋鈕（T-061）：0–1 */
    onVolume: (level: number) => void;
    onToggleMute: () => void;
    /** 快轉／倒轉旋鈕（T-061）：正數快轉、負數倒轉（秒） */
    onSeekBy: (deltaSec: number) => void;
    onSeekTo: (positionSec: number) => void;
}

interface TvButtonsProps {
    layout: StageLayout;
    view: TvView;
    handlers: TvHandlers;
    /** 熄機期間鎖住（Technical Spec「MV 電視過場」） */
    locked: boolean;
}

const pressOf = (handlers: TvHandlers): Record<TvButton, () => void> => ({
    play: handlers.onPlay,
    pause: handlers.onPause,
    stop: handlers.onStop,
});

/** ▶ ❚❚ ■（D26：喺機身下面，每粒 44pt 感應範圍唔重疊）；著燈嗰粒 = `aria-pressed`（設計稿） */
export const TvButtons = ({ layout, view, handlers, locked }: TvButtonsProps) => {
    const { buttons } = layout.tv;
    const hit = hitSizeUnits(layout);
    const press = pressOf(handlers);
    const ringR = buttons.r + buttons.ringGap;
    return ORDER.map((name, i) => {
        const x = buttons.xs[i] ?? 0;
        const { y } = buttons;
        const lit = view.active === name;
        return (
            <g
                key={name}
                className="tv-button"
                data-part={`tv-${name}`}
                aria-label={t(`mv.${name}`)}
                aria-pressed={lit}
                aria-disabled={locked}
                {...pressable(press[name], locked)}
            >
                <rect x={x - hit / 2} y={y - hit / 2} width={hit} height={hit} fill="transparent" />
                {lit && (
                    <circle
                        cx={x}
                        cy={y}
                        r={ringR}
                        fill="none"
                        stroke={view.glow}
                        strokeWidth={HALO.width}
                        opacity={HALO.opacity}
                        filter={ref(DEF.glow)}
                    />
                )}
                <circle
                    cx={x}
                    cy={y}
                    r={ringR}
                    fill="none"
                    stroke={lit ? view.glow : RING.idle}
                    strokeWidth={RING.width}
                />
                <Metal cx={x} cy={y} r={buttons.r} rot={METAL.rot} bevel={METAL.bevel} />
                <g transform={`translate(${x} ${y})`} fill={lit ? view.glow : ICON_IDLE}>
                    {ICONS[name]}
                </g>
            </g>
        );
    });
};
