import type { CatalogDocument } from '@r-gram/catalog';
import { useEffect, useMemo, useReducer } from 'react';
import type { CoverVariants } from '../../catalog/coverVariants';
import type { StartupDeps } from './startupDeps';
import {
    INITIAL_STARTUP,
    startupPhase,
    type StartupPhase,
    startupProgress,
    startupReducer,
} from './startupState';
import { preloadCoverUrl } from './startupTasks';

export interface Startup {
    catalog: CatalogDocument | null;
    phase: StartupPhase;
    /** 0–1 */
    progress: number;
    /** 冇 catalog 時再載一次 */
    retry: () => void;
    /** 封面一項做完（攞到、失敗、逾時、冇封面都係） */
    coverSettled: () => void;
}

/** 開始跑一件永遠 resolve 嘅工作；hook 拆走之後嘅結果唔要 */
const settleWith = <T>(work: () => Promise<T>, done: (value: T) => void) => {
    let live = true;
    void work().then((value) => {
        if (live) done(value);
    });
    return () => {
        live = false;
    };
};

/**
 * 開 app 載入（Functional Spec US-001、FR-001）：字體一開始就載；catalog 一開始載，重試再載。
 * 封面要等 catalog 同揀好嘅封面，由 useCoverPreload 做。
 */
export const useStartup = (deps: StartupDeps): Startup => {
    const [state, dispatch] = useReducer(startupReducer, INITIAL_STARTUP);
    const { catalogStatus, attempt } = state;
    useEffect(() => settleWith(deps.loadFonts, () => dispatch({ type: 'fontsSettled' })), [deps]);
    useEffect(() => {
        if (catalogStatus !== 'loading') return undefined;
        return settleWith(deps.loadCatalog, (result) =>
            dispatch({ type: 'catalogLoaded', result }),
        );
        // attempt：重試時（status 由 unavailable 變返 loading）再發請求
    }, [deps, catalogStatus, attempt]);
    // 固定嘅函數：useCoverPreload 嘅 effect 靠佢唔變先唔會重覆預載
    const actions = useMemo(
        () => ({
            retry: () => dispatch({ type: 'retry' }),
            coverSettled: () => dispatch({ type: 'coverSettled' }),
        }),
        [],
    );
    return {
        catalog: state.catalog,
        phase: startupPhase(state),
        progress: startupProgress(state),
        ...actions,
    };
};

/**
 * 預載當前專輯封面（CR-005 D56：第一隻碟今次開 app 揀中嗰張）。catalog 到咗先做；冇封面即刻當完成。
 */
export const useCoverPreload = (
    catalog: CatalogDocument | null,
    covers: CoverVariants,
    deps: StartupDeps,
    onSettled: () => void,
): void => {
    const url = catalog ? preloadCoverUrl(catalog, covers) : undefined;
    useEffect(() => {
        if (url === undefined) return undefined;
        return settleWith(() => (url ? deps.loadImage(url) : Promise.resolve(false)), onSettled);
    }, [url, deps, onSettled]);
};
