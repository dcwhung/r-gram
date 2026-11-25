/*
 * 專輯 API（Technical Spec API-010–015；CR-003：冇上下架、冇草稿，儲存即生效）。
 * 掛喺 /api/albums，喺 api/routes.ts 嘅 session + same-origin 守門之後（backlog B-019 ①）。
 * 寫入成功之後生成 catalog 唔喺度做：api/afterWrite.ts 嘅後置步驟（T-026 接上 rebuildCatalog()）
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { FORCE_CONFIRMED, HTTP_STATUS } from '../config';
import { readIfMatch, readJsonObject } from '../lib/http';
import { albumError, notAnObject, validationError } from './errors';
import { albumOverview } from './overview';
import { readOrder } from './order';
import { toAlbum } from './rows';
import * as store from './store';
import { tracksOf } from '../tracks/rows';
import { parseCreate, parseFields, unknownAssetIssues } from './validate';

export const albumRoutes = new Hono<AppEnv>();

albumRoutes.get('/', async (c) => c.json(await albumOverview(c.env.DB)));

// /order 要喺 /:id 之前（唔會當成一張叫 order 嘅專輯）
albumRoutes.put('/order', async (c) => {
    const body = await readJsonObject(c);
    const ids = readOrder(body);
    if (!ids) return validationError(c, [{ path: 'ids', reason: 'INVALID_LIST' }]);
    const current = await store.allAlbumIds(c.env.DB);
    const sameSet = ids.length === current.length && current.every((id) => ids.includes(id));
    if (!sameSet) return albumError(c, 'orderChanged');
    await store.writeOrder(c.env.DB, ids);
    return c.json({ ids });
});

albumRoutes.post('/', async (c) => {
    const body = await readJsonObject(c);
    if (!body) return notAnObject(c);
    const { id, fields, issues } = parseCreate(body);
    issues.push(...(await unknownAssetIssues(c.env.DB, fields)));
    if (issues.length > 0) return validationError(c, issues);
    if (!(await store.insertAlbum(c.env.DB, id, fields))) return albumError(c, 'idTaken');
    const row = await store.findAlbum(c.env.DB, id);
    return c.json(row && toAlbum(row), HTTP_STATUS.created);
});

albumRoutes.get('/:id', async (c) => {
    const row = await store.findAlbum(c.env.DB, c.req.param('id'));
    if (!row) return albumError(c, 'notFound');
    return c.json({ ...toAlbum(row), tracks: await tracksOf(c.env.DB, row.id) });
});

albumRoutes.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const expected = readIfMatch(c);
    const body = await readJsonObject(c);
    if (!body) return notAnObject(c);
    if (expected === undefined)
        return validationError(c, [{ path: 'If-Match', reason: 'REQUIRED' }]);
    const { fields, issues } = parseFields(body);
    issues.push(...(await unknownAssetIssues(c.env.DB, fields)));
    if (issues.length > 0) return validationError(c, issues);
    const updated = await store.updateAlbum(c.env.DB, id, fields, expected);
    if (updated) return c.json(toAlbum(updated));
    // 改唔到但張碟仲喺度 = If-Match 過時（包括同時另一個請求先改咗）
    if (!(await store.findAlbum(c.env.DB, id))) return albumError(c, 'notFound');
    return albumError(c, 'stale');
});

albumRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    if (!(await store.findAlbum(c.env.DB, id))) return albumError(c, 'notFound');
    if (c.req.query('force') !== FORCE_CONFIRMED) {
        const trackIds = await store.trackIdsOf(c.env.DB, id);
        const removed = [{ type: 'album', id }, ...trackIds.map((t) => ({ type: 'track', id: t }))];
        return albumError(c, 'idRemoved', removed);
    }
    const trackIds = await store.deleteAlbum(c.env.DB, id);
    if (!trackIds) return albumError(c, 'notFound');
    return c.json({ deleted: { albumId: id, trackIds } });
});
