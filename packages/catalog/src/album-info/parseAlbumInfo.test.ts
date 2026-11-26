import { TITLE_MAX_CHARS } from '../song-text/limits';
import { songLines } from '../song-text/lines';
import { INFO_TEXT_MAX_BYTES, INFO_TEXT_MAX_LINES } from './limits';
import { parseAlbumInfo } from './parseAlbumInfo';

// W-038：睇 parser 有冇喺拆行之前先擋走太長嘅文字（行為照舊，只係包住真函數）
vi.mock('../song-text/lines', async (original) => {
    const actual = await original<typeof import('../song-text/lines')>();
    return { ...actual, songLines: vi.fn(actual.songLines) };
});

/** 用戶嘅真實 `info.txt`（album-11-komorebi；Functional Spec §CR-007 決定 2） */
const KOMOREBI = [
    '唱片名稱：Komorebi',
    '發行年份：2026',
    '曲目：',
    '1. 下一位參賽者',
    '2. 跟住去邊度',
    '3. 搲撈HK',
    '4. 毒蟲圖鑑',
    '5. 太平門',
    '6. 理想的下午',
    '7. 我永遠記得',
    '8. 揀睇誌',
    '9. 一杯',
    '10. 想寫好的功課',
    '11. G’night',
    '12. 木漏日',
].join('\n');

const codes = (text: string) => parseAlbumInfo(text).checks.map(({ code }) => code);

