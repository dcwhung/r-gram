/*
 * CR-007（Technical Spec「API 一覽嘅變化」）：媒體 bucket 係唯一來源，人手寫入專輯同歌嘅 API 取消。
 * 登入咗、同站嘅請求打呢啲 route 一律 404 NOT_FOUND，乜都唔寫、唔生成 catalog
 */
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, api, countOf, insertAlbum, insertTrack } from './albumFixtures';
import { stateRow } from './catalogFixtures';

const IF_MATCH = { 'if-match': `"${NOW}"` };

/** [method, path, body]：API-011、013、014、015、020、021、022、032（API-024、043 從來冇 route） */
const REMOVED: [string, string, unknown][] = [
    ['POST', '/api/albums', { id: 'x', title: 'X', category: 'album' }],
    ['PATCH', '/api/albums/apollo-18', { title: 'X' }],
    ['DELETE', '/api/albums/apollo-18?force=1', undefined],
    ['PUT', '/api/albums/order', { ids: ['apollo-18'] }],
    ['POST', '/api/albums/apollo-18/tracks', { text: '新歌' }],
    ['PATCH', '/api/tracks/apollo-18-01', { no: 5 }],
    ['DELETE', '/api/tracks/apollo-18-01?force=1', undefined],
    ['GET', '/api/media', undefined],
    ['GET', '/api/media?prefix=album-01-apollo-18/', undefined],
];

beforeEach(async () => {
    await insertAlbum('apollo-18', 0);
    await insertTrack('apollo-18-01', 'apollo-18', 1);
});

describe('routes removed by CR-007', () => {
    it.each(REMOVED)('should answer %s %s with 404 NOT_FOUND', async (method, path, body) => {
        const response = await api(method, path, body, IF_MATCH);
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: { code: 'NOT_FOUND', message: zhHant.errors.notFound },
        });
    });

    it('should leave the stored albums and tracks alone and generate nothing', async () => {
        for (const [method, path, body] of REMOVED) await api(method, path, body, IF_MATCH);
        expect(await countOf('albums')).toBe(1);
        expect(await countOf('tracks')).toBe(1);
        expect(await stateRow()).toBeNull();
    });

    it('should keep the read endpoints and the song text', async () => {
        expect((await api('GET', '/api/albums')).status).toBe(200);
        expect((await api('GET', '/api/albums/apollo-18')).status).toBe(200);
        expect((await api('GET', '/api/tracks/apollo-18-01/text')).status).toBe(200);
    });
});
