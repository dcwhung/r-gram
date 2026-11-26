import type { CatalogTrack } from '@r-gram/catalog';
import { useMemo } from 'react';
import { t } from '../../i18n/t';
import type { InfoLayout } from '../../stage/layouts';
import { padTrackNumber } from '../../utils/formatTime';
import type { TextMeasure } from '../../utils/textMeasure';
import { Icon } from '../icons/Icon';
import { px } from '../svgNumber';
import { fitSongTitle, type SongFit } from './songFit';

interface SongLinesProps {
    info: InfoLayout;
    track: CatalogTrack;
    timeText: string;
    accent: string;
    measure: TextMeasure;
}

/** 歌名前面三條專輯色棒（設計稿 info()）：跟歌名第一行 */
const Bars = ({ info, accent, top }: Pick<SongLinesProps, 'info' | 'accent'> & { top: number }) => {
    const { bars } = info;
    return (
        <g data-part="song-bars" fill={accent}>
            {bars.levels.map((level, index) => {
                const height = bars.height * level;
                return (
                    <rect
                        // 位置就係身份：兩條一樣高都唔會撞 key（backlog B-056 ④）
                        key={index}
                        x={bars.x + index * bars.step}
                        y={px(top - bars.lift - height)}
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
const HeartPlaceholder = ({ info, at }: { info: InfoLayout; at: SongFit['heart'] }) => (
    <g
        data-part="song-heart"
        aria-hidden="true"
        className="info-heart"
        strokeWidth={info.heart.stroke}
        strokeLinejoin="round"
    >
        <Icon name="heart" cx={at.x} cy={at.y} size={info.heart.size} color="none" />
    </g>
);

/** 歌名（一行或者兩行；歌單開住時亦用，T-037） */
export const SongTitle = ({ x, fit, title }: { x: number; fit: SongFit; title: string }) => (
    <text
        data-part="song-title"
        className="info-song"
        fontSize={fit.size}
        // 兩行之間冇空格、「…」截走咗嘅字：讀屏讀成個歌名（B-072 ①）
        aria-label={title}
    >
        {fit.rows.map((row, index) => (
            <tspan key={index} x={x} y={px(row.y)}>
                {row.text}
            </tspan>
        ))}
    </text>
);

/** 歌名（縮字 → 兩行 → 「…」，FR-036、D51）、心形、「第 nn 首 · m:ss」 */
export const SongLines = ({ info, track, timeText, accent, measure }: SongLinesProps) => {
    const { song, track: line } = info;
    // 只喺歌名、版面或者量字函數（字體載入完）變先重新 fit：播放進度每秒更新都唔使重新量（backlog B-056 ①）
    const fit = useMemo(
        () => fitSongTitle(track.title, info, measure),
        [track.title, info, measure],
    );
    return (
        <>
            <Bars info={info} accent={accent} top={fit.top} />
            <SongTitle x={song.x} fit={fit} title={track.title} />
            <HeartPlaceholder info={info} at={fit.heart} />
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
