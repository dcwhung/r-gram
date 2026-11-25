/*
 * 開 app 嘅載入狀態（純函數；Functional Spec US-001、FR-001；Technical Spec「性能考量：首次載入」）：
 *   內容資料（catalog）、當前專輯封面、字體三項並行；進度 = 已完成項目 ÷ 3。
 *   catalog 完全攞唔到（網絡同本機副本都冇）= failed：Preload 顯示錯誤同重試掣，重試只再載 catalog。
 * 封面要等 catalog 到先知係邊張，所以 catalog 未到之前嘅「封面完成」唔計。
 */
import type { CatalogDocument } from '@r-gram/catalog';
import type { CatalogLoadResult } from '../../catalog/loader';

export type CatalogStatus = 'loading' | 'ready' | 'unavailable';
export type StartupPhase = 'loading' | 'failed' | 'ready';

export interface StartupState {
    /** 第一次攞到嘅 catalog（網絡或者本機副本）；之後喺 Preload 期間唔換 */
    catalog: CatalogDocument | null;
    catalogStatus: CatalogStatus;
    coverDone: boolean;
    fontsDone: boolean;
    /** 第幾次載入 catalog（重試一次 + 1）：hook 用佢決定幾時再發請求 */
    attempt: number;
}

export type StartupAction =
    | { type: 'catalogLoaded'; result: CatalogLoadResult }
    | { type: 'coverSettled' }
    | { type: 'fontsSettled' }
    | { type: 'retry' };

/** 三項：catalog、封面、字體 */
const ITEM_COUNT = 3;

export const INITIAL_STARTUP: StartupState = {
    catalog: null,
    catalogStatus: 'loading',
    coverDone: false,
    fontsDone: false,
    attempt: 0,
};

/** 冇碟嘅 catalog 入唔到主頁：同攞唔到一樣處理（錯誤同重試） */
const catalogLoaded = (state: StartupState, result: CatalogLoadResult): StartupState => {
    if (state.catalogStatus !== 'loading') return state;
    if (result.status === 'unavailable' || result.document.albums.length === 0) {
        return { ...state, catalogStatus: 'unavailable' };
    }
    return { ...state, catalog: result.document, catalogStatus: 'ready' };
};

type Handlers = {
    [T in StartupAction['type']]: (
        state: StartupState,
        action: Extract<StartupAction, { type: T }>,
    ) => StartupState;
};

const HANDLERS: Handlers = {
    catalogLoaded: (state, { result }) => catalogLoaded(state, result),
    coverSettled: (state) =>
        state.catalogStatus === 'ready' && !state.coverDone ? { ...state, coverDone: true } : state,
    fontsSettled: (state) => (state.fontsDone ? state : { ...state, fontsDone: true }),
    retry: (state) =>
        state.catalogStatus === 'unavailable'
            ? { ...state, catalogStatus: 'loading', attempt: state.attempt + 1 }
            : state,
};

export const startupReducer = (state: StartupState, action: StartupAction): StartupState => {
    // 型別以外嘅動作原樣回傳（同 stageReducer 一樣用 hasOwn：`toString` 唔係 handler）
    if (!Object.hasOwn(HANDLERS, action.type)) return state;
    const handler = HANDLERS[action.type] as Handlers[StartupAction['type']];
    return handler(state, action as never);
};

const doneItems = (state: StartupState): number =>
    [state.catalogStatus === 'ready', state.coverDone, state.fontsDone].filter(Boolean).length;

/** 0–1 */
export const startupProgress = (state: StartupState): number => doneItems(state) / ITEM_COUNT;

export const startupPhase = (state: StartupState): StartupPhase => {
    if (state.catalogStatus === 'unavailable') return 'failed';
    return doneItems(state) === ITEM_COUNT ? 'ready' : 'loading';
};
