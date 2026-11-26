import { type CSSProperties, type KeyboardEvent, useEffect, useRef } from 'react';
import type { TvView } from '../../app/tvView';
import { t } from '../../i18n/t';
import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { estimateTextWidth, type TextMeasure } from '../../utils/textMeasure';
import { TvButtons, type TvHandlers } from './TvButtons';
import { TvDefs } from './TvDefs';
import { TvGlass } from './TvGlass';
import { TvPanel } from './TvPanel';
import { TvScreen } from './TvScreen';
import { TvShell } from './TvShell';
import { TvStrip } from './TvStrip';
import './tv.css';

export type { TvHandlers } from './TvButtons';

interface TvProps {
    layout: StageLayout;
    tv: TvView;
    handlers: TvHandlers;
    /** 量歌名闊度（機身下面嘅歌名截短用） */
    measure?: TextMeasure;
}

/** 開咗電視：focus 入電視（背後嘅唱片機 inert；HomeScene）；Esc = ■（同歌單 Esc 收返一樣） */
const useTvKeys = (locked: boolean, onStop: () => void) => {
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => root.current?.focus({ preventScroll: true }), []);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || locked) return;
        event.preventDefault();
        onStop();
    };
    return { root, onKeyDown };
};

/**
 * MV 電視（設計稿「MV 電視」tvSet()；Functional Spec US-007、§CR-002「MV 電視」、FR-038 過場）：
 * 背後一層模糊 + 淡白（唱片機）→ 機身（升起／收埋）→ 螢幕（HTML `<video>`，開機／熄機）。
 * 貼底組：高身手機跟畫面底（FR-039）。熄機期間鎖住電視掣（Technical Spec「MV 電視過場」）。
 */
export const Tv = ({ layout, tv, handlers, measure = estimateTextWidth }: TvProps) => {
    const { heightUnits, extraUnits } = useStageFitContext();
    const locked = tv.phase === 'closing';
    const { root, onKeyDown } = useTvKeys(locked, handlers.onStop);
    const set = layout.tv;
    return (
        <div
            ref={root}
            className={`tv tv--${tv.phase}`}
            data-part="tv"
            role="group"
            aria-label={t('mv.tv')}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={{ '--tv-rise': set.rise } as CSSProperties}
        >
            <div className="tv-veil" data-part="tv-veil" />
            <div className="tv-motion">
                <svg
                    className="tv-svg"
                    viewBox={`0 0 ${DESIGN_WIDTH} ${heightUnits}`}
                    width="100%"
                    height="100%"
                    preserveAspectRatio="xMidYMin meet"
                >
                    <TvDefs />
                    <g data-part="tv-set" transform={`translate(${set.x} ${set.y + extraUnits})`}>
                        <TvShell tv={set} />
                        <TvGlass tv={set} />
                        <TvPanel layout={layout} view={tv} handlers={handlers} locked={locked} />
                        <TvStrip tv={set} view={tv} measure={measure} />
                        <TvButtons layout={layout} view={tv} handlers={handlers} locked={locked} />
                    </g>
                </svg>
                <TvScreen tv={set} video={tv.video} failed={tv.failed} />
            </div>
            <p className="visually-hidden" aria-live="polite" data-part="tv-notice">
                {tv.failed ? t('mv.failedNotice', { title: tv.title }) : null}
            </p>
        </div>
    );
};
