import { parseLrc, toLyricsJson } from './parseLrc';

describe('parseLrc', () => {
    it('should parse the four timestamp precisions into milliseconds', () => {
        const { lines, errors } = parseLrc('[00:12]a\n[00:12.3]b\n[00:12.34]c\n[01:02.345]d');
        expect(errors).toEqual([]);
        expect(lines).toEqual([
            { t: 12_000, text: 'a' },
            { t: 12_300, text: 'b' },
            { t: 12_340, text: 'c' },
            { t: 62_345, text: 'd' },
        ]);
    });

    it('should split a line with several timestamps and sort by time', () => {
        const { lines } = parseLrc('[00:30.00][00:10.00]副歌\n[00:20.00]主歌');
        expect(lines).toEqual([
            { t: 10_000, text: '副歌' },
            { t: 20_000, text: '主歌' },
            { t: 30_000, text: '副歌' },
        ]);
    });

    it('should keep the source order for lines sharing a timestamp', () => {
        const { lines } = parseLrc('[00:05.00]first\n[00:05.00]second');
        expect(lines.map((line) => line.text)).toEqual(['first', 'second']);
    });

    it('should keep an empty text as an interlude line', () => {
        expect(parseLrc('[00:16.80]').lines).toEqual([{ t: 16_800, text: '' }]);
    });

    it('should trim the text and accept CRLF line endings', () => {
        expect(parseLrc('[00:01.00]  一早地下鐵  \r\n[00:02.00]b\r\n').lines).toEqual([
            { t: 1_000, text: '一早地下鐵' },
            { t: 2_000, text: 'b' },
        ]);
    });

    it('should ignore metadata tags and blank lines', () => {
        const { lines, errors } = parseLrc(
            '[ti:歌名]\n[ar:RubberBand]\n\n[length:03:20]\n[00:01.00]a',
        );
        expect(errors).toEqual([]);
        expect(lines).toEqual([{ t: 1_000, text: 'a' }]);
    });

    it('should apply a positive offset by showing lines earlier', () => {
        expect(parseLrc('[offset:500]\n[00:02.00]a').lines).toEqual([{ t: 1_500, text: 'a' }]);
    });

    it('should apply a negative offset by showing lines later', () => {
        expect(parseLrc('[offset:-250]\n[00:02.00]a').lines).toEqual([{ t: 2_250, text: 'a' }]);
    });

    it('should not move a line before zero', () => {
        expect(parseLrc('[offset:5000]\n[00:02.00]a').lines).toEqual([{ t: 0, text: 'a' }]);
    });

    // S-005：offset 大過頭幾行嘅時間時，壓到 0 嘅行仍然要跟原本時間先後
    it('should keep time order among lines clamped to zero', () => {
        const { lines } = parseLrc('[offset:5000]\n[00:30.00][00:02.00]chorus\n[00:01.00]verse');
        expect(lines).toEqual([
            { t: 0, text: 'verse' },
            { t: 0, text: 'chorus' },
            { t: 25_000, text: 'chorus' },
        ]);
    });

    // S-006
    it('should accept spaces between the timestamps of one line', () => {
        expect(parseLrc('[00:01.00] [00:02.00]text').lines).toEqual([
            { t: 1_000, text: 'text' },
            { t: 2_000, text: 'text' },
        ]);
    });

    it('should reject a minute count longer than three digits', () => {
        expect(parseLrc('[99999999999999999999:00]a')).toEqual({
            lines: [],
            errors: [{ line: 1, code: 'INVALID_TIMESTAMP', text: '[99999999999999999999:00]a' }],
        });
    });

    it('should reject an offset too large to be a correction', () => {
        expect(parseLrc('[offset:99999999]\n[00:01.00]a').errors).toEqual([
            { line: 1, code: 'INVALID_OFFSET', text: '[offset:99999999]' },
        ]);
    });

    it('should report a line without a timestamp', () => {
        const { lines, errors } = parseLrc('[00:01.00]a\n冇時間嘅一行\n[00:03.00]c');
        expect(lines).toHaveLength(2);
        expect(errors).toEqual([{ line: 2, code: 'NO_TIMESTAMP', text: '冇時間嘅一行' }]);
    });

    it.each(['[00:60.00]a', '[1:2]a', '[00:12.3456]a', '[12]a'])(
        'should report the malformed timestamp in %j',
        (source) => {
            const { lines, errors } = parseLrc(source);
            expect(lines).toEqual([]);
            expect(errors).toEqual([{ line: 1, code: 'INVALID_TIMESTAMP', text: source }]);
        },
    );

    it('should report a malformed offset', () => {
        expect(parseLrc('[offset:abc]\n[00:01.00]a').errors).toEqual([
            { line: 1, code: 'INVALID_OFFSET', text: '[offset:abc]' },
        ]);
    });

    it.each(['', '  \n\n', '[ti:只有標題]'])(
        'should report EMPTY when %j has no lyric line',
        (source) => {
            expect(parseLrc(source)).toEqual({
                lines: [],
                errors: [{ line: 0, code: 'EMPTY', text: '' }],
            });
        },
    );

    // W-001：以 `[` 開頭但唔係時間戳、亦唔係獨立一行 metadata 嘅行，唔可以冇報錯就消失
    it.each([
        ['[aa:bb]a', '字母 tag 後面有歌詞'],
        ['[00:1O.00]第二句', '數字入面混咗字母 O'],
        ['[00:02,50]b', '用咗逗號'],
        ['[00:02.50 ]b', 'tag 入面有空格'],
        ['[00：02.50]b', '全形冒號'],
        ['[Chorus]副歌歌詞', '段落標記'],
        ['[]x', '空 tag'],
        ['[ar:RubberBand] 後面有字', 'metadata 後面有字'],
    ])('should report %j instead of dropping the line (%s)', (source) => {
        const { lines, errors } = parseLrc(`[00:01.00]a\n${source}\n[00:03.00]c`);
        expect(lines.map((line) => line.text)).toEqual(['a', 'c']);
        expect(errors).toEqual([{ line: 2, code: 'INVALID_TIMESTAMP', text: source }]);
    });

    it.each(['[by:me]', '[ti:歌名]', '[length:03:20]', '[re:編輯器 v1.0]', '[#:備註]'])(
        'should still ignore the stand-alone metadata line %j',
        (source) => {
            expect(parseLrc(`${source}\n[00:01.00]a`)).toEqual({
                lines: [{ t: 1_000, text: 'a' }],
                errors: [],
            });
        },
    );

    // S-014：metadata 嘅內容可以有方括號（例如歌名「發現號 [Live]」）
    it('should ignore a metadata line whose value contains brackets', () => {
        expect(parseLrc('[ti:發現號 [Live]]\n[00:01.00]a')).toEqual({
            lines: [{ t: 1_000, text: 'a' }],
            errors: [],
        });
    });

    // S-015：獨立一行、第一個字打錯做字母嘅時間戳（間奏行）唔可以當 metadata
    it.each(['[O0:16.80]', '[l2:30.00]'])(
        'should report the mistyped stand-alone timestamp %j',
        (source) => {
            expect(parseLrc(`[00:01.00]a\n${source}`).errors).toEqual([
                { line: 2, code: 'INVALID_TIMESTAMP', text: source },
            ]);
        },
    );

    it('should treat a two-letter tag as metadata, not as a broken timestamp', () => {
        // `[by:me]` 係合法 metadata；唔可以因為似 `aa:bb` 就報錯
        expect(parseLrc('[by:me]\n[00:01.00]a')).toEqual({
            lines: [{ t: 1_000, text: 'a' }],
            errors: [],
        });
    });

    it('should accept minutes above 59 for long tracks', () => {
        expect(parseLrc('[75:00.00]a').lines).toEqual([{ t: 4_500_000, text: 'a' }]);
    });
});

describe('toLyricsJson', () => {
    it('should wrap the lines in the published lyrics document', () => {
        const { lines } = parseLrc('[00:12.30]一早地下鐵\n[00:16.80]');
        expect(toLyricsJson(lines)).toEqual({
            lines: [
                { t: 12_300, text: '一早地下鐵' },
                { t: 16_800, text: '' },
            ],
        });
    });
});
