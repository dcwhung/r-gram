/*
 * 掃描 API（T-025；Technical Spec API-030、API-031），掛喺 /api/albums/:albumId/scan，
 * 喺 api/routes.ts 嘅 session + same-origin 守門之後。套用係寫入：成功之後生成 catalog 係 api/afterWrite.ts 嘅後置步驟
 */
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { scanApply } from './scanApply';
import { scanPreview } from './scanPreview';

export const scanRoutes = new Hono<AppEnv>();

const albumIdOf = (c: Context) => c.req.param('albumId') ?? '';

scanRoutes.get('/', (c) => scanPreview(c, albumIdOf(c)));
scanRoutes.post('/apply', (c) => scanApply(c, albumIdOf(c)));
