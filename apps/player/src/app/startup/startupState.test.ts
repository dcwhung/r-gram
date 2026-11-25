import { makeDocument, sampleDocument } from '../../catalog/testing/catalogFixtures';
import type { CatalogLoadResult } from '../../catalog/loader';
import {
    INITIAL_STARTUP,
    startupPhase,
    startupProgress,
    startupReducer,
    type StartupAction,
    type StartupState,
} from './startupState';

const NETWORK: CatalogLoadResult = {
    status: 'ready',
    source: 'network',
    document: sampleDocument(),
};
const CACHED: CatalogLoadResult = {
    status: 'ready',
    source: 'cache',
    document: sampleDocument(),
    failure: 'timeout',
};
const UNAVAILABLE: CatalogLoadResult = { status: 'unavailable', failure: 'network' };

const run = (...actions: StartupAction[]): StartupState =>
    actions.reduce(startupReducer, INITIAL_STARTUP);

/*
 * Functional Spec US-001、FR-001；Technical Spec「性能考量：首次載入」：
 * 三項（內容資料、當前專輯封面、字體）並行，進度 = 已完成 ÷ 總數；內容資料完全攞唔到 = 錯誤同重試。
 */
describe('startupReducer', () => {
    it('should start loading with nothing done', () => {
        expect(startupProgress(INITIAL_STARTUP)).toBe(0);
        expect(startupPhase(INITIAL_STARTUP)).toBe('loading');
        expect(INITIAL_STARTUP.catalog).toBeNull();
    });

    it('should count each finished item as a third of the progress, in any order', () => {
        const fonts = run({ type: 'fontsSettled' });
        expect(startupProgress(fonts)).toBeCloseTo(1 / 3);
        const catalog = run({ type: 'fontsSettled' }, { type: 'catalogLoaded', result: NETWORK });
        expect(startupProgress(catalog)).toBeCloseTo(2 / 3);
        expect(catalog.catalog).toBe(NETWORK.document);
    });

    it('should be ready once the catalog, the cover and the fonts are all done', () => {
        const state = run(
            { type: 'catalogLoaded', result: NETWORK },
            { type: 'coverSettled' },
            { type: 'fontsSettled' },
        );
        expect(startupProgress(state)).toBe(1);
        expect(startupPhase(state)).toBe('ready');
    });

    // 本機上次嘅資料都算載入咗（US-001：用上次資料入主頁）
    it('should accept the local copy when the network failed', () => {
        const state = run({ type: 'catalogLoaded', result: CACHED });
        expect(state.catalog).toBe(CACHED.document);
        expect(startupPhase(state)).toBe('loading');
    });

    it('should not count the cover before the catalog has arrived', () => {
        expect(startupProgress(run({ type: 'coverSettled' }))).toBe(0);
    });

    it('should fail when there is no catalog at all and keep the fonts that finished', () => {
        const state = run({ type: 'fontsSettled' }, { type: 'catalogLoaded', result: UNAVAILABLE });
        expect(startupPhase(state)).toBe('failed');
        expect(startupProgress(state)).toBeCloseTo(1 / 3);
    });

    // 冇碟嘅 catalog 入唔到主頁：同攞唔到一樣，顯示錯誤同重試
    it('should fail when the catalog has no albums', () => {
        const empty: CatalogLoadResult = {
            status: 'ready',
            source: 'network',
            document: makeDocument([]),
        };
        expect(startupPhase(run({ type: 'catalogLoaded', result: empty }))).toBe('failed');
    });

    it('should load the catalog again on retry, and only after a failure', () => {
        const failed = run({ type: 'catalogLoaded', result: UNAVAILABLE });
        const retried = startupReducer(failed, { type: 'retry' });
        expect(startupPhase(retried)).toBe('loading');
        expect(retried.attempt).toBe(failed.attempt + 1);
        const loading = run({ type: 'fontsSettled' });
        expect(startupReducer(loading, { type: 'retry' })).toBe(loading);
    });

    // 開 app 只載入一次：之後再嚟嘅結果（例如 StrictMode 重覆嘅請求）唔改已有嘅 catalog
    it('should keep the first catalog that arrived', () => {
        const first = run({ type: 'catalogLoaded', result: NETWORK });
        expect(startupReducer(first, { type: 'catalogLoaded', result: CACHED })).toBe(first);
    });

    it('should ignore an action it does not know', () => {
        const unknown = { type: 'toString' } as unknown as StartupAction;
        expect(startupReducer(INITIAL_STARTUP, unknown)).toBe(INITIAL_STARTUP);
    });
});
