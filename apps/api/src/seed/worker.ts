/*
 * 初始資料嘅一次性 Worker entry（T-027）：唔係 production 嘅 main（wrangler.toml 嘅 main 係 src/index.ts），
 * 唔會部署。scripts/seed.mjs 用 wrangler 喺本機開佢、叫一次、印出報告，用嘅 D1 / R2 同 `wrangler dev` 一樣
 */
import type { SeedDiscography } from '@r-gram/catalog';
import discography from '../../seed/discography.json';
import type { Env } from '../env';
import { seedAlbums } from './seedAlbums';

const { albums } = discography as unknown as SeedDiscography;

export default {
    fetch: async (_request: Request, env: Env): Promise<Response> =>
        Response.json(await seedAlbums(env, albums)),
};
