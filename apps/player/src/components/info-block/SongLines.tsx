import type { CatalogTrack } from '@r-gram/catalog';
import { useMemo } from 'react';
import { t } from '../../i18n/t';
import type { InfoLayout } from '../../stage/layouts';
import { padTrackNumber } from '../../utils/formatTime';
import type { TextMeasure } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import { FavouriteHeart } from './FavouriteHeart';
import { fitSongTitle, type SongFit } from './songFit';
import { SongOrigin } from './SongOrigin';

interface SongLinesProps {
    info: InfoLayout;
    track: CatalogTrack;
    timeText: string;
    accent: string;
    glow: string;
    measure: TextMeasure;
    hitSize: number;
    songHidden?: boolean;
    favourite?: boolean;
    onFavourite?: () => void;
    origin?: string | null;
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

/**
 * 歌名（縮字 → 兩行 → 「…」，FR-036、D51）、心形掣（US-010）、「第 nn 首 · m:ss」；
 * Favourites 碟加一行原本嗰隻碟（D19）
 */
export const SongLines = (props: SongLinesProps) => {
    const { info, track, timeText, accent, measure, origin = null } = props;
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
            <FavouriteHeart
                info={info}
                at={fit.heart}
                hitSize={props.hitSize}
                favourite={props.favourite ?? false}
                glow={props.glow}
                hidden={props.songHidden ?? false}
                onPress={props.onFavourite}
            />
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
            {origin && <SongOrigin info={info} text={origin} y={line.y + info.origin.belowTrack} />}
        </>
    );
};
