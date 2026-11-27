/*
 * 攞一首歌嘅歌詞檔（Technical Spec API-072、數據流「歌詞」）：GET → JSON → parseLyricsJson()。
 * 永遠唔 reject：網絡錯、HTTP 錯、讀到一半斷咗、形狀唔啱、超時、被 abort 一律 null（歌書顯示「未能載入歌詞」）。
 * 用 cors（同圖片一樣，backlog B-071 ②）：Worker 對播放端 origin 回 CORS header，Service Worker 先 cache 得（CacheFirst）。
 * IO 由外面注入（fetch、超時），可以直接 unit test。
 */
import type { LyricsJson } from '@r-gram/catalog';
import { parseLyricsJson } from './lyricsJson';

export type LyricsFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface LyricsLoadDeps {
    fetch: LyricsFetch;
    /** 請求連讀 body 嘅上限 */
    timeoutMs: number;
    /** 外面唔再要（歌書收埋、換咗歌） */
    signal?: AbortSignal;
}

const read = async (response: Response): Promise<LyricsJson | null> =>
    response.ok ? parseLyricsJson(await response.json()) : null;

export const loadLyrics = async (url: string, deps: LyricsLoadDeps): Promise<LyricsJson | null> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, deps.timeoutMs);
    deps.signal?.addEventListener('abort', abort);
    try {
        return await read(await deps.fetch(url, { mode: 'cors', signal: controller.signal }));
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
        deps.signal?.removeEventListener('abort', abort);
    }
};
