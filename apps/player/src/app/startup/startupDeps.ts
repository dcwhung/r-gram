import type { CatalogLoadResult } from '../../catalog/loader';
/** 未實作（TDD 紅燈） */
export interface StartupDeps {
    loadCatalog: () => Promise<CatalogLoadResult>;
    loadFonts: () => Promise<void>;
    loadImage: (url: string) => Promise<boolean>;
    random?: () => number;
}
export const createBrowserStartup = (): StartupDeps => ({
    loadCatalog: () => new Promise(() => {}),
    loadFonts: () => new Promise(() => {}),
    loadImage: () => new Promise(() => {}),
});
