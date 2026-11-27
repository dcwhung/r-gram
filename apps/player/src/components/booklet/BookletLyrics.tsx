import type { BookletView } from '../../app/bookletView';
import { t } from '../../i18n/t';
import { hasWords } from '../../lyrics/lyricsJson';
import { type LyricsState, useLyrics } from '../../lyrics/useLyrics';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import type { TextMeasure } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import { PlainLyrics } from './PlainLyrics';
import { TimedLyrics } from './TimedLyrics';

/** 有字嘅歌詞；冇（攞緊、冇歌詞檔、攞唔到、全部空白）= null */
const wordsOf = (state: LyricsState) =>
    state.status === 'ready' && hasWords(state.lyrics) ? state.lyrics : null;

/** 框入面嘅提示：冇歌詞（冇檔或者全部空白）、攞唔到；攞緊、有歌詞 = 冇提示 */
const noticeOf = (state: LyricsState): string | null => {
    if (state.status === 'failed') return t('booklet.lyricsFailed');
    if (state.status === 'none') return t('booklet.noLyrics');
    return state.status === 'ready' && !hasWords(state.lyrics) ? t('booklet.noLyrics') : null;
};

interface BookletLyricsProps {
    layout: StageLayout;
    booklet: BookletView;
    measure: TextMeasure;
    playing: boolean;
}

/**
 * 歌書嘅歌詞（T-082；Functional Spec D22、D32、D38，Technical Spec「歌書歌詞版面」）：揀邊個版面跟歌詞檔嘅 `synced`：
 * 有時間標記 = 弧線（框入面跟歌行，TimedLyrics）；冇 = 直身一欄（PlainLyrics）。攞緊：框入面留空；
 * 冇歌詞、攞唔到：框入面一行提示（設計稿冇畫，同冇歌嘅歌單一樣做法，D39）。換歌 = 由頭排（以歌做 key）
 */
export const BookletLyrics = ({ layout, booklet, measure, playing }: BookletLyricsProps) => {
    const state = useLyrics(booklet.lyricsUrl);
    const { extraUnits } = useStageFitContext();
    const lyrics = wordsOf(state);
    if (lyrics && !lyrics.synced) {
        return (
            <PlainLyrics
                key={booklet.trackId}
                layout={layout}
                lines={lyrics.lines}
                measure={measure}
            />
        );
    }
    return (
        <g transform={`translate(0 ${px(extraUnits)})`}>
            <TimedLyrics
                key={booklet.trackId}
                layout={layout}
                lines={lyrics?.synced ? lyrics.lines : null}
                notice={noticeOf(state)}
                measure={measure}
                playing={playing}
            />
        </g>
    );
};
