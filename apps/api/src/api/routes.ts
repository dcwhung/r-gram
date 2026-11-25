/*
 * /api/*：管理 API。註冊次序 = 守門次序：health 公開 → session → same-origin → 寫入後置步驟。
 * 新 route 一定要加喺 use('*') 之後（backlog B-019 ①）
 */
import { Hono } from 'hono';
import pkg from '../../package.json';
import { albumRoutes } from '../albums/routes';
import type { AppEnv } from '../app';
import { requireSameOrigin, requireSession } from '../auth/middleware';
import { afterWrite, noPostWrite } from './afterWrite';

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get('/health', (c) => c.json({ ok: true, version: pkg.version }));

apiRoutes.use('*', requireSession, requireSameOrigin);
// T-026：noPostWrite 換做 rebuildCatalog()
apiRoutes.use('*', afterWrite(noPostWrite));

apiRoutes.get('/me', (c) => c.json({ email: c.get('email') }));
apiRoutes.route('/albums', albumRoutes);
