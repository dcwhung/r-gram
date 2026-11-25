/*
 * 測試用嘅細 catalog：砌出嚟嘅文件一定過到 `parseCatalogDocument()`。
 * Base 網址用 `https://`（backlog B-001：validator 只收 https，測試唔放寬；網絡一律用 fetch stub）。
 */
import {
    CATALOG_VERSION,
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
} from '@r-gram/catalog';

export const FIXTURE_CATALOG_URL = 'https://api.example/catalog/v1/catalog.json';
const FIXTURE_ACCENT = '#c8442b';

export const makeTrack = (albumId: string, no: number, audio: string | null): CatalogTrack => ({
    id: `${albumId}-${String(no).padStart(2, '0')}`,
    no,
    title: `${albumId} ${no}`,
    subtitle: null,
    credits: null,
    audio,
    mv: null,
    lyrics: null,
});

/** `audio` 逐首歌：有值 = 有音檔，null = 冇（灰色行） */
export const makeAlbum = (id: string, audio: readonly (string | null)[]): CatalogAlbum => ({
    id,
    title: id.toUpperCase(),
    wheelKey: id.charAt(0).toUpperCase(),
    releaseDate: null,
    year: null,
    type: '',
    label: '',
    accent: FIXTURE_ACCENT,
    cover: null,
    thumb: null,
    tracks: audio.map((key, index) => makeTrack(id, index + 1, key)),
});

export const makeDocument = (
    albums: readonly CatalogAlbum[],
    generatedAt = '2026-11-25T00:00:00.000Z',
): CatalogDocument => ({
    version: CATALOG_VERSION,
    generatedAt,
    mediaBase: 'https://media.example/',
    imageBase: 'https://api.example/catalog/v1/img/',
    lyricsBase: 'https://api.example/catalog/v1/lyrics/',
    albums: [...albums],
});

/** 兩隻碟：`apollo-18` 第 2 首冇音檔；`room` 全部有 */
export const sampleDocument = (generatedAt?: string): CatalogDocument =>
    makeDocument(
        [
            makeAlbum('apollo-18', ['apollo-18/01.m4a', null, 'apollo-18/03.m4a']),
            makeAlbum('room', ['room/01.m4a']),
        ],
        generatedAt,
    );

/** 一個 `Response`：body 係 JSON（或者原樣嘅字串），可以加 header */
export const jsonResponse = (
    body: unknown,
    init: { status?: number; headers?: Record<string, string> } = {},
): Response =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...init.headers },
    });

/** 記憶體版 storage（`getItem` / `setItem`），可以叫佢 throw 模擬私隱模式 / 爆 quota */
export const memoryStorage = (initial: Record<string, string> = {}) => {
    const items = new Map(Object.entries(initial));
    return {
        items,
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => {
            items.set(key, value);
        },
    };
};
