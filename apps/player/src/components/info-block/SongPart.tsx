import type { InfoBlockProps } from './InfoBlock';
import { ListSongLines } from './ListSongLines';
import { SongLines } from './SongLines';

type SongPartProps = Pick<
    InfoBlockProps,
    'info' | 'track' | 'timeText' | 'accent' | 'measure' | 'listOpen' | 'listTrack'
>;

/** 歌名嗰部分：歌單開住 = 框入面嗰首（T-037）；否則播緊（或者暫停緊）嗰首 */
export const SongPart = ({ listOpen, listTrack, track, ...rest }: SongPartProps) => {
    if (listOpen) {
        return listTrack ? <ListSongLines track={listTrack} {...rest} /> : null;
    }
    return track ? <SongLines track={track} {...rest} /> : null;
};
