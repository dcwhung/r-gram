import { formatSongText } from './formatSongText';
import { parseSongText, songOf } from './parseSongText';
import type { SongText } from './types';

const CREDITS = {
    composer: '阿正',
    lyricist: 'Tim Lui / 6號',
    arranger: '阿正',
    producer: 'RubberBand / 雷頌德',
};

/** `parseSongText()` 嘅結果減去 `errors`、`hints`：同 `formatSongText()` 嘅輸入同一個形狀 */
const fieldsOf = (text: string): SongText => {
    const result = parseSongText(text);
    expect(result.errors).toEqual([]);
    return songOf(result);
};

describe('formatSongText', () => {
    it('should write the fields in the fixed order with full-width colons', () => {
        const text = formatSongText({
            title: '一早地下鐵',
            credits: CREDITS,
            lyrics: { source: '[00:12.30]第一句歌詞\n[00:18.75]第二句歌詞' },
        });
        expect(text).toBe(
            [
                '一早地下鐵',
                '曲：阿正',
                '詞：Tim Lui / 6號',
                '編：阿正',
                '監：RubberBand / 雷頌德',
                '',
                '[00:12.30]第一句歌詞',
                '[00:18.75]第二句歌詞',
            ].join('\n'),
        );
    });

    it('should leave out the fields without a value', () => {
        const credits = { composer: null, lyricist: '6號', arranger: '', producer: null };
        expect(formatSongText({ title: '歌名', credits, lyrics: null })).toBe('歌名\n詞：6號');
    });

    it('should put one blank line between the title and the lyrics when there are no labels', () => {
        const song = { title: 'Song', credits: null, lyrics: { source: 'La' } };
        expect(formatSongText(song)).toBe('Song\n\nLa');
    });

    it('should write a title alone when there is nothing else', () => {
        expect(formatSongText({ title: '歌名', credits: null, lyrics: null })).toBe('歌名');
    });

    // CR-007（Functional Spec D72）：副題唔再用，舊檔嘅「副題：」行回填時拎走
    it('should drop the subtitle line of an old file', () => {
        expect(formatSongText(parseSongText('歌名\n副題：Live\n曲：阿正'))).toBe('歌名\n曲：阿正');
    });

    it('should normalise any accepted input into the canonical text', () => {
        const messy = '\r\n歌名  \r\n監: 雷頌德\r\n曲 ：阿正\r\n\r\n\r\n[00:01.00]a  \r\n\r\n';
        expect(formatSongText(parseSongText(messy))).toBe(
            '歌名\n曲：阿正\n監：雷頌德\n\n[00:01.00]a',
        );
    });

    // 擁有人嘅格式（歌名、空行、曲詞編監、空行、歌詞）回填成標準格式：歌名之後直接接標籤
    it('should write the labels right after the title for a text with blank lines around them', () => {
        const text = '歌名甲\n\n曲：作曲者甲\n詞：填詞者乙\n\n第一句';
        expect(formatSongText(parseSongText(text))).toBe(
            '歌名甲\n曲：作曲者甲\n詞：填詞者乙\n\n第一句',
        );
    });

    // review S-284：接受咗嘅例外：歌詞第一行似標籤（parser 唔會讀出咁嘅歌詞，只會喺舊資料出現）→ 再讀入變 credit
    it('should turn a first lyric line that looks like a label into a credit when read again', () => {
        const song = {
            title: '歌名甲',
            credits: null,
            lyrics: { source: '曲：作曲者甲\n\n第一句' },
        };
        const text = formatSongText(song);
        expect(text).toBe('歌名甲\n\n曲：作曲者甲\n\n第一句');
        expect(songOf(parseSongText(text))).toEqual({
            title: '歌名甲',
            credits: { composer: '作曲者甲', lyricist: null, arranger: null, producer: null },
            lyrics: { source: '第一句', synced: false, lines: [{ text: '第一句' }] },
        });
    });

    describe('round trip', () => {
        const samples: Record<string, string> = {
            'timed lyrics': '一早地下鐵\n曲：阿正\n詞：Tim Lui / 6號\n\n[00:12.30]a\n\n[00:16.80]',
            'plain lyrics': 'Hello\n副題：Bonus Track\n\nverse one\n\n\nverse two\n  indented',
            'labels after a blank line': '歌名甲\n\n曲：作曲者甲\n\n詞：填詞者乙\n\n第一句',
            'lyrics that look like labels': '歌名\n\n第一句\n曲：這是歌詞\n[Chorus]',
            'title with a colon': 'Re: SimpleLoveSong\n副題：國語\n編：A: B',
            'title only': '夏日之神話',
        };

        it.each(Object.entries(samples))('should keep %s unchanged', (_name, text) => {
            const song = fieldsOf(text);
            expect(parseSongText(formatSongText(song))).toEqual({ ...song, errors: [], hints: [] });
        });

        it.each(Object.entries(samples))('should give a stable text for %s', (_name, text) => {
            const once = formatSongText(parseSongText(text));
            expect(formatSongText(parseSongText(once))).toBe(once);
        });
    });
});
