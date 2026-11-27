/*
 * 歌書開住時攞而家嗰首歌嘅歌詞（Technical Spec 數據流「歌詞」、API-072）：
 * - 冇歌詞檔（catalog `lyrics` 係 null）= none
 * - 攞緊（慢網絡）= loading：歌詞位留空
 * - 攞到 = ready；同一個 app session 再開唔再攞（記喺記憶體；Service Worker 亦有 CacheFirst）
 * - 攞唔到（網絡、HTTP、形狀、超時）= failed；唔記低，下次打開歌書再試
 * 歌書收埋、換咗歌：取消未完嘅請求，舊結果唔會蓋到新嗰首。
 */
import type { LyricsJson } from '@r-gram/catalog';
import { useEffect, useState } from 'react';
import { LYRICS_FETCH_TIMEOUT_MS } from '../config/limits';
import { loadLyrics } from './loadLyrics';

export type LyricsState =
    | { status: 'none' }
    | { status: 'loading' }
    | { status: 'ready'; lyrics: LyricsJson }
    | { status: 'failed' };

const NONE: LyricsState = { status: 'none' };
const LOADING: LyricsState = { status: 'loading' };
const FAILED: LyricsState = { status: 'failed' };

/** 攞到嘅歌詞（檔名係內容 hash：同一個網址內容唔會變） */
const loaded = new Map<string, LyricsState>();

export const useLyrics = (url: string | null): LyricsState => {
    const [result, setResult] = useState<{ url: string; state: LyricsState } | null>(null);
    useEffect(() => {
        if (!url || loaded.has(url)) return undefined;
        const controller = new AbortController();
        const deps = {
            fetch: (target: string, init: RequestInit) => globalThis.fetch(target, init),
            timeoutMs: LYRICS_FETCH_TIMEOUT_MS,
            signal: controller.signal,
        };
        void loadLyrics(url, deps).then((lyrics) => {
            if (controller.signal.aborted) return;
            const state: LyricsState = lyrics ? { status: 'ready', lyrics } : FAILED;
            if (lyrics) loaded.set(url, state);
            setResult({ url, state });
        });
        return () => controller.abort();
    }, [url]);
    if (!url) return NONE;
    return loaded.get(url) ?? (result?.url === url ? result.state : LOADING);
};
