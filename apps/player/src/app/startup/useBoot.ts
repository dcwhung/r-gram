import type { MvController } from '../../mv/mvController';
import type { PlaybackController } from '../../playback/playbackController';
import { type Home, useHome } from '../useHome';
import type { StartupDeps } from './startupDeps';
import type { StartupPhase } from './startupState';
import { usePreloadExit, type PreloadExit } from './usePreloadExit';
import { useCoverPreload, useStartup } from './useStartup';

export interface PreloadStatus {
    phase: StartupPhase;
    /** 0–1 */
    progress: number;
    exit: PreloadExit;
    retry: () => void;
}

export interface Boot {
    home: Home;
    preload: PreloadStatus;
}

/**
 * 開 app（T-034）：Preload 載入三項 → 主頁。
 * 封面喺 catalog 第一次到嗰陣由 useHome 揀一次（CR-005 D56，`pickCoverVariants()`，只放記憶體）；
 * Preload 預載嘅就係第一隻碟揀中嗰張，所以主頁一出就有圖。
 */
export const useBoot = (
    deps: StartupDeps,
    playback: PlaybackController,
    mv?: MvController,
): Boot => {
    const startup = useStartup(deps);
    const home = useHome(startup.catalog, playback, deps.random, undefined, mv);
    useCoverPreload(startup.catalog, home.covers, deps, startup.coverSettled);
    const exit = usePreloadExit(startup.phase === 'ready', home.finishPreload);
    const { phase, progress, retry } = startup;
    return { home, preload: { phase, progress, exit, retry } };
};
