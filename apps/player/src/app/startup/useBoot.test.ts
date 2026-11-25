import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import type { CatalogLoadResult } from '../../catalog/loader';
import { makeAlbum, makeDocument, withSecondCover } from '../../catalog/testing/catalogFixtures';
import { MOTION } from '../../config/motion';
import type { StartupDeps } from './startupDeps';
import { useBoot } from './useBoot';

const IMG = 'https://api.example/catalog/v1/img/';
const twoCovers = (): CatalogDocument =>
    makeDocument([withSecondCover(makeAlbum('komorebi', [])), makeAlbum('room', [])]);
const ready = (document: CatalogDocument): CatalogLoadResult => ({
    status: 'ready',
    source: 'network',
    document,
});

/** 由測試決定幾時完成嘅 promise */
const deferred = <T>() => {
    let resolve: (value: T) => void = () => {};
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

/** 三項嘅完成時間全部由測試控制 */
const controlledDeps = () => {
    const catalog = deferred<CatalogLoadResult>();
    const fonts = deferred<void>();
    const image = deferred<boolean>();
    const deps: StartupDeps = {
        loadCatalog: vi.fn(() => catalog.promise),
        loadFonts: vi.fn(() => fonts.promise),
        loadImage: vi.fn(() => image.promise),
        // 揀第二張封面
        random: () => 0.9,
    };
    return { deps, catalog, fonts, image };
};

/** 行晒排緊嘅 promise 同 effect（每一輪 effect 可能再排一個 promise 或者 0 毫秒計時器） */
const FLUSH_ROUNDS = 4;
const settle = async () => {
    for (let round = 0; round < FLUSH_ROUNDS; round += 1) {
        // fake timers 喺計時器入面再排嘅 0 毫秒計時器會當 1 毫秒
        await act(() => vi.advanceTimersByTimeAsync(1));
    }
};

describe('useBoot', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stubReducedMotion(true);
    });
    afterEach(() => vi.useRealTimers());

    it('should show real progress and open the first disc once all three items are done', async () => {
        const { deps, catalog, fonts, image } = controlledDeps();
        const { result } = renderHook(() => useBoot(deps));
        expect(result.current.preload.progress).toBe(0);
        await act(async () => fonts.resolve());
        expect(result.current.preload.progress).toBeCloseTo(1 / 3);
        await act(async () => catalog.resolve(ready(twoCovers())));
        expect(result.current.preload.progress).toBeCloseTo(2 / 3);
        // CR-005：預載嘅係第一隻碟今次開 app 揀中嗰張封面
        expect(deps.loadImage).toHaveBeenCalledWith(`${IMG}komorebi-cover2.webp`);
        expect(result.current.home.stage.scene).toBe('preload');
        await act(async () => image.resolve(true));
        await settle();
        expect(result.current.preload.progress).toBe(1);
        expect(result.current.home.stage.scene).toBe('home');
        expect(result.current.home.view?.coverUrl).toBe(`${IMG}komorebi-cover2.webp`);
        expect(result.current.preload.exit).toBe('gone');
    });

    // S-078：字體先完成，catalog 遲到都要離開 Preload
    it('should leave Preload when the catalog arrives after everything else', async () => {
        const { deps, catalog, fonts } = controlledDeps();
        const document = makeDocument([makeAlbum('room', [])]);
        const { result } = renderHook(() => useBoot(deps));
        await act(async () => fonts.resolve());
        await settle();
        expect(result.current.home.stage.scene).toBe('preload');
        await act(async () => catalog.resolve(ready(document)));
        await settle();
        // 冇封面：唔使預載，嗰項當完成
        expect(deps.loadImage).not.toHaveBeenCalled();
        expect(result.current.home.stage.scene).toBe('home');
    });

    it('should fail without a catalog and load it again on retry', async () => {
        const { deps, fonts } = controlledDeps();
        const loadCatalog = vi
            .fn<StartupDeps['loadCatalog']>()
            .mockResolvedValueOnce({ status: 'unavailable', failure: 'network' })
            .mockResolvedValueOnce(ready(makeDocument([makeAlbum('room', [])])));
        const { result } = renderHook(() => useBoot({ ...deps, loadCatalog }));
        await act(async () => fonts.resolve());
        await settle();
        expect(result.current.preload.phase).toBe('failed');
        act(() => result.current.preload.retry());
        await settle();
        expect(loadCatalog).toHaveBeenCalledTimes(2);
        expect(result.current.home.stage.scene).toBe('home');
    });
});

describe('useBoot leaving Preload with motion', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stubReducedMotion(false);
    });
    afterEach(() => vi.useRealTimers());

    // 設計稿 v16：進度到 100 之後停一停，成塊旗淡出，露出主頁
    it('should hold at 100, open the home scene under the fading flag, then remove the flag', async () => {
        const deps: StartupDeps = {
            loadCatalog: () => Promise.resolve(ready(makeDocument([makeAlbum('room', [])]))),
            loadFonts: () => Promise.resolve(),
            loadImage: () => Promise.resolve(true),
        };
        const { result } = renderHook(() => useBoot(deps));
        const { preloadStepMs, preloadHoldMs, flagFadeMs } = MOTION.scene;
        // 三項即刻完成（計時器由嗰一刻開始計）：淨係行 promise，唔郁時間
        for (let round = 0; round < FLUSH_ROUNDS; round += 1) await act(async () => {});
        expect(result.current.preload.progress).toBe(1);
        await act(() => vi.advanceTimersByTimeAsync(preloadStepMs + preloadHoldMs - 1));
        expect(result.current.home.stage.scene).toBe('preload');
        expect(result.current.preload.exit).toBe('shown');
        await act(() => vi.advanceTimersByTimeAsync(1));
        expect(result.current.home.stage.scene).toBe('home');
        expect(result.current.preload.exit).toBe('leaving');
        await act(() => vi.advanceTimersByTimeAsync(flagFadeMs));
        expect(result.current.preload.exit).toBe('gone');
    });
});
