import { COVER_VARIANT } from '../../catalog/coverVariants';
import {
    makeAlbum,
    makeDocument,
    sampleDocument,
    withSecondCover,
} from '../../catalog/testing/catalogFixtures';
import { loadSlabFonts, preloadCoverUrl, SLAB_FONT_SPECS, withTimeout } from './startupTasks';

const TIMEOUT_MS = 1000;
const never = <T>() => new Promise<T>(() => {});

describe('withTimeout', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should pass on the result when the work finishes in time', async () => {
        await expect(withTimeout(() => Promise.resolve('done'), TIMEOUT_MS, 'late')).resolves.toBe(
            'done',
        );
    });

    it('should give the fallback and abort the work when time runs out', async () => {
        let signal: AbortSignal | undefined;
        const result = withTimeout(
            (given) => {
                signal = given;
                return never<string>();
            },
            TIMEOUT_MS,
            'late',
        );
        await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
        await expect(result).resolves.toBe('late');
        expect(signal?.aborted).toBe(true);
    });

    it('should give the fallback when the work fails', async () => {
        await expect(
            withTimeout(() => Promise.reject(new Error('boom')), TIMEOUT_MS, 'late'),
        ).resolves.toBe('late');
    });
});

/* Functional Spec US-001、FR-041；CR-004：字體一項有逾時，bucket 字體失敗唔卡住 Preload */
describe('loadSlabFonts', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should wait for both slab faces', async () => {
        const load = vi.fn(() => Promise.resolve([]));
        await loadSlabFonts({ load }, TIMEOUT_MS);
        expect(load.mock.calls.map(([spec]) => spec)).toEqual([...SLAB_FONT_SPECS]);
    });

    it('should finish anyway when a face fails to load', async () => {
        const load = vi.fn(() => Promise.reject(new Error('CORS')));
        await expect(loadSlabFonts({ load }, TIMEOUT_MS)).resolves.toBeUndefined();
    });

    it('should stop waiting after the timeout', async () => {
        const done = vi.fn();
        void loadSlabFonts({ load: () => never() }, TIMEOUT_MS).then(done);
        await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
        expect(done).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(done).toHaveBeenCalled();
    });

    it('should finish at once without the Font Loading API', async () => {
        await expect(loadSlabFonts(undefined, TIMEOUT_MS)).resolves.toBeUndefined();
    });
});

/* CR-005 D56：Preload 預載嘅「當前專輯封面」= 第一隻碟今次開 app 揀中嗰張 */
describe('preloadCoverUrl', () => {
    const IMG = 'https://api.example/catalog/v1/img/';

    it('should give the picked cover of the first disc', () => {
        const catalog = makeDocument([withSecondCover(makeAlbum('komorebi', []))]);
        const second = new Map([['komorebi', COVER_VARIANT.SECOND]]);
        const first = new Map([['komorebi', COVER_VARIANT.FIRST]]);
        expect(preloadCoverUrl(catalog, second)).toBe(`${IMG}komorebi-cover2.webp`);
        expect(preloadCoverUrl(catalog, first)).toBe(`${IMG}komorebi-cover.webp`);
    });

    it('should give nothing when the first disc has no cover or there is no disc', () => {
        expect(preloadCoverUrl(sampleDocument(), new Map())).toBeNull();
        expect(preloadCoverUrl(makeDocument([]), new Map())).toBeNull();
    });
});
