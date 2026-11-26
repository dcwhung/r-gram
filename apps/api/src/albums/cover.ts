/*
 * API-017 PUT /api/albums/:id/cover（T-106；Technical Spec API-017；Functional Spec D74、D55；backlog B-052 ①、B-067 ②）：
 * 同步嘅封面結果。管理端由公開 bucket 攞 coverJobs 嘅來源圖、裁好、經 API-050 上載 1200 同 320 兩張，再叫呢度。
 * 次序：body（400）→ 專輯（404）→ 來源要係呢張碟資料夾第一層、同個位（cover / cover2）嘅檔（400 sourceKey）→
 * 兩張圖：已上載（assets + R2）、cover 1200²、thumb 320²（調亂 = 400 WRONG_SIZE）→ 第二張要有第一張（409 NO_FIRST_COVER）→
 * MEDIA.head(sourceKey) 嘅 ETag = sourceEtag（唔同或者冇咗 = 409 STALE）→ 寫 D1（第二張加 `cover IS NOT NULL` 條件，
 * 唔會撞 D1 CHECK 變 500）→ 生成 catalog（api/afterWrite.ts）。唔讀寫媒體 bucket 嘅內容（只 head）
 */
import { checkOf, classifyFile, type Check, type CheckCode, type CoverKind } from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { formatOfImageName, imageKeyOf } from '../assets/imageName';
import { COVER_SIDE_PX, THUMB_SIDE_PX } from '../config';
import type { Env } from '../env';
import { BODY_PATH, type FieldIssue } from '../lib/fields';
import { readJsonObject } from '../lib/http';
import { isDirectChild } from '../media/listing';
import { withCheckMessages } from '../sync/checkMessages';
import { readCoverBody, type CoverBody } from './coverBody';
import { storeCover } from './coverStore';
import { albumError, albumValidationError, type AlbumReason } from './errors';
import { checksOf, toAlbum } from './rows';
import { findAlbum } from './store';

type ImageField = 'cover' | 'thumb';

const SIDES: Readonly<Record<ImageField, number>> = { cover: COVER_SIDE_PX, thumb: THUMB_SIDE_PX };

const isSourceOf = (folder: string, slot: CoverKind, key: string): boolean =>
    isDirectChild(key, folder) && classifyFile(key).kind === slot;

const registered = async (db: D1Database, names: readonly string[]): Promise<Set<string>> => {
    const { results } = await db
        .prepare('SELECT name FROM assets WHERE name IN (?, ?)')
        .bind(...names)
        .all<{ name: string }>();
    return new Set(results.map(({ name }) => name));
};

/** 圖嘅邊長（正方形先算）；冇呢張圖 = undefined；讀唔到結構 = 0 */
const sideOf = async (bucket: R2Bucket, name: string): Promise<number | undefined> => {
    const object = await bucket.get(imageKeyOf(name));
    const format = formatOfImageName(name);
    if (!object || !format) return undefined;
    try {
        const { width, height } = format.parse(new Uint8Array(await object.arrayBuffer()));
        return width === height ? width : 0;
    } catch {
        return 0;
    }
};

const imageIssues = async (env: Env, body: CoverBody): Promise<FieldIssue<AlbumReason>[]> => {
    const known = await registered(env.DB, [body.cover, body.thumb]);
    const fields: ImageField[] = ['cover', 'thumb'];
    const sides = await Promise.all(fields.map((field) => sideOf(env.CATALOG, body[field])));
    return fields.flatMap((field, index): FieldIssue<AlbumReason>[] => {
        const side = sides[index];
        if (side === undefined || !known.has(body[field]))
            return [{ path: field, reason: 'IMAGE_NOT_FOUND' }];
        return side === SIDES[field] ? [] : [{ path: field, reason: 'WRONG_SIZE' }];
    });
};

/** 封面處理嘅結果（由管理端話畀 Worker 知）：呢個來源嘅舊結果換成今次嘅，其他檢查結果照留 */
const RESULT_CODES: ReadonlySet<CheckCode> = new Set<CheckCode>([
    'COVER_NOT_SQUARE',
    'COVER_FAILED',
]);

const coverChecks = (stored: readonly Check[], body: CoverBody): Check[] => {
    const others = stored.filter(
        ({ key, code }) => key !== body.sourceKey || !RESULT_CODES.has(code),
    );
    if (!body.notSquare) return others;
    return [...others, checkOf('COVER_NOT_SQUARE', { key: body.sourceKey })];
};

const isCurrentSource = async (bucket: R2Bucket, body: CoverBody): Promise<boolean> =>
    (await bucket.head(body.sourceKey))?.httpEtag === body.sourceEtag;

const checkedBody = async (c: Context<AppEnv>): Promise<CoverBody | Response> => {
    const raw = await readJsonObject(c);
    if (!raw) return albumValidationError(c, [{ path: BODY_PATH, reason: 'NOT_AN_OBJECT' }]);
    const read = readCoverBody(raw);
    return 'issues' in read ? albumValidationError(c, read.issues) : read.body;
};

export const putAlbumCover = async (c: Context<AppEnv>) => {
    const body = await checkedBody(c);
    if (body instanceof Response) return body;
    const album = await findAlbum(c.env.DB, c.req.param('id') ?? '');
    if (!album) return albumError(c, 'notFound');
    if (!isSourceOf(album.folder, body.slot, body.sourceKey))
        return albumValidationError(c, [{ path: 'sourceKey', reason: 'INVALID_VALUE' }]);
    const issues = await imageIssues(c.env, body);
    if (issues.length > 0) return albumValidationError(c, issues);
    if (body.slot === 'cover2' && album.cover === null) return albumError(c, 'noFirstCover');
    if (!(await isCurrentSource(c.env.MEDIA, body))) return albumError(c, 'stale');
    const checks = coverChecks(checksOf(album), body);
    const row = await storeCover(c.env.DB, album, body, checks);
    if (!row) return albumError(c, body.slot === 'cover2' ? 'noFirstCover' : 'notFound');
    return c.json({ album: toAlbum(row), checks: withCheckMessages(checksOf(row)) });
};
