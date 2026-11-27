import {
    CREDIT_MAX_CHARS,
    LYRIC_LINE_MAX_CHARS,
    SONG_TEXT_MAX_BYTES,
    SONG_TEXT_MAX_LINES,
    TITLE_MAX_CHARS,
} from './limits';
import { parseSongText } from './parseSongText';

const NO_CREDITS = { composer: null, lyricist: null, arranger: null, producer: null };
const codes = (text: string) =>
    parseSongText(text).errors.map(({ line, code }) => ({ line, code }));

describe('parseSongText', () => {
    it('should split a full Chinese song with timed lyrics into fields', () => {
        const text = [
            '一早地下鐵',
            '副題：Live',
            '曲：阿正',
            '詞：Tim Lui / 6號',
            '編：阿正',
            '監：RubberBand / 雷頌德',
            '',
            '[00:12.30]第一句歌詞',
            '[00:18.75]第二句歌詞',
        ].join('\n');
        expect(parseSongText(text)).toEqual({
            title: '一早地下鐵',
            credits: {
                composer: '阿正',
                lyricist: 'Tim Lui / 6號',
                arranger: '阿正',
                producer: 'RubberBand / 雷頌德',
            },
            lyrics: {
                source: '[00:12.30]第一句歌詞\n[00:18.75]第二句歌詞',
                synced: true,
                lines: [
                    { t: 12_300, text: '第一句歌詞' },
                    { t: 18_750, text: '第二句歌詞' },
                ],
            },
            errors: [],
            hints: [{ line: 2, code: 'SUBTITLE_IGNORED' }],
        });
    });

    it('should read an English song with half-width colons and plain lyrics', () => {
        const text =
            'Hello World\n曲: Ronny Lay\n詞:Lam Jik\n\nWe were young\nAnd the night was long';
        const result = parseSongText(text);
        expect(result.title).toBe('Hello World');
        expect(result.credits).toEqual({
            ...NO_CREDITS,
            composer: 'Ronny Lay',
            lyricist: 'Lam Jik',
        });
        expect(result.lyrics).toEqual({
            source: 'We were young\nAnd the night was long',
            synced: false,
            lines: [{ text: 'We were young' }, { text: 'And the night was long' }],
        });
        expect(result.errors).toEqual([]);
    });

    it('should accept the labels in any order and spaces around the colon', () => {
        const text = '睇真啲\n監 ：雷頌德\n副題: RubberBand + 吳雨霏\n編： 阿正\n曲 : 6號';
        expect(parseSongText(text)).toMatchObject({
            credits: { composer: '6號', lyricist: null, arranger: '阿正', producer: '雷頌德' },
            lyrics: null,
            errors: [],
            hints: [{ line: 3, code: 'SUBTITLE_IGNORED' }],
        });
    });

    it('should give null credits and no lyrics for a title on its own', () => {
        expect(parseSongText('Apollo 18')).toEqual({
            title: 'Apollo 18',
            credits: null,
            lyrics: null,
            errors: [],
            hints: [],
        });
    });

    it('should treat an empty label value as no value', () => {
        expect(parseSongText('歌名\n曲：\n詞：  \n副題：')).toMatchObject({
            credits: null,
            errors: [],
        });
    });

    it('should skip blank lines before the title and count lines from the top', () => {
        const result = parseSongText('\n  \n歌名\n曲：阿正\n曲：阿正');
        expect(result.title).toBe('歌名');
        expect(codes('\n  \n歌名\n曲：阿正\n曲：阿正')).toEqual([
            { line: 5, code: 'DUPLICATE_LABEL' },
        ]);
    });

    describe('title', () => {
        it('should require a title in an empty text', () => {
            expect(codes('')).toEqual([{ line: 1, code: 'TITLE_REQUIRED' }]);
            expect(codes(' \n\t\n')).toEqual([{ line: 1, code: 'TITLE_REQUIRED' }]);
        });

        // S-158：同 info.txt 一樣，歌名去走睇唔到嘅字元
        it('should drop control, zero-width and bidi-control characters from the title', () => {
            expect(parseSongText('一早\u200b地下\u202e鐵\u0008\n曲：阿正').title).toBe(
                '一早地下鐵',
            );
        });

        it('should require a title when the first line is only hidden characters', () => {
            const result = parseSongText('\u200b\u2066\n曲：阿正');
            expect(result.title).toBe('');
            expect(codes('\u200b\u2066\n曲：阿正')).toEqual([{ line: 1, code: 'TITLE_REQUIRED' }]);
            expect(result.credits).toEqual({ ...NO_CREDITS, composer: '阿正' });
        });

        it('should not take a timed line as the title, but still read it as lyrics', () => {
            const result = parseSongText('[00:01.00]第一句\n[00:02.00]第二句');
            expect(result.errors).toEqual([
                { line: 1, code: 'TITLE_REQUIRED', text: '[00:01.00]第一句' },
            ]);
            expect(result.title).toBe('');
            expect(result.lyrics?.synced).toBe(true);
            expect(result.lyrics?.lines).toHaveLength(2);
        });

        it('should not take a label line as the title, but still read the labels', () => {
            const result = parseSongText('曲：阿正\n詞：6號');
            expect(result.errors.map((e) => e.code)).toEqual(['TITLE_REQUIRED']);
            expect(result.credits).toEqual({ ...NO_CREDITS, composer: '阿正', lyricist: '6號' });
        });

        // W-012：`[1999]` 冇冒號，唔係時間標記，可以做歌名
        it('should keep a title that starts with digits in brackets', () => {
            const result = parseSongText('[1999] 歌\n曲：阿正');
            expect(result.errors).toEqual([]);
            expect(result.title).toBe('[1999] 歌');
        });

        // W-012：純文字歌詞用 `[1]` 做段落編號，唔可以令成段變成「有時間標記」
        it('should keep lyrics plain when a line starts with a verse number in brackets', () => {
            const result = parseSongText('歌名\n\n[1] 第一段\n第二句\n[2] 第二段');
            expect(result.errors).toEqual([]);
            expect(result.lyrics?.synced).toBe(false);
            expect(result.lyrics?.lines).toHaveLength(3);
        });

        it('should keep a title that contains a colon', () => {
            expect(parseSongText('Re: SimpleLoveSong\n副題：國語').title).toBe(
                'Re: SimpleLoveSong',
            );
            expect(parseSongText('Song 2: Reprise').title).toBe('Song 2: Reprise');
            expect(parseSongText('作曲：未知').title).toBe('作曲：未知');
        });

        it('should trim the title, including a byte order mark', () => {
            expect(parseSongText('﻿  歌名  \t').title).toBe('歌名');
        });
    });

    describe('labels', () => {
        it('should report a repeated label on the repeated line and keep the first value', () => {
            const result = parseSongText('歌名\n曲：阿正\n詞：Tim Lui\n詞：6號');
            expect(result.errors).toEqual([{ line: 4, code: 'DUPLICATE_LABEL', text: '詞：6號' }]);
            expect(result.credits?.lyricist).toBe('Tim Lui');
        });

        it('should count a repeated label even when one of them is empty', () => {
            expect(codes('歌名\n曲：\n曲：阿正')).toEqual([{ line: 3, code: 'DUPLICATE_LABEL' }]);
        });

        // CR-007（Functional Spec D72）：舊檔嘅「副題：」行照認做標籤（唔會變歌詞），但係唔用，逐行出提示、唔擋
        it('should skip every subtitle line with a hint and no error', () => {
            const text = `歌名\n副題：Live\n曲：阿正\n副題：${'副'.repeat(TITLE_MAX_CHARS + 1)}\n\n歌詞`;
            const result = parseSongText(text);
            expect(result.errors).toEqual([]);
            expect(result.hints).toEqual([
                { line: 2, code: 'SUBTITLE_IGNORED' },
                { line: 4, code: 'SUBTITLE_IGNORED' },
            ]);
            expect(result.credits).toEqual({ ...NO_CREDITS, composer: '阿正' });
            expect(result.lyrics?.source).toBe('歌詞');
            expect(result).not.toHaveProperty('subtitle');
        });

        it('should still need a title when the first line is a subtitle line', () => {
            expect(codes('副題：Live\n歌詞')).toEqual([{ line: 1, code: 'TITLE_REQUIRED' }]);
        });

        // 決定：唔認得嘅「標籤」（作曲：、主唱：）唔係標籤行，照 D31 結束標籤段、當歌詞第一行
        it('should end the label block at an unknown label and keep it as a lyric line', () => {
            const result = parseSongText('歌名\n曲：阿正\n主唱：RubberBand\n第一句');
            expect(result.credits).toEqual({ ...NO_CREDITS, composer: '阿正' });
            expect(result.lyrics).toMatchObject({
                source: '主唱：RubberBand\n第一句',
                synced: false,
            });
            expect(result.errors).toEqual([]);
        });

        it('should flag an unknown label among timed lyrics as a line without a time mark', () => {
            expect(codes('歌名\n作曲：阿正\n[00:01.00]第一句')).toEqual([
                { line: 2, code: 'MIXED_TIMESTAMPS' },
            ]);
        });

        it('should still end the label block at the first line that is not a label', () => {
            const result = parseSongText('歌名\n\n第一句\n曲：作曲者甲');
            expect(result.credits).toBeNull();
            expect(result.lyrics).toMatchObject({ source: '第一句\n曲：作曲者甲', synced: false });
        });

        it('should not take a longer word that starts with a label as a label', () => {
            const result = parseSongText('歌名\n曲目：一\n詞曲：二');
            expect(result.credits).toBeNull();
            expect(result.lyrics?.source).toBe('曲目：一\n詞曲：二');
        });

        it('should keep colons inside a value', () => {
            expect(parseSongText('歌名\n監：A: B：C').credits?.producer).toBe('A: B：C');
        });
    });

    // 擁有人決定（2026-11-27）：曲詞編監認 prefix：歌名之後、標籤段入面嘅空行都跳過，唔再令標籤變歌詞
    describe('labels after blank lines', () => {
        /** 擁有人嘅檔案格式：歌名、空行、曲詞編監、空行、歌詞（佔位文字，唔係真資料） */
        const OWNER_LAYOUT = [
            '歌名甲',
            '',
            '曲：作曲者甲',
            '詞：填詞者乙',
            '編：編曲者丙',
            '監：監製丁',
            '',
            '[00:01.00]第一句',
            '[00:02.00]第二句',
        ].join('\n');
        const OWNER_CREDITS = {
            composer: '作曲者甲',
            lyricist: '填詞者乙',
            arranger: '編曲者丙',
            producer: '監製丁',
        };

        it('should read the labels after a blank line below the title', () => {
            expect(parseSongText(OWNER_LAYOUT)).toEqual({
                title: '歌名甲',
                credits: OWNER_CREDITS,
                lyrics: {
                    source: '[00:01.00]第一句\n[00:02.00]第二句',
                    synced: true,
                    lines: [
                        { t: 1_000, text: '第一句' },
                        { t: 2_000, text: '第二句' },
                    ],
                },
                errors: [],
                hints: [],
            });
        });

        it('should skip several blank lines, also lines of spaces, before and inside the block', () => {
            const text = '歌名甲\n\n \u3000\n曲：作曲者甲\n\n\n詞: 填詞者乙\n\t\n第一句\n第二句';
            const result = parseSongText(text);
            expect(result.credits).toEqual({
                ...NO_CREDITS,
                composer: '作曲者甲',
                lyricist: '填詞者乙',
            });
            expect(result.lyrics).toMatchObject({ source: '第一句\n第二句', synced: false });
            expect(result.errors).toEqual([]);
        });

        it('should give the same result for CRLF and a byte order mark', () => {
            const crlf = `\uFEFF${OWNER_LAYOUT.replaceAll('\n', '\r\n')}`;
            expect(parseSongText(crlf)).toEqual(parseSongText(OWNER_LAYOUT));
        });

        it('should keep label-looking lines inside the lyrics as lyrics', () => {
            const text = '歌名甲\n\n曲：作曲者甲\n\n第一句\n\n詞：在歌詞中間\n第二句';
            const result = parseSongText(text);
            expect(result.credits).toEqual({ ...NO_CREDITS, composer: '作曲者甲' });
            expect(result.lyrics?.source).toBe('第一句\n\n詞：在歌詞中間\n第二句');
        });

        it('should report the lyric errors with their line in the whole text', () => {
            const text = `${OWNER_LAYOUT}\n沒有時間`;
            expect(codes(text)).toEqual([{ line: 10, code: 'MIXED_TIMESTAMPS' }]);
        });

        it('should report a label repeated after a blank line and keep the first value', () => {
            const result = parseSongText('歌名甲\n曲：作曲者甲\n\n曲：作曲者乙\n\n第一句');
            expect(result.errors).toEqual([
                { line: 4, code: 'DUPLICATE_LABEL', text: '曲：作曲者乙' },
            ]);
            expect(result.credits?.composer).toBe('作曲者甲');
        });

        it('should skip a subtitle line after a blank line with its hint', () => {
            const result = parseSongText('歌名甲\n\n副題：Live\n\n監：監製丁\n\n第一句');
            expect(result.hints).toEqual([{ line: 3, code: 'SUBTITLE_IGNORED' }]);
            expect(result.credits).toEqual({ ...NO_CREDITS, producer: '監製丁' });
            expect(result.lyrics?.source).toBe('第一句');
        });

        it('should check the length of a label after a blank line', () => {
            expect(codes(`歌名甲\n\n編：${'編'.repeat(CREDIT_MAX_CHARS + 1)}`)).toEqual([
                { line: 3, code: 'CREDIT_TOO_LONG' },
            ]);
        });

        // review S-285：由網頁複製嘅文字，「空行」可能夾住睇唔到嘅字元（同 S-158 歌名一樣嘅範圍）
        it('should take a line of only hidden characters in the label block as blank', () => {
            const text = '歌名甲\n​\n曲：作曲者甲\n⁠‍\n詞：填詞者乙\n﻿\n第一句';
            const result = parseSongText(text);
            expect(result.credits).toEqual({
                ...NO_CREDITS,
                composer: '作曲者甲',
                lyricist: '填詞者乙',
            });
            expect(result.lyrics?.source).toBe('第一句');
            expect(result.errors).toEqual([]);
        });

        it('should read a label line that starts with hidden characters', () => {
            const result = parseSongText('歌名甲\n\n​‪曲：作曲者甲\n\n第一句');
            expect(result.credits).toEqual({ ...NO_CREDITS, composer: '作曲者甲' });
            expect(result.lyrics?.source).toBe('第一句');
        });

        // review S-287：擁有人嘅檔可能有縮排（全形空格、半形空格、tab）；錯誤嘅原文係 trim 之後嘅
        it('should read indented label lines and report them trimmed', () => {
            const text = '歌名甲\n\n　曲：作曲者甲\n  詞：填詞者乙\n\t曲：作曲者乙\n\n第一句';
            const result = parseSongText(text);
            expect(result.credits).toEqual({
                ...NO_CREDITS,
                composer: '作曲者甲',
                lyricist: '填詞者乙',
            });
            expect(result.errors).toEqual([
                { line: 5, code: 'DUPLICATE_LABEL', text: '曲：作曲者乙' },
            ]);
            expect(result.lyrics?.source).toBe('第一句');
        });

        it('should keep a line of hidden characters inside the lyrics as it is', () => {
            const result = parseSongText('歌名甲\n曲：作曲者甲\n\n第一句\n​\n第二句');
            expect(result.lyrics?.source).toBe('第一句\n​\n第二句');
        });

        it('should give no lyrics when only labels and blank lines follow the title', () => {
            const result = parseSongText('歌名甲\n\n曲：作曲者甲\n\n詞：填詞者乙\n\n');
            expect(result.lyrics).toBeNull();
            expect(result.credits).toEqual({
                ...NO_CREDITS,
                composer: '作曲者甲',
                lyricist: '填詞者乙',
            });
        });

        it('should still require a title when the text starts with a label line', () => {
            const result = parseSongText('曲：作曲者甲\n\n詞：填詞者乙\n\n第一句');
            expect(result.errors.map(({ code }) => code)).toEqual(['TITLE_REQUIRED']);
            expect(result.title).toBe('');
        });
    });

    describe('lyrics', () => {
        it('should start the lyrics at a non-label line without a blank line', () => {
            const result = parseSongText('歌名\n曲：阿正\n[00:01.00]第一句');
            expect(result.lyrics).toEqual({
                source: '[00:01.00]第一句',
                synced: true,
                lines: [{ t: 1_000, text: '第一句' }],
            });
        });

        it('should trim blank lines around plain lyrics and keep one break between verses', () => {
            const text = '歌名\n\n\n第一段\n第二句\n\n\n\n第二段  \n\n';
            expect(parseSongText(text).lyrics).toEqual({
                source: '第一段\n第二句\n\n\n\n第二段',
                synced: false,
                lines: [{ text: '第一段' }, { text: '第二句' }, { text: '' }, { text: '第二段' }],
            });
        });

        it('should ignore blank lines inside timed lyrics', () => {
            const result = parseSongText('歌名\n\n[00:01.00]a\n\n[00:02.00]b');
            expect(result.lyrics?.lines).toEqual([
                { t: 1_000, text: 'a' },
                { t: 2_000, text: 'b' },
            ]);
            expect(result.lyrics?.source).toBe('[00:01.00]a\n\n[00:02.00]b');
        });

        it('should give the same result for CRLF input', () => {
            const lf = '歌名\n曲：阿正\n\n[00:01.00]a\n[00:02.00]b';
            expect(parseSongText(lf.replaceAll('\n', '\r\n'))).toEqual(parseSongText(lf));
        });

        // backlog B-042 ①：舊 Mac 格式淨係用 CR 換行，直接叫 API 先會遇到
        it('should split lines on a lone CR and on mixed line breaks', () => {
            const lf = '歌名\n曲：阿正\n\n[00:01.00]a\n[00:02.00]b';
            expect(parseSongText(lf.replaceAll('\n', '\r'))).toEqual(parseSongText(lf));
            expect(parseSongText('歌名\r曲：阿正\r\n\n[00:01.00]a\r[00:02.00]b')).toEqual(
                parseSongText(lf),
            );
        });

        it('should drop trailing whitespace from every line', () => {
            const result = parseSongText('歌名 \t\n曲：阿正  \n\n第一句  \n  第二句\t');
            expect(result.credits?.composer).toBe('阿正');
            expect(result.lyrics?.source).toBe('第一句\n  第二句');
            expect(result.lyrics?.lines).toEqual([{ text: '第一句' }, { text: '第二句' }]);
        });

        it('should keep bracketed section names in plain lyrics', () => {
            const result = parseSongText('Song\n\n[Chorus]\nLa la la');
            expect(result.errors).toEqual([]);
            expect(result.lyrics?.lines).toEqual([{ text: '[Chorus]' }, { text: 'La la la' }]);
        });

        it('should apply the LRC rules to timed lyrics: metadata, offset, several marks', () => {
            const text = '歌名\n\n[ti:歌名]\n[offset:500]\n[00:30.00][00:10.00]副歌';
            expect(parseSongText(text).lyrics?.lines).toEqual([
                { t: 9_500, text: '副歌' },
                { t: 29_500, text: '副歌' },
            ]);
        });

        it('should report every untimed line among timed ones with its line in the whole text', () => {
            const text = '歌名\n曲：阿正\n\n[00:01.00]a\n沒有時間\n[00:02.00]b\n也沒有';
            const result = parseSongText(text);
            expect(result.errors).toEqual([
                { line: 5, code: 'MIXED_TIMESTAMPS', text: '沒有時間' },
                { line: 7, code: 'MIXED_TIMESTAMPS', text: '也沒有' },
            ]);
        });

        it('should report a malformed time mark among timed lines', () => {
            expect(codes('歌名\n\n[00:01.00]a\n[00:1O.00]b\n第三句')).toEqual([
                { line: 4, code: 'BAD_TIMESTAMP' },
                { line: 5, code: 'MIXED_TIMESTAMPS' },
            ]);
            expect(codes('歌名\n\n[00:01.00]a\n[00:60.00]b')).toEqual([
                { line: 4, code: 'BAD_TIMESTAMP' },
            ]);
        });

        it('should take a timestamp-like mark that is out of range as a timed line', () => {
            expect(codes('歌名\n\n[00:60.00]a\n第二句')).toEqual([
                { line: 3, code: 'BAD_TIMESTAMP' },
                { line: 4, code: 'MIXED_TIMESTAMPS' },
            ]);
        });

        // 決定：`[00:1O.00]`（字母 O）同 `[Chorus]` 一樣唔似時間標記；冇其他時間標記時成段當純文字
        it('should keep a tag with letters as plain text when no line is timed', () => {
            const result = parseSongText('歌名\n\n[00:1O.00]a\n第二句');
            expect(result.errors).toEqual([]);
            expect(result.lyrics?.synced).toBe(false);
        });

        it('should report a malformed offset', () => {
            expect(codes('歌名\n\n[offset:abc]\n[00:01.00]a')).toEqual([
                { line: 3, code: 'BAD_OFFSET' },
            ]);
        });
    });

    describe('limits', () => {
        it('should reject a text larger than the byte limit before reading it', () => {
            // 中文字 UTF-8 每個 3 byte
            const text = `歌名\n\n${'字'.repeat(Math.ceil(SONG_TEXT_MAX_BYTES / 3))}`;
            expect(codes(text)).toEqual([{ line: 0, code: 'TOO_LARGE' }]);
        });

        it('should reject too many lines', () => {
            const ok = ['歌名', ...Array<string>(SONG_TEXT_MAX_LINES - 1).fill('a')].join('\n');
            expect(codes(ok)).toEqual([]);
            expect(codes(`${ok}\na`)).toEqual([{ line: 0, code: 'TOO_MANY_LINES' }]);
        });

        it('should limit the title', () => {
            expect(codes('名'.repeat(TITLE_MAX_CHARS))).toEqual([]);
            expect(codes('名'.repeat(TITLE_MAX_CHARS + 1))).toEqual([
                { line: 1, code: 'TITLE_TOO_LONG' },
            ]);
        });

        it('should limit each credit', () => {
            expect(codes(`歌名\n詞：${'詞'.repeat(CREDIT_MAX_CHARS)}`)).toEqual([]);
            expect(codes(`歌名\n曲：a\n詞：${'詞'.repeat(CREDIT_MAX_CHARS + 1)}`)).toEqual([
                { line: 3, code: 'CREDIT_TOO_LONG' },
            ]);
        });

        it('should limit each lyric line and count characters, not bytes', () => {
            const long = '歌'.repeat(LYRIC_LINE_MAX_CHARS);
            expect(codes(`歌名\n\n${long}`)).toEqual([]);
            expect(codes(`歌名\n\n${long}字\n短`)).toEqual([{ line: 3, code: 'LINE_TOO_LONG' }]);
        });

        it('should list errors in line order', () => {
            const text = `[00:01.00]a\n${'歌'.repeat(LYRIC_LINE_MAX_CHARS + 1)}`;
            expect(codes(text)).toEqual([
                { line: 1, code: 'TITLE_REQUIRED' },
                { line: 2, code: 'MIXED_TIMESTAMPS' },
                { line: 2, code: 'LINE_TOO_LONG' },
            ]);
        });
    });
});
