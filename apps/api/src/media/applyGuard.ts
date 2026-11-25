/*
 * API-031 逐項保護（review W-035）：一項出 exception（D1 / R2 暫時性錯誤等）唔可以令成個套用變 500——
 * 前面嘅項目已經寫咗，catalog 要照生成。出錯嗰項回 INTERNAL（通用書面語 message），其他項目照做。
 * log 只寫錯誤名：message / stack 可能帶 R2 key 或者內部細節（同 api/afterWrite.ts 一樣）
 */
import type { Env } from '../env';
import { dropUnusedLyrics } from '../tracks/lyricsCleanup';

const logItemFailure = (error: unknown): void => {
    const name = error instanceof Error ? error.name : typeof error;
    console.error('[scan] apply item failed', name);
};

/** 行 `run`；throw → log 錯誤名，回 `fallback` */
export const guardItem = async <T, F>(run: () => Promise<T>, fallback: F): Promise<T | F> => {
    try {
        return await run();
    } catch (error) {
        logItemFailure(error);
        return fallback;
    }
};

/**
 * 寫 D1 出 exception：啱啱寫嘅歌詞檔未入過 catalog，照收（D1 有任何一行用緊就留低），再拋出畀 guardItem
 */
export const dropLyricsOnThrow = async <T>(
    env: Pick<Env, 'DB' | 'CATALOG'>,
    name: string | undefined,
    write: () => Promise<T>,
): Promise<T> => {
    try {
        return await write();
    } catch (error) {
        await dropUnusedLyrics(env, [name]);
        throw error;
    }
};
