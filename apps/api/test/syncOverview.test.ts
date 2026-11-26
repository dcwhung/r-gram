/*
 * API-033 GET /api/sync（T-105；Technical Spec「CR-007 → 同步嘅設計」）：媒體 bucket 第一層 + D1 專輯。
 * 啱格式嘅資料夾（new / known / duplicate，按 albumOrder）、唔啱格式嘅（`_` 開頭唔列）、同 id 幾個資料夾、
 * D1 有而 bucket 冇嘅專輯（移除候選）。唔寫嘢
 */
import { env } from 'cloudflare:test';
import { countOf, insertAlbum } from './albumFixtures';
import { stateRow } from './catalogFixtures';
import { putMedia, syncOverview } from './syncFixtures';

describe('GET /api/sync', () => {
    it('should list the album folders in the fixed order and say which are new', async () => {
        await putMedia('info.txt', '唱片名稱：K', 'single-01-k');
        await putMedia('01 a.m4a', 'a', 'album-11-komorebi');
        await putMedia('01 a.m4a', 'a', 'album-01-apollo-18');
        await insertAlbum('apollo-18', 0, { category: 'album', category_no: 1 });
        const body = await syncOverview();
        expect(body.folders).toEqual([
            {
                folder: 'album-01-apollo-18',
                id: 'apollo-18',
                category: 'album',
                categoryNo: 1,
                status: 'known',
            },
            {
                folder: 'album-11-komorebi',
                id: 'komorebi',
                category: 'album',
                categoryNo: 11,
                status: 'new',
            },
            { folder: 'single-01-k', id: 'k', category: 'single', categoryNo: 1, status: 'new' },
        ]);
        expect(body.truncated).toBe(false);
    });

    it('should skip underscore folders and list names that do not match the rule', async () => {
        await putMedia('lubalin.otf', 'font', '_fonts');
        await putMedia('a.m4a', 'a', 'Album-01-X');
        await putMedia('a.m4a', 'a', 'misc');
        await env.MEDIA.put('stray.txt', 'x');
        const body = await syncOverview();
        expect(body.folders).toEqual([]);
        expect(body.invalid).toEqual([
            {
                folder: 'Album-01-X',
                code: 'INVALID_FOLDER_NAME',
                message: expect.stringContaining('Album-01-X'),
            },
            {
                folder: 'misc',
                code: 'INVALID_FOLDER_NAME',
                message: expect.stringContaining('misc'),
            },
        ]);
    });

    it('should report one id in several folders and keep only the stored one usable', async () => {
        await putMedia('01 a.m4a', 'a', 'album-01-x');
        await putMedia('01 a.m4a', 'a', 'ep-01-x');
        await putMedia('01 a.m4a', 'a', 'album-02-y');
        await putMedia('01 a.m4a', 'a', 'ep-02-y');
        await insertAlbum('y', 0, { category: 'ep', category_no: 2 });
        const body = await syncOverview();
        expect(body.duplicateIds).toEqual([
            { id: 'x', folders: ['album-01-x', 'ep-01-x'] },
            { id: 'y', folders: ['album-02-y', 'ep-02-y'] },
        ]);
        const statuses = body.folders.map(
            ({ folder, status }: { folder: string; status: string }) => [folder, status],
        );
        expect(statuses).toEqual([
            ['album-01-x', 'duplicate'],
            ['album-02-y', 'duplicate'],
            ['ep-01-x', 'duplicate'],
            ['ep-02-y', 'known'],
        ]);
    });

    it('should list stored albums whose folder is gone as removal candidates', async () => {
        await insertAlbum('gone', 0, { title: '舊碟' });
        await insertAlbum('renamed', 1, { category: 'album', category_no: 2 });
        await putMedia('01 a.m4a', 'a', 'ep-05-renamed');
        expect((await syncOverview()).missingAlbums).toEqual([
            { kind: 'album', albumId: 'gone', folder: 'album-01-gone', title: '舊碟' },
        ]);
    });

    // T-116：管理端由媒體 bucket 公開網址攞封面來源（coverJobs 嘅 key 接喺後面），唔另外喺 build 時設定
    it('should give the public media base for the cover sources', async () => {
        expect((await syncOverview()).mediaBase).toBe(env.MEDIA_BASE);
    });

    it('should not write anything', async () => {
        await putMedia('01 a.m4a', 'a', 'album-01-new');
        await syncOverview();
        expect(await countOf('albums')).toBe(0);
        expect(await stateRow()).toBeNull();
        expect((await env.MEDIA.list()).objects).toHaveLength(1);
    });
});
