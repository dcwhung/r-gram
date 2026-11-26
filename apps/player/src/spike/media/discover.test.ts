import { discover } from './discover';
import { folderFileUrl } from './candidates';

const BASE = 'http://127.0.0.1:9/';
const FOLDER = 'album-11-komorebi';
const INFO = [
    '唱片名稱：KOMOREBI',
    '發行年份：2026',
    '曲目：',
    '1. 下一位參賽者',
    '3. 搲撈HK',
    '7. 第七',
].join('\n');

/** 假 bucket：列出嘅檔 200，其他 404；`info` = info.txt 嘅內容（null = 冇呢個檔） */
const fakeBucket = (files: readonly string[], info: string | null = INFO) => {
    const present = new Set(files.map((name) => folderFileUrl(BASE, FOLDER, name)));
    const infoUrl = folderFileUrl(BASE, FOLDER, 'info.txt');
    return vi.fn((url: string) => {
        if (url === infoUrl) {
            return Promise.resolve(new Response(info ?? '', { status: info === null ? 404 : 200 }));
        }
        return Promise.resolve(new Response(null, { status: present.has(url) ? 200 : 404 }));
    });
};

describe('discover', () => {
    it('should read the track list from info.txt and find each audio file, the MV and the cover', async () => {
        const fetcher = fakeBucket([
            'cover.png',
            '01 下一位參賽者.m4a',
            '3 搲撈HK.mp3',
            '03 搲撈HK.mp4',
        ]);
        const found = await discover({ base: BASE, folder: FOLDER, fetcher });
        expect(found.info).toBe('ok');
        expect(found.albumTitle).toBe('KOMOREBI');
        expect(found.tracks.map(({ no, title }) => ({ no, title }))).toEqual([
            { no: 1, title: '下一位參賽者' },
            { no: 3, title: '搲撈HK' },
            { no: 7, title: '第七' },
        ]);
        expect(found.audio).toEqual(['01 下一位參賽者.m4a', '3 搲撈HK.mp3']);
        expect(found.mv).toBe('03 搲撈HK.mp4');
        expect(found.cover).toBe('cover.png');
    });

    it('should count every request it made', async () => {
        const found = await discover({ base: BASE, folder: FOLDER, fetcher: fakeBucket([]) });
        // info.txt + 2 個封面名 + 每首歌（3 首）：音檔 4 個名、MV 4 個名；7 號 = 07 同 7 兩個寫法
        expect(found.requests).toBe(1 + 2 + 3 * (4 + 4));
        expect(found.audio).toEqual([]);
        expect(found.mv).toBeNull();
        expect(found.cover).toBeNull();
    });

    it('should report a missing info.txt and probe nothing else', async () => {
        const found = await discover({ base: BASE, folder: FOLDER, fetcher: fakeBucket([], null) });
        expect(found).toMatchObject({ info: 'missing', tracks: [], audio: [], requests: 3 });
    });

    it('should report a network error when info.txt cannot be fetched', async () => {
        const fetcher = vi.fn(() => Promise.reject(new TypeError('Load failed')));
        const found = await discover({ base: BASE, folder: FOLDER, fetcher });
        expect(found.info).toBe('error');
        expect(found.infoError).toBe('TypeError: Load failed');
    });
});
