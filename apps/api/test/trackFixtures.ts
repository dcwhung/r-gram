/* 歌曲 API test 共用：D1 / R2 讀取、常用請求 */
import { formatAlbumInfo } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { api, insertAlbum, insertTrack } from './albumFixtures';

export const LYRICS_PREFIX = 'catalog/v1/lyrics/';
export const LYRICS_NAME = /^[0-9a-f]{16}\.json$/;

export const trackRow = (id: string) =>
    env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(id).first<Record<string, unknown>>();

export const lyricsRow = (trackId: string) =>
    env.DB.prepare('SELECT * FROM lyrics WHERE track_id = ?')
        .bind(trackId)
        .first<Record<string, unknown>>();

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

const NUMBER_DIGITS = 2;

/**
 * T-106：歌曲文字框寫返媒體 bucket，所以 D1 嘅專輯要喺 bucket 有資料夾：照 D1 放 `info.txt`（碟名、年份、曲目）
 * 同每首歌一個音檔（同步之後內容不變）
 */
export const mirrorAlbumToMedia = async (albumId: string) => {
    const album = await env.DB.prepare('SELECT folder, title, year FROM albums WHERE id = ?')
        .bind(albumId)
        .first<{ folder: string; title: string; year: number | null }>();
    const { results } = await env.DB.prepare(
        'SELECT "no", title FROM tracks WHERE album_id = ? ORDER BY "no"',
    )
        .bind(albumId)
        .all<{ no: number; title: string }>();
    const folder = album?.folder ?? '';
    await env.MEDIA.put(
        `${folder}/info.txt`,
        formatAlbumInfo({
            title: album?.title ?? albumId,
            year: album?.year ?? null,
            tracks: results,
        }),
    );
    for (const { no } of results)
        await env.MEDIA.put(`${folder}/${String(no).padStart(NUMBER_DIGITS, '0')} 歌.m4a`, 'a');
};

/** 而家嗰首歌嘅歌曲文字檔嘅 ETag（冇 = null，新檔） */
const currentTextEtag = async (id: string): Promise<string | null> => {
    const key = await env.DB.prepare('SELECT text_key FROM tracks WHERE id = ?')
        .bind(id)
        .first<string | null>('text_key');
    return key ? ((await env.MEDIA.head(key))?.httpEtag ?? null) : null;
};

/** API-041：用而家個檔嘅版本儲存（測試唔係講版本衝突嗰陣用） */
export const saveSongText = async (id: string, text: string, query = '', bindings = env) =>
    api(
        'PUT',
        `/api/tracks/${id}/text${query}`,
        { text, etag: await currentTextEtag(id) },
        {},
        bindings,
    );
