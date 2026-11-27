import { useEffect, useRef } from 'react';
import { Booklet } from '../components/booklet/Booklet';
import { ChromeFade } from '../components/chrome-fade/ChromeFade';
import { SmallButtons } from '../components/small-buttons/SmallButtons';
import { px } from '../components/svgNumber';
import type { StageLayout } from '../stage/layouts';
import { useStageFitContext } from '../stage/StageContext';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { TopInfo } from './TopInfo';
import type { HomeHandlers } from './Turntable';
import type { BookletClosing } from './useBookletClosing';

/** i 掣（三粒細掣入面 icon = info 嗰粒） */
const INFO_BUTTON = '[data-icon="info"]';

/**
 * 歌書收埋之後 focus 交返 i 掣（同電視收埋交返 MV 掣一樣，useTvFocusReturn）；開 MV 取代歌書就唔郁（focus 喺電視）。
 * 回傳三粒細掣嗰層嘅 ref（喺佢入面搵掣）
 */
const useInfoFocusReturn = (open: boolean, mvOpen: boolean) => {
    const buttons = useRef<SVGGElement>(null);
    const wasOpen = useRef(open);
    useEffect(() => {
        const closed = wasOpen.current && !open;
        wasOpen.current = open;
        if (closed && !mvOpen) {
            buttons.current?.querySelector<SVGElement>(INFO_BUTTON)?.focus({ preventScroll: true });
        }
    }, [open, mvOpen]);
    return buttons;
};

interface BookletLayerProps {
    layout: StageLayout;
    view: HomeView;
    measure: TextMeasure;
    handlers: Pick<HomeHandlers, 'onMv' | 'onMode'>;
    booklet: BookletClosing;
}

/**
 * 唱片機中間嗰層（設計稿第 18 版 scene() 嘅次序）：歌書開住時，暗層下面墊一份黑字左上資訊（白字喺 TopGroup
 * 最頂淡入）→ 歌書（暗層、框線、曲詞編監）→ 三粒細掣（永遠喺歌書上面：i 著燈、㩒返就收起；MV、播放模式照用）。
 * 細掣跟唱片機貼底，所以喺貼頂組入面加返多出嚟嘅高度；弧線歌單（之後）蓋住佢哋（S-074）。
 */
export const BookletLayer = ({ layout, view, measure, handlers, booklet }: BookletLayerProps) => {
    const { extraUnits } = useStageFitContext();
    const buttons = useInfoFocusReturn(view.bookletOpen, view.mvOpen);
    return (
        <>
            {view.booklet && (
                <g data-part="booklet-info-ghost" aria-hidden="true">
                    <TopInfo layout={layout} view={view} measure={measure} listOpen={false} />
                </g>
            )}
            {view.booklet && (
                <Booklet
                    layout={layout}
                    booklet={view.booklet}
                    glow={view.glow}
                    measure={measure}
                    closing={booklet.closing}
                    onClose={booklet.close}
                />
            )}
            <g ref={buttons} transform={`translate(0 ${px(extraUnits)})`}>
                <ChromeFade part="chrome-buttons" hidden={view.buttonsHidden}>
                    <SmallButtons
                        layout={layout}
                        glow={view.glow}
                        hasSong={view.hasSong}
                        hasMv={view.hasMv}
                        bookletOpen={view.bookletOpen}
                        mvOpen={view.mvOpen}
                        playing={view.playing}
                        mode={view.mode}
                        covered={view.listOpen || view.buttonsHidden}
                        onBooklet={booklet.press}
                        onMv={handlers.onMv}
                        onMode={handlers.onMode}
                    />
                </ChromeFade>
            </g>
        </>
    );
};