describe('parseAlbumInfo', () => {
    it("should read the user's real info.txt without any check", () => {
        const info = parseAlbumInfo(KOMOREBI);
        expect(info.usable).toBe(true);
        expect(info.title).toBe('Komorebi');
        expect(info.year).toBe(2026);
        expect(info.checks).toEqual([]);
        expect(info.tracks).toHaveLength(12);
        expect(info.tracks[0]).toEqual({ no: 1, title: '下一位參賽者', line: 4 });
        expect(info.tracks[10]).toEqual({ no: 11, title: 'G’night', line: 14 });
        expect(info.tracks.map(({ no }) => no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    describe('label lines', () => {
        it.each([
            ['唱片名稱：Komorebi'],
            ['唱片名稱:Komorebi'],
            ['  唱片名稱 ： Komorebi  '],
            ['　唱片名稱　：　Komorebi　'],
            ['專輯名稱：Komorebi'],
        ])('should read the album title from %j', (line) => {
            expect(parseAlbumInfo(line).title).toBe('Komorebi');
        });

        it('should keep everything after the first colon as the value', () => {
            expect(parseAlbumInfo('唱片名稱：Re: Live：2026').title).toBe('Re: Live：2026');
        });

        it.each([
            ['發行年份：2026', 2026],
            ['發行年份：2026年', 2026],
            ['發行日期：2026-11-27', 2026],
            ['年份: 1999', 1999],
            ['發行年份：１９９８', 1998],
        ])('should read the year from %j', (line, year) => {
            expect(parseAlbumInfo(line).year).toBe(year);
            expect(codes(line)).not.toContain('INFO_BAD_YEAR');
        });

        it('should have no year and no check when there is no year line or it is empty', () => {
            expect(parseAlbumInfo('唱片名稱：A').year).toBeNull();
            expect(parseAlbumInfo('唱片名稱：A\n發行年份：').year).toBeNull();
            expect(codes('唱片名稱：A\n發行年份：')).toEqual([]);
        });

        it.each([
            '發行年份：明年',
            '發行年份：1899',
            '發行年份：2101',
            '發行年份：20261',
            '發行年份：26',
        ])('should have no year and a check for %j', (line) => {
            const info = parseAlbumInfo(`唱片名稱：A\n${line}`);
            expect(info.year).toBeNull();
            expect(info.checks).toEqual([
                { level: 'warning', code: 'INFO_BAD_YEAR', line: 2, params: {} },
            ]);
        });

        it('should use the first of a repeated label and report the repeat', () => {
            const info = parseAlbumInfo('唱片名稱：甲\n專輯名稱：乙\n發行年份：2001\n年份：2002');
            expect(info.title).toBe('甲');
            expect(info.year).toBe(2001);
            expect(info.checks).toEqual([
                { level: 'warning', code: 'INFO_DUPLICATE_LABEL', line: 2, params: {} },
                { level: 'warning', code: 'INFO_DUPLICATE_LABEL', line: 4, params: {} },
            ]);
        });
    });

    describe('album title', () => {
        it.each(['發行年份：2026', '唱片名稱：', '唱片名稱：   '])(
            'should have no title and a check for %j',
            (text) => {
                const info = parseAlbumInfo(text);
                expect(info.title).toBeNull();
                expect(info.checks).toContainEqual({
                    level: 'warning',
                    code: 'INFO_NO_TITLE',
                    params: {},
                });
            },
        );

        it('should drop a title longer than the limit with a check on its line', () => {
            const info = parseAlbumInfo(`曲目：\n唱片名稱：${'名'.repeat(TITLE_MAX_CHARS + 1)}`);
            expect(info.title).toBeNull();
            expect(info.checks).toEqual([
                {
                    level: 'warning',
                    code: 'INFO_TOO_LONG',
                    line: 2,
                    params: { max: TITLE_MAX_CHARS },
                },
            ]);
        });

        it('should accept a title of exactly the limit', () => {
            const title = '名'.repeat(TITLE_MAX_CHARS);
            expect(parseAlbumInfo(`唱片名稱：${title}`).title).toBe(title);
        });

        // S-158：控制字元、零寬字元、bidi 控制字元睇唔到，唔可以入碟名
        it('should drop control, zero-width and bidi-control characters from the title', () => {
            expect(parseAlbumInfo('唱片名稱：Ko\u200bmo\u0007re\u2066bi\u2069').title).toBe(
                'Komorebi',
            );
        });

        it('should treat a title of only hidden characters as no title', () => {
            const info = parseAlbumInfo('唱片名稱：\u200b\u202e\ufeff');
            expect(info.title).toBeNull();
            expect(info.checks).toEqual([{ level: 'warning', code: 'INFO_NO_TITLE', params: {} }]);
        });
    });

    describe('track lines', () => {
        it.each([
            ['1. 歌名', 1],
            ['01. 歌名', 1],
            ['001. 歌名', 1],
            ['1、歌名', 1],
            ['1､歌名', 1],
            ['1．歌名', 1],
            ['1) 歌名', 1],
            ['1）歌名', 1],
            ['1: 歌名', 1],
            ['1：歌名', 1],
            ['01 歌名', 1],
            ['1　歌名', 1],
            ['  12 .  歌名  ', 12],
            ['１２. 歌名', 12],
            ['999. 歌名', 999],
        ])('should read %j as track %i', (line, no) => {
            const info = parseAlbumInfo(`唱片名稱：A\n${line}`);
            expect(info.tracks).toEqual([{ no, title: '歌名', line: 2 }]);
            expect(info.checks).toEqual([]);
        });

        it.each([
            '1歌名',
            '0. 歌名',
            '1000. 歌名',
            '1. ',
            '1.',
            'A. 歌名',
            '歌名',
            '唱片公司：Sony',
        ])('should skip %j with an unknown-line check', (line) => {
            const info = parseAlbumInfo(`唱片名稱：A\n${line}`);
            expect(info.tracks).toEqual([]);
            expect(info.checks).toEqual([
                { level: 'warning', code: 'INFO_UNKNOWN_LINE', line: 2, params: {} },
            ]);
        });

        it('should drop hidden characters from a track title', () => {
            const info = parseAlbumInfo('唱片名稱：A\n1. \u200e歌\u200d名\u202c');
            expect(info.tracks).toEqual([{ no: 1, title: '歌名', line: 2 }]);
        });

        it('should skip a track whose title is only hidden characters', () => {
            const info = parseAlbumInfo('唱片名稱：A\n1. \u200b\u2060');
            expect(info.tracks).toEqual([]);
            expect(info.checks).toEqual([
                { level: 'warning', code: 'INFO_UNKNOWN_LINE', line: 2, params: {} },
            ]);
        });

        it('should keep the title as written (no width or quote changes)', () => {
            expect(parseAlbumInfo('3. 搲撈ＨＫ “Live”').tracks[0]?.title).toBe('搲撈ＨＫ “Live”');
        });

        it('should sort by number, allow gaps and accept tracks before the header', () => {
            const info = parseAlbumInfo('5. 五\n曲目：\n2. 二\n16. 十六');
            expect(info.tracks).toEqual([
                { no: 2, title: '二', line: 3 },
                { no: 5, title: '五', line: 1 },
                { no: 16, title: '十六', line: 4 },
            ]);
        });

        it('should use the first of a repeated number and report the repeat', () => {
            const info = parseAlbumInfo('唱片名稱：A\n5. 太平門\n05. 太平門 (Live)');
            expect(info.tracks).toEqual([{ no: 5, title: '太平門', line: 2 }]);
            expect(info.checks).toEqual([
                {
                    level: 'warning',
                    code: 'INFO_DUPLICATE_NUMBER',
                    line: 3,
                    no: 5,
                    params: { no: 5 },
                },
            ]);
        });

        it('should skip a track title longer than the limit with a check', () => {
            const info = parseAlbumInfo(`唱片名稱：A\n1. ${'歌'.repeat(TITLE_MAX_CHARS + 1)}`);
            expect(info.tracks).toEqual([]);
            expect(info.checks).toEqual([
                {
                    level: 'warning',
                    code: 'INFO_TOO_LONG',
                    line: 2,
                    no: 1,
                    params: { max: TITLE_MAX_CHARS },
                },
            ]);
        });

        it.each(['曲目：', '曲目:', '曲目', ' 曲目 ： '])('should accept the header %j', (line) => {
            expect(codes(`唱片名稱：A\n${line}\n1. 歌`)).toEqual([]);
        });
    });

    describe('whole file', () => {
        it('should accept CRLF, CR, a BOM and blank lines', () => {
            const info = parseAlbumInfo('﻿唱片名稱：A\r\n\r\n發行年份：2020\r曲目：\n\n1. 歌');
            expect(info).toMatchObject({ title: 'A', year: 2020, checks: [] });
            expect(info.tracks).toEqual([{ no: 1, title: '歌', line: 6 }]);
        });

        it('should be unusable with one error when larger than the byte limit', () => {
            const info = parseAlbumInfo(`唱片名稱：A\n${'x'.repeat(INFO_TEXT_MAX_BYTES)}`);
            expect(info).toEqual({
                usable: false,
                title: null,
                year: null,
                tracks: [],
                checks: [
                    {
                        level: 'error',
                        code: 'INFO_TOO_LARGE',
                        params: { maxBytes: INFO_TEXT_MAX_BYTES, maxLines: INFO_TEXT_MAX_LINES },
                    },
                ],
            });
        });

        it('should accept exactly the byte limit and refuse one byte more', () => {
            expect(parseAlbumInfo('x'.repeat(INFO_TEXT_MAX_BYTES)).usable).toBe(true);
            expect(parseAlbumInfo('x'.repeat(INFO_TEXT_MAX_BYTES + 1)).usable).toBe(false);
        });

        // 每個中文字 3 byte：字數少過上限，byte 數多過上限
        it('should count UTF-8 bytes, not characters', () => {
            const text = '歌'.repeat(6000);
            expect(text.length).toBeLessThan(INFO_TEXT_MAX_BYTES);
            expect(codes(text)).toEqual(['INFO_TOO_LARGE']);
        });

        it('should refuse an overlong text before splitting it into lines', () => {
            vi.mocked(songLines).mockClear();
            expect(parseAlbumInfo('\n'.repeat(INFO_TEXT_MAX_BYTES + 1)).usable).toBe(false);
            expect(songLines).not.toHaveBeenCalled();
        });

        it('should be unusable when it has more lines than the limit', () => {
            const info = parseAlbumInfo('1. 歌\n'.repeat(INFO_TEXT_MAX_LINES));
            expect(info.usable).toBe(false);
            expect(info.tracks).toEqual([]);
            expect(codes('\n'.repeat(INFO_TEXT_MAX_LINES))).toEqual(['INFO_TOO_LARGE']);
        });

        it('should accept exactly the line limit', () => {
            const text = `唱片名稱：A${'\n'.repeat(INFO_TEXT_MAX_LINES - 1)}`;
            expect(parseAlbumInfo(text).usable).toBe(true);
        });

        it('should report an empty file as having no title', () => {
            expect(parseAlbumInfo('')).toEqual({
                usable: true,
                title: null,
                year: null,
                tracks: [],
                checks: [{ level: 'warning', code: 'INFO_NO_TITLE', params: {} }],
            });
        });

        it('should list the checks by line, with the file-level check last', () => {
            const info = parseAlbumInfo('???\n1. 甲\n1. 乙\n發行年份：abc');
            expect(info.checks.map(({ code, line }) => [code, line])).toEqual([
                ['INFO_UNKNOWN_LINE', 1],
                ['INFO_DUPLICATE_NUMBER', 3],
                ['INFO_BAD_YEAR', 4],
                ['INFO_NO_TITLE', undefined],
            ]);
        });
    });
});
