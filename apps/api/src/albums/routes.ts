/*
 * 專輯 API（Technical Spec API-010、API-012），掛喺 /api/albums，喺 api/routes.ts 嘅 session + same-origin 守門之後。
 * CR-007（Technical Spec「API 一覽嘅變化」）：唯讀。專輯由媒體 bucket 嘅資料夾同 info.txt 同步（T-105）；
 * 新增、修改、刪除、排序（API-011、013、014、015）取消，打過嚟 = 404
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { tracksOf } from '../tracks/rows';
import { albumError } from './errors';
import { albumOverview } from './overview';
import { checksOf, toAlbum } from './rows';
import { findAlbum } from './store';

export const albumRoutes = new Hono<AppEnv>();

albumRoutes.get('/', async (c) => c.json(await albumOverview(c.env.DB)));

albumRoutes.get('/:id', async (c) => {
    const row = await findAlbum(c.env.DB, c.req.param('id'));
    if (!row) return albumError(c, 'notFound');
    const tracks = await tracksOf(c.env.DB, row.id);
    return c.json({ ...toAlbum(row), checks: checksOf(row), tracks });
});
