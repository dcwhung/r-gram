/*
 * 同步嘅操作上限（review S-136，T-105 沿用）：list 最多讀 SCAN_LIST_PAGES_MAX 頁；到咗上限就停，喺回應講明（truncated），
 * 唔會一直讀落去。list 唔完整時「檔已唔喺資料夾」唔可靠：唔列任何移除，確認移除一律唔做（STALE）
 */
import { env } from 'cloudflare:test';
import { SCAN_LIST_PAGES_MAX } from '../src/config';
import { albumRow, countOf, insertAlbum, insertAsset } from './albumFixtures';
import {
    ALBUM_ID,
    FOLDER,
    confirmRemovals,
    endlessList,
    putKomorebi,
    deleteMedia,
    KOMOREBI_INFO,
    putMedia,
    syncFolder,
    syncOverview,
} from './syncFixtures';

/** 遠多過任何合理上限：到咗就當無限 loop */
const RUNAWAY_CALLS = 100;

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

    it('should not delete an album while the bucket listing is incomplete', async () => {
        await insertAlbum('gone', 0);
        const { bindings } = endlessList();
        const { body } = await confirmRemovals([{ kind: 'album', albumId: 'gone' }], bindings);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STALE' });
        expect(await countOf('albums')).toBe(1);
    });

    it('should not delete a track while the folder listing is incomplete', async () => {
        await putKomorebi();
        await syncFolder();
        await putMedia('info.txt', KOMOREBI_INFO.replace('4. 毒蟲圖鑑\n', ''));
        const { bindings } = endlessList();
        const item = { kind: 'track', albumId: ALBUM_ID, trackId: 'komorebi-04' };
        const { body } = await confirmRemovals([item], bindings);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STALE' });
        expect(await countOf('tracks')).toBe(5);
    });

    it('should not clear a cover while the folder listing is incomplete', async () => {
        await putKomorebi();
        await syncFolder();
        await insertAsset('cover0000000000a.webp');
        await env.DB.prepare("UPDATE albums SET cover = 'cover0000000000a.webp'").run();
        await deleteMedia('cover.jpg');
        const { bindings } = endlessList();
        const item = { kind: 'cover', albumId: ALBUM_ID, slot: 'cover' };
        const { body } = await confirmRemovals([item], bindings);
        expect(body.results[0]).toMatchObject({ ok: false, code: 'STALE' });
        expect((await albumRow(ALBUM_ID))?.cover).toBe('cover0000000000a.webp');
    });
});
