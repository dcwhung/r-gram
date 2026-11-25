import { parseSongText } from '../song-text/parseSongText';
import type { SongTextFields } from '../song-text/types';
import { songTextChange } from './songTextChange';

const parsed = (text: string) => parseSongText(text);

const stored = (fields: Partial<SongTextFields> = {}): SongTextFields => ({
    title: '一早地下鐵',
    subtitle: null,
    credits: null,
    lyrics: null,
    ...fields,
});

const WITH_LYRICS = '一早地下鐵\n曲：阿正\n\n第一句\n第二句';

describe('songTextChange', () => {
    it('should call a file that only adds content to a bare track new', () => {
        expect(songTextChange(parsed(WITH_LYRICS), stored(), false)).toEqual({
            change: 'new',
            titleChanged: false,
            removesLyrics: false,
        });
    });

    it('should call it replace once a file was applied before', () => {
        expect(songTextChange(parsed(WITH_LYRICS), stored(), true).change).toBe('replace');
    });

    it('should call identical content same', () => {
        const song = parsed(WITH_LYRICS);
        expect(songTextChange(song, song, true).change).toBe('same');
    });

    it('should flag a new title as a replacement', () => {
        expect(songTextChange(parsed('Hero\n\n一句'), stored(), false)).toEqual({
            change: 'replace',
            titleChanged: true,
            removesLyrics: false,
        });
    });

    it('should flag a file that would clear the stored lyrics', () => {
        const current = stored({ lyrics: { source: '舊歌詞' } });
        expect(songTextChange(parsed('一早地下鐵\n曲：阿正'), current, false)).toEqual({
            change: 'replace',
            titleChanged: false,
            removesLyrics: true,
        });
    });

    it('should treat stored credits as content that a file would change', () => {
        const current = stored({
            credits: { composer: '阿正', lyricist: null, arranger: null, producer: null },
        });
        expect(songTextChange(parsed(WITH_LYRICS), current, false).change).toBe('replace');
    });
});
