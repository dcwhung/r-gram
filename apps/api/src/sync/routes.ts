/*
 * 同步 API（T-105；Technical Spec API-033、API-034、API-035），掛喺 /api/sync，喺 api/routes.ts 嘅
 * session + same-origin 守門之後。API-034、035 係寫入：有寫到嘢先由 api/afterWrite.ts 生成 catalog。
 * 取代 API-030、031（一張碟預覽、逐項揀、套用）
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { syncOverview } from './overview';
import { removalsRoute } from './removals';
import { syncFolderRoute } from './syncFolder';

export const syncRoutes = new Hono<AppEnv>();

syncRoutes.get('/', syncOverview);
syncRoutes.post('/folders/:folder', syncFolderRoute);
syncRoutes.post('/removals', removalsRoute);
