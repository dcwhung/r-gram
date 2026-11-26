import type { InfoBlockProps } from './InfoBlock';
import { ListSongLines } from './ListSongLines';
import { SongLines } from './SongLines';

export type SongPartProps = Omit<InfoBlockProps, 'album' | 'held' | 'sub'>;

/** 歌名嗰部分：歌單開住 = 框入面嗰首（T-037）；否則播緊（或者暫停緊）嗰首 */
export const SongPart = ({ listOpen, listTrack, track, ...rest }: SongPartProps) => {
    if (listOpen) {
        const { info, accent, measure, origin } = rest;
        return listTrack ? (
            <ListSongLines
                info={info}
                track={listTrack}
                accent={accent}
                measure={measure}
                origin={origin}
            />
        ) : null;
    }
    return track ? <SongLines track={track} {...rest} /> : null;
};
