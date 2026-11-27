/*
 * 歌詞檔（Technical Spec API-072：`{ synced, lines }`；CR-003 D32）嘅檢查（純函數）。播放端只信形狀啱嘅檔：
 * - synced = true：每行 `{ t: 毫秒（≥ 0 嘅有限數）, text }`；Worker 已經排好序，萬一冇排就喺度排（穩定排序）
 * - synced = false：每行 `{ text }`；空白 = 分段
 * 形狀唔啱 = null（當攞唔到，歌書顯示「未能載入歌詞」）。文字原樣，唔翻譯、唔改。
 */
import type { LyricLine, LyricsJson, PlainLyricLine } from '@r-gram/catalog';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const timedLine = (value: unknown): LyricLine | null => {
    if (!isRecord(value) || typeof value.text !== 'string') return null;
    const { t } = value;
    return typeof t === 'number' && Number.isFinite(t) && t >= 0 ? { t, text: value.text } : null;
};

const plainLine = (value: unknown): PlainLyricLine | null =>
    isRecord(value) && typeof value.text === 'string' ? { text: value.text } : null;

/** 全部行都啱先收；有一行唔啱 = null */
const allOf = <T>(lines: unknown[], read: (value: unknown) => T | null): T[] | null => {
    const parsed = lines.map(read);
    return parsed.every((line) => line !== null) ? (parsed as T[]) : null;
};

export const parseLyricsJson = (value: unknown): LyricsJson | null => {
    if (!isRecord(value) || !Array.isArray(value.lines)) return null;
    if (value.synced === true) {
        const lines = allOf(value.lines, timedLine);
        return lines ? { synced: true, lines: [...lines].sort((a, b) => a.t - b.t) } : null;
    }
    if (value.synced === false) {
        const lines = allOf(value.lines, plainLine);
        return lines ? { synced: false, lines } : null;
    }
    return null;
};

/** 有冇字（全部空白 = 當冇歌詞） */
export const hasWords = (lyrics: LyricsJson): boolean =>
    lyrics.lines.some((line) => line.text.trim() !== '');
