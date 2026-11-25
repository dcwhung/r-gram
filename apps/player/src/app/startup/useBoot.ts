import { useHome } from '../useHome';
import type { StartupDeps } from './startupDeps';
/** 未實作（TDD 紅燈） */
export const useBoot = (deps: StartupDeps) => ({
    home: useHome(null, deps.random),
    preload: { progress: -1, phase: '', exit: '', retry: () => {} },
});
