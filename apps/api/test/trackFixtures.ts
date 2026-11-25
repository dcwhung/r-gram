/* 歌曲 API test 共用：D1 / R2 讀取、常用請求 */
import { env } from 'cloudflare:test';
import { NOW, api, insertAlbum, insertTrack, json } from './albumFixtures';

export const LYRICS_PREFIX = 'catalog/v1/lyrics/';
export const LYRICS_NAME = /^[0-9a-f]{16}\.json$/;

export interface ErrorBody {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>[];
    };
}

export const trackRow = (id: string) =>
    env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(id).first<Record<string, unknown>>();

export const lyricsRow = (trackId: string) =>
    env.DB.prepare('SELECT * FROM lyrics WHERE track_id = ?')
        .bind(trackId)
        .first<Record<string, unknown>>();

export const numbersOf = async (albumId: string) =>
    (
        await env.DB.prepare('SELECT id, "no" FROM tracks WHERE album_id = ? ORDER BY "no"')
            .bind(albumId)
            .all<{ id: string; no: number }>()
    ).results.map((row) => `${row.no}:${row.id}`);

/** R2 入面嘅歌詞檔名（唔連 prefix） */
export const lyricsFiles = async () =>
    (await env.CATALOG.list({ prefix: LYRICS_PREFIX })).objects
        .map((object) => object.key.slice(LYRICS_PREFIX.length))
        .sort();

export const lyricsFile = async (name: string) =>
    (await env.CATALOG.get(`${LYRICS_PREFIX}${name}`))?.json<Record<string, unknown>>();

/** 一張碟、三首歌（歌號 1–3） */
export const seedAlbum = async () => {
    await insertAlbum('apollo-18', 1);
    await insertTrack('apollo-18-01', 'apollo-18', 1, { title: '一早地下鐵' });
    await insertTrack('apollo-18-02', 'apollo-18', 2, { title: '小涼伴' });
    await insertTrack('apollo-18-03', 'apollo-18', 3, { title: '睡前' });
};

export const ifMatch = (updatedAt: string = NOW) => ({ 'if-match': `"${updatedAt}"` });

export const putText = (id: string, text: unknown, updatedAt: string = NOW, query = '') =>
    api('PUT', `/api/tracks/${id}/text${query}`, { text }, ifMatch(updatedAt));

export const getText = async (id: string) =>
    json<{ trackId: string; text: string; updatedAt: string }>(
        await api('GET', `/api/tracks/${id}/text`),
    );

export const createTrack = (albumId: string, body: unknown) =>
    api('POST', `/api/albums/${albumId}/tracks`, body);

export const detailsOf = async (response: Response) =>
    (await json<ErrorBody>(response)).error.details ?? [];
