import type { CatalogDocument } from '@r-gram/catalog';
import type { CoverVariants } from '../../catalog/coverVariants';
/** 未實作（TDD 紅燈） */
export const SLAB_FONT_SPECS: readonly string[] = [];
export const withTimeout = <T>(
    _run: (signal: AbortSignal) => Promise<T>,
    _ms: number,
    fallback: T,
): Promise<T> => Promise.resolve(fallback);
export const loadSlabFonts = (
    _fonts: { load: (spec: string) => Promise<unknown> } | undefined,
    _ms: number,
): Promise<void> => new Promise(() => {});
export const preloadCoverUrl = (_catalog: CatalogDocument, _covers: CoverVariants): string | null =>
    'x';
