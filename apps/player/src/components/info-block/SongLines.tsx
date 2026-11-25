import type { CatalogTrack } from '@r-gram/catalog';
import { t } from '../../i18n/t';
import type { InfoLayout } from '../../stage/layouts';
import { fitText } from '../../utils/fitText';
import { padTrackNumber } from '../../utils/formatTime';
import type { TextMeasure } from '../../utils/textMeasure';
import { Icon } from '../icons/Icon';
import { px } from '../svgNumber';

const SONG_WEIGHT = 700;

interface SongLinesProps {
    info: InfoLayout;
    track: CatalogTrack;
    timeText: string;
    accent: string;
    measure: TextMeasure;
}

/** 歌名前面三條專輯色棒（設計稿 info()） */
const Bars = ({ info, accent }: Pick<SongLinesProps, 'info' | 'accent'>) => {
    const { bars, song } = info;
    return (
        <g data-part="song-bars" fill={accent}>
            {bars.levels.map((level, index) => {
                const height = bars.height * level;
                return (
                    <rect
                        key={level}
                        x={bars.x + index * bars.step}
                        y={px(song.y - bars.lift - height)}
                        width={bars.width}
                        height={px(height)}
                        rx={bars.corner}
                    />
                );
            })}
        </g>
    );
};

/**
 * 歌名後面嘅心形：而家係佔位（未收藏嘅空心樣、唔可以㩒）。收藏同心形掣係 T-070，到時改做掣。
 * 讀屏唔讀（未有功能）。
 */
const HeartPlaceholder = ({ info, x }: { info: InfoLayout; x: number }) => {
    const { heart, song } = info;
    return (
        <g
            data-part="song-heart"
            aria-hidden="true"
            className="info-heart"
            strokeWidth={heart.stroke}
            strokeLinejoin="round"
        >
            <Icon name="heart" cx={x} cy={song.y - heart.lift} size={heart.size} color="none" />
        </g>
    );
};

/** 歌名（放唔落就縮字，FR-036、D23）、心形、「第 nn 首 · m:ss」 */
export const SongLines = ({ info, track, timeText, accent, measure }: SongLinesProps) => {
    const { song, heart, track: line } = info;
    const fitted = fitText(track.title, {
        size: song.size,
        minSize: song.minSize,
        // 心形連佢右半邊都要喺上限之內
        maxWidth: song.maxRight - song.x - heart.gap - heart.size / 2,
        measure: (text, size) =>
            measure(text, { family: 'cjk', size, weight: SONG_WEIGHT, spacing: 0 }),
    });
    const titleWidth = measure(fitted.text, {
        family: 'cjk',
        size: fitted.size,
        weight: SONG_WEIGHT,
        spacing: 0,
    });
    return (
        <>
            <Bars info={info} accent={accent} />
            <text
                data-part="song-title"
                className="info-song"
                x={song.x}
                y={song.y}
                fontSize={fitted.size}
            >
                {fitted.text}
            </text>
            <HeartPlaceholder info={info} x={song.x + titleWidth + heart.gap} />
            <text
                data-part="track-line"
                className="info-track"
                x={line.x}
                y={line.y}
                fontSize={line.size}
                letterSpacing={line.spacing}
            >
                {t('track.position', { no: padTrackNumber(track.no), time: timeText })}
            </text>
        </>
    );
};
