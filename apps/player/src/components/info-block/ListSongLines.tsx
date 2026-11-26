import type { CatalogTrack } from '@r-gram/catalog';
import { useMemo } from 'react';
import type { InfoLayout } from '../../stage/layouts';
import { padTrackNumber } from '../../utils/formatTime';
import type { TextMeasure } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import { fitSongTitle } from './songFit';
import { SongTitle } from './SongLines';

interface ListSongLinesProps {
    info: InfoLayout;
    /** 框入面嗰首 */
    track: CatalogTrack;
    accent: string;
    measure: TextMeasure;
}

/**
 * 歌單開住時左上歌名嗰部分（設計稿第 18 版 infoParts() 嘅 st.list；T-037）：框入面嗰首嘅歌號（專輯色 slab）同歌名。
 * 冇三條棒、冇心形（所以歌名可用闊度多返心形嗰段）、冇時間。歌號跟 `track.no`（可以跳號，D60）
 */
export const ListSongLines = ({ info, track, accent, measure }: ListSongLinesProps) => {
    const fit = useMemo(
        () => fitSongTitle(track.title, info, measure, false),
        [track.title, info, measure],
    );
    const { listNumber } = info;
    return (
        <>
            <text
                data-part="list-number"
                className="info-list-number"
                x={listNumber.x}
                y={px(fit.top - listNumber.lift)}
                fontSize={listNumber.size}
                fill={accent}
            >
                {padTrackNumber(track.no)}
            </text>
            <SongTitle x={info.song.x} fit={fit} title={track.title} />
        </>
    );
};
