import { useRef } from 'react';
import type { BookletView } from '../../app/bookletView';
import { t } from '../../i18n/t';
import { bleedSpan } from '../../stage/fitStage';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import type { TextMeasure } from '../../utils/textMeasure';
import { useStable } from '../arc-list/useStable';
import { px } from '../svgNumber';
import './booklet.css';
import { BookletCredits } from './BookletCredits';
import { BookletLyrics } from './BookletLyrics';
import { BookletVeil } from './BookletParts';
import { useBookletFocus } from './useBookletFocus';

interface BookletProps {
    layout: StageLayout;
    booklet: BookletView;
    /** 專輯著燈色（曲詞編監嘅字） */
    glow: string;
    measure: TextMeasure;
    /** 收返緊（過場期間；完咗外面先轉場景狀態） */
    closing: boolean;
    /** 㩒暗位、Esc：收返 */
    onClose: () => void;
    /** 播緊：有時間標記嘅歌詞跟歌行；暫停 = 停喺而家嗰行 */
    playing: boolean;
}

/**
 * 歌書（設計稿第 18 版「歌書（㩒 i）」booklet()；Functional Spec CR-002「歌書」、決定 5、D111；T-072）：
 * 暗層（中間留唱片夾個窿，蓋埋安全區外嘅延伸）→ 曲詞編監（左上資訊下面一欄）→ 歌詞（T-082：白色框線 + 弧線，
 * 或者直身一欄，BookletLyrics）。三粒細掣同左上白字喺佢上面（BookletLayer、TopGroup）。
 * 打開：暗層淡入、框線由唱片夾伸出、曲詞編監逐行滑入；收返倒轉（`closing`）。減少動態效果：冇動畫（booklet.css）。
 * 喺貼頂組：曲詞編監跟左上資訊（貼頂）；暗層同框線用碟嘅座標（貼底，加返多出嚟嘅高度；FR-039）。
 */
export const Booklet = (props: BookletProps) => {
    const { layout, booklet, glow, measure, closing, onClose } = props;
    const fit = useStageFitContext();
    const veil = bleedSpan(fit, fit.extraUnits);
    const root = useRef<SVGGElement>(null);
    const close = useStable(onClose);
    useBookletFocus(root, close);
    return (
        <g
            ref={root}
            data-part="booklet"
            className={closing ? 'booklet booklet--out' : 'booklet booklet--in'}
            role="dialog"
            aria-label={t('booklet.label', { title: booklet.title })}
            tabIndex={-1}
        >
            <g transform={`translate(0 ${px(fit.extraUnits)})`}>
                <BookletVeil layout={layout} top={veil.y} height={veil.height} onClose={close} />
            </g>
            <BookletCredits
                layout={layout}
                credits={booklet.credits}
                glow={glow}
                measure={measure}
            />
            <BookletLyrics
                layout={layout}
                booklet={booklet}
                measure={measure}
                playing={props.playing}
            />
        </g>
    );
};
