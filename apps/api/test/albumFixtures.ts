/* 專輯 API test 共用：直接寫 D1 嘅 fixture、帶 session + Origin 嘅請求 */
import { env } from 'cloudflare:test';
import { ORIGIN, call, loginCookie } from './helpers';

export const NOW = '2026-11-25T00:00:00.000Z';

const insert = (table: string, row: Record<string, unknown>) => {
    const names = Object.keys(row).map((name) => `"${name}"`);
    return env.DB.prepare(
        `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
    )
        .bind(...Object.values(row))
        .run();
};

export const insertAlbum = (id: string, sortOrder: number, extra: Record<string, unknown> = {}) =>
    insert('albums', {
        id,
        title: `Album ${id}`,
        wheel_key: 'A',
        accent: '#c8442b',
        sort_order: sortOrder,
        created_at: NOW,
        updated_at: NOW,
        ...extra,
    });

export const insertTrack = (
    id: string,
    albumId: string,
    no: number,
    extra: Record<string, unknown> = {},
) =>
    insert('tracks', {
        id,
        album_id: albumId,
        no,
        title: `Track ${id}`,
        created_at: NOW,
        updated_at: NOW,
        ...extra,
    });

export const insertLyrics = (trackId: string, synced = 1) =>
    insert('lyrics', {
        track_id: trackId,
        source: '[00:01.00]line',
        synced,
        json_name: `${trackId}.json`,
        line_count: 1,
        updated_at: NOW,
    });

export const insertAsset = (name: string) =>
    insert('assets', { name, content_type: 'image/webp', bytes: 1, created_at: NOW });

export const insertCatalogState = (row: Record<string, unknown>) =>
    insert('catalog_state', { id: 1, updated_at: NOW, updated_by: 'seed', ...row });

export const albumRow = (id: string) =>
    env.DB.prepare('SELECT * FROM albums WHERE id = ?').bind(id).first<Record<string, unknown>>();

export const countOf = (table: string) =>
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<number>('n');

/** 已登入、同站嘅請求；body 係 object 就轉 JSON，係字串就原樣送 */
export const api = async (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
    bindings = env,
): Promise<Response> => {
    const init: RequestInit = {
        method,
        headers: {
            cookie: await loginCookie(),
            origin: ORIGIN,
            'content-type': 'application/json',
            ...headers,
        },
    };
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    return call(path, init, bindings);
};

type Statement = Record<string, unknown>;
const RESULT_METHODS: readonly string[] = ['first', 'run', 'all', 'raw'];

/**
 * D1 嘅 wrapper：SQL 以 `prefix` 開頭嘅 statement 行完之後即刻行 `action`，
 * 模擬「另一個請求剛好喺兩句之間做咗嘢」（同時刪除等）
 */
export const dbWithHook = (prefix: string, action: () => Promise<unknown>): D1Database => {
    const wrap = (statement: Statement): Statement =>
        new Proxy(statement, {
            get(target, key: string) {
                const value = target[key] as (...args: unknown[]) => unknown;
                if (typeof value !== 'function') return value;
                if (key === 'bind')
                    return (...args: unknown[]) => wrap(value.apply(target, args) as Statement);
                if (!RESULT_METHODS.includes(key)) return value.bind(target);
                return async (...args: unknown[]) => {
                    const result = await value.apply(target, args);
                    await action();
                    return result;
                };
            },
        });
    return new Proxy(env.DB, {
        get(target, key: string) {
            const value = (target as unknown as Record<string, unknown>)[key];
            if (key !== 'prepare' || typeof value !== 'function')
                return typeof value === 'function' ? value.bind(target) : value;
            return (sql: string) => {
                const statement = target.prepare(sql) as unknown as Statement;
                return sql.trimStart().startsWith(prefix) ? wrap(statement) : statement;
            };
        },
    });
};

export const json = async <T = Record<string, unknown>>(response: Response): Promise<T> =>
    (await response.json()) as T;
