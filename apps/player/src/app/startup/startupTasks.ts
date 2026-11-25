/*
 * Preload 三項入面兩項嘅做法（catalog 係 catalog/loader）：字體、當前專輯封面。全部有逾時、永遠 resolve：
 * 任何一項失敗都唔會卡住 Preload（Functional Spec US-001、FR-041；CR-004：bucket 字體攞唔到用內建 Rokkitt）。
 */
import { type CatalogDocument, mediaUrl } from '@r-gram/catalog';
import { coverVariantOf, type CoverVariants } from '../../catalog/coverVariants';
import { albumArt, dialAlbums } from '../../catalog/selectors';

/**
 * 做 `run`，最多等 `ms`：超時就 abort 佢、回 `fallback`；`run` 失敗都係 `fallback`。
 * 唔理 `run` 識唔識聽 signal：時間一到就 resolve。
 */
export const withTimeout = <T>(
    run: (signal: AbortSignal) => Promise<T>,
    ms: number,
    fallback: T,
): Promise<T> => {
    const controller = new AbortController();
    return new Promise<T>((resolve) => {
        const timer = setTimeout(() => {
            controller.abort();
            resolve(fallback);
        }, ms);
        run(controller.signal)
            .catch(() => fallback)
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            });
    });
};

/** `document.fonts` 用到嘅部分 */
export interface FontLoader {
    load: (spec: string) => Promise<unknown>;
}

/** 兩個 slab family（styles/fonts.css）；`load()` 會跟 `src` 次序：本機 Lubalin → bucket 字體 → Rokkitt */
export const SLAB_FONT_SPECS = ['1em "RB Slab"', '1em "RB Slab Light"'] as const;

/** 等 slab 字體就緒（Technical Spec「字體」Preload 一行）；失敗或者逾時照樣完成，用當時用到嘅字 */
export const loadSlabFonts = async (fonts: FontLoader | undefined, ms: number): Promise<void> => {
    if (!fonts) return;
    const loadAll = () => Promise.all(SLAB_FONT_SPECS.map((spec) => fonts.load(spec)));
    await withTimeout(() => loadAll().then(() => undefined), ms, undefined);
};

/**
 * Preload 預載嘅「當前專輯封面」（CR-005 D56）：第一隻碟今次開 app 揀中嗰張大封面。
 * 第一隻碟 = 轉碟刻度上第一格（重開 app 回復上次嘅碟係播放記錄嘅任務）。冇封面 = null（嗰項當完成）
 */
export const preloadCoverUrl = (catalog: CatalogDocument, covers: CoverVariants): string | null => {
    const first = dialAlbums(catalog)[0];
    if (!first) return null;
    const { cover } = albumArt(first, coverVariantOf(covers, first.id));
    return cover ? mediaUrl(catalog.imageBase, cover) : null;
};
