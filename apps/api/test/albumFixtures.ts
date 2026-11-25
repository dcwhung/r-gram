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
    return call(path, init);
};

export const json = async <T = Record<string, unknown>>(response: Response): Promise<T> =>
    (await response.json()) as T;
