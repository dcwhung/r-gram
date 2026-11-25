/*
 * 專輯 API（Technical Spec API-010–015；CR-003：冇上下架、冇草稿，儲存即生效）。
 * 掛喺 /api/albums，喺 api/routes.ts 嘅 session + same-origin 守門之後（backlog B-019 ①）。
 * 寫入成功之後生成 catalog 唔喺度做：api/afterWrite.ts 嘅後置步驟（T-026 接上 rebuildCatalog()）
 */
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { FORCE_CONFIRMED, HTTP_STATUS } from '../config';
import { readIfMatch, readJsonObject } from '../lib/http';
import { albumError, notAnObject, ordinalFull, ordinalTaken, validationError } from './errors';
import { albumOverview } from './overview';
import { readOrder } from './order';
import { toAlbum } from './rows';
import * as store from './store';
import { dropLyricsLater } from '../tracks/lyricsCleanup';
import { tracksOf } from '../tracks/rows';
import {
    NO_COVERS,
    parseCreate,
    parseFields,
    secondCoverIssues,
    touchesCovers,
    unknownAssetIssues,
    type AlbumFields,
} from './validate';

export const albumRoutes = new Hono<AppEnv>();

/**
 * PATCH 改唔到：冇呢張碟 → 404；If-Match 過時（包括同時另一個請求先改咗）→ 409 STALE；
 * 兩樣都唔係 = 改完之後嘅序號同類別入面另一張碟撞咗（CR-004）
 */
const whyNotUpdated = async (c: Context<AppEnv>, id: string, expected: string) => {
    const current = await store.findAlbum(c.env.DB, id);
    if (!current) return albumError(c, 'notFound');
    return current.updated_at === expected ? ordinalTaken(c) : albumError(c, 'stale');
};

/**
 * 第二張封面（CR-005）要睇改完之後嘅狀態，所以先讀而家嘅值：冇呢張碟 → 404；If-Match 過時 → 409 STALE
 *（過時就唔判斷封面）。之後 updateAlbum 嘅 `WHERE updated_at = If-Match` 保證寫入嗰刻嘅值同呢度讀到嘅一樣；
 * DB 嘅 CHECK（cover2 要有 cover）係最後一道防線。冇問題 → undefined
 */
const coverConflict = async (
    c: Context<AppEnv>,
    id: string,
    expected: string,
    fields: AlbumFields,
) => {
    if (!touchesCovers(fields)) return undefined;
    const current = await store.findAlbum(c.env.DB, id);
    if (!current) return albumError(c, 'notFound');
    if (current.updated_at !== expected) return albumError(c, 'stale');
    const issues = secondCoverIssues(fields, current);
    return issues.length > 0 ? validationError(c, issues) : undefined;
};

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
    // 逐個欄都啱先睇第二張封面（欄位錯嘅時候唔再加「唔成對」嘅連帶錯誤）
    if (issues.length === 0) issues.push(...secondCoverIssues(fields, NO_COVERS));
    if (issues.length > 0) return validationError(c, issues);
    const outcome = await store.insertAlbum(c.env.DB, id, fields);
    if (outcome === 'idTaken') return albumError(c, 'idTaken');
    if (outcome === 'ordinalTaken') return ordinalTaken(c);
    if (outcome === 'ordinalFull') return ordinalFull(c);
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
    const conflict = await coverConflict(c, id, expected, fields);
    if (conflict) return conflict;
    const updated = await store.updateAlbum(c.env.DB, id, fields, expected);
    if (updated) return c.json(toAlbum(updated));
    return whyNotUpdated(c, id, expected);
});

albumRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    if (!(await store.findAlbum(c.env.DB, id))) return albumError(c, 'notFound');
    if (c.req.query('force') !== FORCE_CONFIRMED) {
        const trackIds = await store.trackIdsOf(c.env.DB, id);
        const removed = [{ type: 'album', id }, ...trackIds.map((t) => ({ type: 'track', id: t }))];
        return albumError(c, 'idRemoved', removed);
    }
    const deleted = await store.deleteAlbum(c.env.DB, id);
    if (!deleted) return albumError(c, 'notFound');
    // 同刪歌一樣：冇其他歌用緊嘅歌詞檔由 R2 刪走（backlog B-048），等 catalog 生成成功先刪（W-021）
    dropLyricsLater(c, deleted.lyricsNames);
    return c.json({ deleted: { albumId: id, trackIds: deleted.trackIds } });
});
