/*
 * 媒體 bucket 嘅寫入鎖住（T-106；Technical Spec「安全設計 → 寫媒體 bucket」；Functional Spec D75、R-20）：
 * 行勻所有寫入 route（同步、確認移除、封面上載同結果、生成 catalog、兩個文字框），媒體 bucket 只會收到
 * API-019 嘅 `info.txt` 同 API-041 嘅 `NN ….txt` 兩個 put，永遠冇 delete；奇怪嘅 id 唔會寫到任何嘢
 */
import { env } from 'cloudflare:test';
import { api } from './albumFixtures';
import { ORIGIN, call, loginCookie } from './helpers';
import { webpVp8l } from './imageFixtures';
import {
    ALBUM_ID,
    FOLDER,
    KOMOREBI_INFO,
    deleteMedia,
    mediaKey,
    putKomorebi,
    recordedMedia,
    syncFolder,
} from './syncFixtures';

const BIG = 1200;
const SMALL = 320;

const upload = async (side: number, bindings = env) => {
    const headers = { cookie: await loginCookie(), origin: ORIGIN, 'content-type': 'image/webp' };
    const body = webpVp8l(side, side, side);
    const response = await call('/api/assets', { method: 'PUT', body, headers }, bindings);
    return ((await response.json()) as { name: string }).name;
};

const etagOf = async (key: string) => (await env.MEDIA.head(key))?.httpEtag ?? null;

beforeEach(putKomorebi);

describe('writes to the media bucket', () => {
    it('should only ever put info.txt and the song text file, and never delete', async () => {
        const { puts, calls, bindings } = recordedMedia();
        await syncFolder(FOLDER, '', bindings);
        const info = {
            text: KOMOREBI_INFO.replace('Komorebi', 'K'),
            etag: await etagOf(mediaKey('info.txt')),
        };
        const statuses = [
            (await api('PUT', `/api/albums/${ALBUM_ID}/info`, info, {}, bindings)).status,
        ];
        const song = { text: '下一位參賽者\n曲：甲', etag: null };
        statuses.push(
            (await api('PUT', `/api/tracks/${ALBUM_ID}-01/text`, song, {}, bindings)).status,
        );
        const cover = {
            slot: 'cover',
            cover: await upload(BIG, bindings),
            thumb: await upload(SMALL, bindings),
            sourceKey: mediaKey('cover.jpg'),
            sourceEtag: await etagOf(mediaKey('cover.jpg')),
        };
        statuses.push(
            (await api('PUT', `/api/albums/${ALBUM_ID}/cover`, cover, {}, bindings)).status,
        );
        await deleteMedia('05 太平門.mp4');
        const synced = await syncFolder(FOLDER, '', bindings);
        const items = synced.body.pendingRemovals;
        expect(items).toHaveLength(1);
        statuses.push((await api('POST', '/api/sync/removals', { items }, {}, bindings)).status);
        statuses.push((await api('POST', '/api/catalog/rebuild', undefined, {}, bindings)).status);
        expect(statuses).toEqual([200, 200, 200, 200, 200]);
        expect(puts).toEqual([mediaKey('info.txt'), mediaKey('01 下一位參賽者.txt')]);
        expect(calls.delete).toBeUndefined();
    });

    it.each([
        ['PUT', '/api/albums/..%2F_fonts/info', { text: 'x', etag: null }],
        ['PUT', '/api/albums/%2E%2E/info', { text: 'x', etag: null }],
        ['PUT', `/api/albums/${ALBUM_ID}%2F..%2F_fonts/info`, { text: 'x', etag: null }],
        ['PUT', '/api/tracks/..%2Fkomorebi-01/text', { text: 'x', etag: null }],
        ['PUT', '/api/tracks/%2E%2E/text', { text: 'x', etag: null }],
        ['PUT', '/api/albums/..%2F_fonts/cover', { slot: 'cover' }],
    ])('should write nothing for %s %s', async (method, path, body) => {
        await syncFolder();
        const { puts, bindings } = recordedMedia();
        const response = await api(method, path, body, {}, bindings);
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(puts).toEqual([]);
    });
});
