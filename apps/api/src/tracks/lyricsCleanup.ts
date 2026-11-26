/*
 * 冇人用嘅歌詞 JSON 由 R2 刪走：歌詞改咗 / 清走 / 刪歌 / 刪專輯之後嘅舊檔，同寫入失敗（過時、歌冇咗）嗰次啱啱寫嘅檔。
 * 舊檔要等 catalog 生成成功先刪（review W-021）：route 用 dropLyricsLater() 記低，api/afterWrite.ts 喺
 * rebuildCatalog() 回 ok 之後行 dropReleasedLyrics()。生成失敗 = 播放端繼續用上一份 catalog.json，佢仲指住舊檔，
 * 所以留低；之後冇嘢會再刪佢哋（冇掃描）：檔名係內容 hash，冇人用嘅檔只係佔少少位，同一段歌詞再儲存會再用返。
 * 刪檔出錯只 log 錯誤名，唔影響已儲存嘅寫入。
 * 寫入失敗嗰次啱啱寫嘅檔從來冇入過 catalog，即刻刪。
 * 檔名係內容 hash，幾首歌可以共用一個檔，所以 D1 仲有任何一行用緊就留低。
 * 已知嘅窄位：另一首歌啱啱寫咗同一個檔、未寫 D1 嗰一刻，呢度會當冇人用刪走（要兩首歌同時存一模一樣嘅歌詞）；
 * 再儲存一次嗰首歌就會補返個檔
 */
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import type { Env } from '../env';
import { lyricsKey } from './songText';
import { usedLyricsFiles } from './store';

/**
 * T-105：確認刪幾張碟可以一次過放出幾千個檔，所以唔逐個檔查同刪（每個請求嘅操作有上限）：
 * D1 一句最多查 D1_PARAMS_MAX 個檔名，R2 一次最多刪 R2_DELETE_MAX 個 key
 */
const D1_PARAMS_MAX = 100;
const R2_DELETE_MAX = 1000;

const chunksOf = <T>(items: readonly T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
        items.slice(index * size, (index + 1) * size),
    );

export const dropUnusedLyrics = async (
    env: Pick<Env, 'DB' | 'CATALOG'>,
    names: readonly (string | null | undefined)[],
): Promise<void> => {
    const candidates = [...new Set(names)].filter((name): name is string => Boolean(name));
    const used = new Set<string>();
    for (const chunk of chunksOf(candidates, D1_PARAMS_MAX))
        (await usedLyricsFiles(env.DB, chunk)).forEach((name) => used.add(name));
    const unused = candidates.filter((name) => !used.has(name)).map(lyricsKey);
    for (const keys of chunksOf(unused, R2_DELETE_MAX)) await env.CATALOG.delete(keys);
};

type LyricsNames = readonly (string | null | undefined)[];

/** route：呢啲檔等 catalog 生成成功先刪 */
export const dropLyricsLater = (c: Context<AppEnv>, names: LyricsNames): void => {
    c.set('lyricsToDrop', [...(c.get('lyricsToDrop') ?? []), ...names]);
};

/** api/afterWrite.ts：catalog 生成成功之後行；R2 / D1 出錯只 log 錯誤名（唔寫檔名），檔留低 */
export const dropReleasedLyrics = async (c: Context<AppEnv>): Promise<void> => {
    const names = c.get('lyricsToDrop');
    if (!names) return;
    try {
        await dropUnusedLyrics(c.env, names);
    } catch (error) {
        const name = error instanceof Error ? error.name : typeof error;
        console.error('[lyrics] dropping unused files failed', name);
    }
};
