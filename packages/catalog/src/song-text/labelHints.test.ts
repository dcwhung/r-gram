/* backlog B-038：歌名同標籤行之間有空行，標籤會變成歌詞（D31 規則）；呢個函數搵出呢啲行，畀 API / 管理端提示 */
import { labelLinesAfterGap } from './labelHints';
import { parseSongText } from './parseSongText';

describe('labelLinesAfterGap', () => {
    it('should find the label-looking lines that start the lyrics after a blank line', () => {
        const text = '歌名\n\n曲：阿正\n詞:林夕\n\n第一句';
        expect(labelLinesAfterGap(text)).toEqual([3, 4]);
        expect(parseSongText(text).credits).toBeNull();
    });

    it('should also find them when some labels came before the blank line', () => {
        expect(labelLinesAfterGap('歌名\n曲：阿正\n\n\n詞：林夕\n歌詞')).toEqual([5]);
    });

    it('should count lines the same way as the parser (CR, CRLF, BOM, leading blanks)', () => {
        expect(labelLinesAfterGap('﻿\r\n歌名\r\r\n監：甲')).toEqual([4]);
    });

    it('should find nothing for well-formed text, lyrics without labels, or no title', () => {
        for (const text of [
            '歌名\n曲：阿正\n\n第一句\n曲：不是標籤段',
            '歌名\n\n第一句\n詞：在歌詞中間',
            '歌名\n曲：阿正',
            '歌名\n\n',
            '',
            '\n\n',
        ]) {
            expect(labelLinesAfterGap(text), JSON.stringify(text)).toEqual([]);
        }
    });
});
