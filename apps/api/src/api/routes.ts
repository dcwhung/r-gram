/*
 * /api/*：管理 API。註冊次序 = 守門次序：health 公開 → session → same-origin → 寫入後置步驟。
 * 新 route 一定要加喺 use('*') 之後（backlog B-019 ①）
 */
import { Hono } from 'hono';
import pkg from '../../package.json';
import { albumRoutes } from '../albums/routes';
import type { AppEnv } from '../app';
import { assetRoutes } from '../assets/routes';
import { requireSameOrigin, requireSession } from '../auth/middleware';
import { catalogAdminRoutes, rebuildAfterWrite } from '../catalog/rebuildRoute';
import { albumTrackRoutes } from '../tracks/albumTrackRoutes';
import { trackRoutes } from '../tracks/routes';
import { scanRoutes } from '../media/routes';
import { afterWrite } from './afterWrite';

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get('/health', (c) => c.json({ ok: true, version: pkg.version }));

apiRoutes.use('*', requireSession, requireSameOrigin);
// 儲存即生效（T-026）：每個成功嘅寫入之後生成 catalog.json
apiRoutes.use('*', afterWrite(rebuildAfterWrite));

apiRoutes.get('/me', (c) => c.json({ email: c.get('email') }));
apiRoutes.route('/albums/:albumId/tracks', albumTrackRoutes);
apiRoutes.route('/albums/:albumId/scan', scanRoutes);
apiRoutes.route('/albums', albumRoutes);
apiRoutes.route('/tracks', trackRoutes);
apiRoutes.route('/assets', assetRoutes);
apiRoutes.route('/catalog', catalogAdminRoutes);
