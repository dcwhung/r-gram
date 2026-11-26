import { formatAlbumInfo } from './formatAlbumInfo';
import { INFO_TEXT_MAX_LINES } from './limits';
import { parseAlbumInfo } from './parseAlbumInfo';
import type { AlbumInfoFields } from './types';

const KOMOREBI: AlbumInfoFields = {
    title: 'Komorebi',
    year: 2026,
    tracks: [
        { no: 1, title: '下一位參賽者' },
        { no: 3, title: '搲撈HK' },
        { no: 11, title: 'G’night' },
    ],
};

/** 碟名、年份、`曲目：` */
const HEAD_LINES = 3;

/** 解析結果減去行號同 `usable`：同 `formatAlbumInfo()` 嘅輸入同一個形狀 */
const fieldsOf = (text: string): AlbumInfoFields => {
    const { title, year, tracks, checks } = parseAlbumInfo(text);
    expect(checks).toEqual([]);
    return { title: title ?? '', year, tracks: tracks.map(({ no, title }) => ({ no, title })) };
};

describe('formatAlbumInfo', () => {
    it('should write the same layout as the user file (full-width colons, "1. " numbers)', () => {
        expect(formatAlbumInfo(KOMOREBI)).toBe(
            [
                '唱片名稱：Komorebi',
                '發行年份：2026',
                '曲目：',
                '1. 下一位參賽者',
                '3. 搲撈HK',
                '11. G’night',
                '',
            ].join('\n'),
        );
    });

    it('should leave out the year line when there is no year', () => {
        expect(formatAlbumInfo({ title: 'a', year: null, tracks: [] })).toBe(
            '唱片名稱：a\n曲目：\n',
        );
    });

    it('should list the tracks by number', () => {
        const text = formatAlbumInfo({
            title: 'a',
            year: null,
            tracks: [
                { no: 16, title: '十六' },
                { no: 2, title: '二' },
            ],
        });
        expect(text.endsWith('曲目：\n2. 二\n16. 十六\n')).toBe(true);
    });

    describe('round trip', () => {
        it.each<[string, AlbumInfoFields]>([
            ['the user album', KOMOREBI],
            ['no year, no tracks', { title: 'komorebi', year: null, tracks: [] }],
            [
                'titles with colons and numbers',
                {
                    title: 'Re: 1. 開始',
                    year: 1999,
                    tracks: [
                        { no: 1, title: '12:00 Midnight' },
                        { no: 999, title: '1. 再來' },
                        { no: 7, title: '- 開頭係分隔符號' },
                    ],
                },
            ],
        ])('should read back %s unchanged', (_, fields) => {
            expect(fieldsOf(formatAlbumInfo(fields))).toEqual({
                ...fields,
                tracks: [...fields.tracks].sort((a, b) => a.no - b.no),
            });
        });

        // S-160：碟名、年份、`曲目：` 三行 + 歌 = 上限；檔尾嘅換行唔計多一行
        it('should read back a file of exactly the line limit', () => {
            const count = INFO_TEXT_MAX_LINES - HEAD_LINES;
            const tracks = Array.from({ length: count }, (_, index) => ({
                no: index + 1,
                title: `歌${index + 1}`,
            }));
            const fields = { title: 'a', year: 2000, tracks };
            const text = formatAlbumInfo(fields);
            expect(text.split('\n')).toHaveLength(INFO_TEXT_MAX_LINES + 1);
            expect(fieldsOf(text)).toEqual(fields);
        });
    });
});
