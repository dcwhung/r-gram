/* API-015 PUT /api/albums/order：成個列表嘅新次序，一個 batch 寫入 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { NOW, albumRow, api, insertAlbum, json } from './albumFixtures';

const order = (body: unknown) => api('PUT', '/api/albums/order', body);

const listedIds = async () =>
    (await json<{ albums: { id: string }[] }>(await api('GET', '/api/albums'))).albums.map(
        (album) => album.id,
    );

describe('PUT /api/albums/order', () => {
    beforeEach(async () => {
        await insertAlbum('a', 1);
        await insertAlbum('b', 2);
        await insertAlbum('c', 5);
    });

    it('should store the new order as 1..n and answer with it', async () => {
        const response = await order({ ids: ['c', 'a', 'b'] });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ids: ['c', 'a', 'b'] });
        expect(await listedIds()).toEqual(['c', 'a', 'b']);
        const rows = await env.DB.prepare('SELECT id, sort_order FROM albums ORDER BY id').all();
        expect(rows.results).toEqual([
            { id: 'a', sort_order: 2 },
            { id: 'b', sort_order: 3 },
            { id: 'c', sort_order: 1 },
        ]);
    });

    it('should not touch updatedAt, so open edit forms stay valid', async () => {
        await order({ ids: ['b', 'c', 'a'] });
        expect((await albumRow('a'))?.updated_at).toBe(NOW);
    });

    it('should answer 409 CONFLICT when the ids are not exactly the current albums', async () => {
        for (const ids of [
            ['a', 'b'],
            ['a', 'b', 'c', 'd'],
            ['a', 'b', 'x'],
        ]) {
            const response = await order({ ids });
            expect(response.status, ids.join()).toBe(409);
            expect(await response.json()).toEqual({
                error: { code: 'CONFLICT', message: zhHant.albums.errors.orderChanged },
            });
        }
        expect(await listedIds()).toEqual(['a', 'b', 'c']);
    });

    it('should answer VALIDATION_ERROR for a body that is not a list of distinct ids', async () => {
        for (const body of [{}, { ids: 'a,b,c' }, { ids: ['a', 'b', 'b'] }, { ids: [1, 2, 3] }]) {
            const response = await order(body);
            expect(response.status, JSON.stringify(body)).toBe(400);
            expect(await response.json()).toMatchObject({
                error: {
                    code: 'VALIDATION_ERROR',
                    details: [{ path: 'ids', reason: 'INVALID_LIST' }],
                },
            });
        }
    });

    it('should end in one complete order when two reorders race', async () => {
        await Promise.all([order({ ids: ['c', 'b', 'a'] }), order({ ids: ['b', 'a', 'c'] })]);
        expect([
            ['c', 'b', 'a'],
            ['b', 'a', 'c'],
        ]).toContainEqual(await listedIds());
    });

    it('should not be taken for an album called order', async () => {
        const response = await api('GET', '/api/albums/order');
        expect(response.status).toBe(404);
    });
});

describe('PUT /api/albums/order with no albums', () => {
    it('should accept the empty list and answer 200 with it (D1 batch refuses no statements)', async () => {
        const response = await order({ ids: [] });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ids: [] });
    });
});
