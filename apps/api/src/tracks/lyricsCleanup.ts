/*
 * 冇人用嘅歌詞 JSON 由 R2 刪走：歌詞改咗 / 清走 / 刪歌之後嘅舊檔，同寫入失敗（過時、歌冇咗）嗰次啱啱寫嘅檔。
 * 檔名係內容 hash，幾首歌可以共用一個檔，所以 D1 仲有任何一行用緊就留低。
 * 已知嘅窄位：另一首歌啱啱寫咗同一個檔、未寫 D1 嗰一刻，呢度會當冇人用刪走（要兩首歌同時存一模一樣嘅歌詞）；
 * 再儲存一次嗰首歌就會補返個檔
 */
import type { Env } from '../env';
import { lyricsKey } from './songText';
import { isLyricsFileUsed } from './store';

export const dropUnusedLyrics = async (
    env: Pick<Env, 'DB' | 'CATALOG'>,
    names: readonly (string | null | undefined)[],
): Promise<void> => {
    const candidates = [...new Set(names)].filter((name): name is string => Boolean(name));
    for (const name of candidates) {
        if (!(await isLyricsFileUsed(env.DB, name))) await env.CATALOG.delete(lyricsKey(name));
    }
};
