import type { CatalogDocument } from '@r-gram/catalog';
import type { CatalogLoadResult } from '../../catalog/loader';
/** 未實作（TDD 紅燈） */
export interface StartupState {
    catalog: CatalogDocument | null;
    attempt: number;
}
export type StartupAction =
    | { type: 'catalogLoaded'; result: CatalogLoadResult }
    | { type: 'coverSettled' }
    | { type: 'fontsSettled' }
    | { type: 'retry' };
export const INITIAL_STARTUP: StartupState = { catalog: null, attempt: 0 };
export const startupReducer = (state: StartupState, _action: StartupAction): StartupState => state;
export const startupProgress = (_state: StartupState): number => -1;
export const startupPhase = (_state: StartupState): string => '';
