/* /api/*：管理 API。註冊次序 = 守門次序：health 公開，之後嘅全部要過守門 */
import { Hono } from 'hono';
import pkg from '../../package.json';
import type { AppEnv } from '../app';

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get('/health', (c) => c.json({ ok: true, version: pkg.version }));
