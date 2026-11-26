/*
 * 同步嘅操作上限（review S-136，T-105 沿用）：list 最多讀 SCAN_LIST_PAGES_MAX 頁；到咗上限就停，喺回應講明（truncated），
 * 唔會一直讀落去。list 唔完整時「檔已唔喺資料夾」唔可靠：唔列任何移除，確認移除一律唔做（STALE）
 */
import { env } from 'cloudflare:test';
import { SCAN_LIST_PAGES_MAX } from '../src/config';
import { insertAlbum } from './albumFixtures';
import {
    ALBUM_ID,
    FOLDER,
    confirmRemovals,
    mediaWith,
    putKomorebi,
    putMedia,
    syncFolder,
    syncOverview,
} from './syncFixtures';

/** 遠多過任何合理上限：到咗就當無限 loop */
const RUNAWAY_CALLS = 100;

/** 第一頁係真嘅，之後每頁都話「仲有」（永遠讀唔完） */
const endlessList = () =>
    mediaWith({
        list: async (args, original) => {
            const [options] = args as [R2ListOptions | undefined];
            if (options?.cursor)
                return { objects: [], delimitedPrefixes: [], truncated: true, cursor: 'next' };
            const page = (await original(options)) as R2Objects;
            return { ...page, truncated: true, cursor: 'next' };
        },
    });

describe('sync limits: listing pages', () => {
    it('should stop the bucket listing at the page limit and list no missing album', async () => {
        await insertAlbum('gone', 0);
        await putMedia('01 a.m4a', 'a', 'album-02-here');
        const { bindings, calls } = endlessList();
        const body = await syncOverview(bindings);
        expect(calls.list).toBe(SCAN_LIST_PAGES_MAX);
        expect(calls.list).toBeLessThan(RUNAWAY_CALLS);
        expect(body).toMatchObject({ truncated: true, missingAlbums: [] });
        expect(body.folders.map(({ folder }: { folder: string }) => folder)).toEqual([
            'album-02-here',
        ]);
    });

    it('should list no removal of a folder whose listing is incomplete', async () => {
        await putKomorebi();
        await syncFolder();
        await env.MEDIA.delete(`${FOLDER}/03 搲撈HK.mp3`);
        const { bindings } = endlessList();
        const { status, body } = await syncFolder(FOLDER, '', bindings);
        expect(status).toBe(200);
        expect(body).toMatchObject({ truncated: true, pendingRemovals: [] });
    });

    it('should not confirm a removal while the listing is incomplete', async () => {
        await putKomorebi();
        await syncFolder();
        await env.MEDIA.delete(`${FOLDER}/03 搲撈HK.mp3`);
        const { bindings } = endlessList();
        const item = {
            kind: 'audio',
            albumId: ALBUM_ID,
            trackId: 'komorebi-03',
            key: `${FOLDER}/03 搲撈HK.mp3`,
        };
        const { body } = await confirmRemovals([item], bindings);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STALE' });
    });
});
