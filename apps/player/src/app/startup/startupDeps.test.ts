import { COVER_PRELOAD_TIMEOUT_MS, FONT_LOAD_TIMEOUT_MS } from '../../config/limits';
import { createBrowserStartup } from './startupDeps';

const IMAGE_URL = 'https://api.example/catalog/v1/img/komorebi-cover.webp';

/* 瀏覽器入面真正用嘅三項：catalog loader、document.fonts、fetchImage（cors，B-071 ②），各自有逾時 */
describe('createBrowserStartup', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        Reflect.deleteProperty(document, 'fonts');
    });

    it('should use the local copy rule of the loader when no catalog URL is set', async () => {
        // 測試環境冇 VITE_CATALOG_URL，本機亦冇副本
        await expect(createBrowserStartup().loadCatalog()).resolves.toEqual({
            status: 'unavailable',
            failure: 'notConfigured',
        });
    });

    it('should fetch the cover with CORS and give up after the cover timeout', async () => {
        const fetch = vi.fn((_url: string, init: RequestInit) => {
            return new Promise<Response>((_resolve, reject) =>
                init.signal?.addEventListener('abort', () => reject(new DOMException('abort'))),
            );
        });
        vi.stubGlobal('fetch', fetch);
        const done = vi.fn();
        void createBrowserStartup().loadImage(IMAGE_URL).then(done);
        expect(fetch).toHaveBeenCalledWith(IMAGE_URL, expect.objectContaining({ mode: 'cors' }));
        await vi.advanceTimersByTimeAsync(COVER_PRELOAD_TIMEOUT_MS);
        expect(done).toHaveBeenCalledWith(false);
    });

    it('should wait for the page fonts up to the font timeout', async () => {
        const load = vi.fn(() => new Promise<FontFace[]>(() => {}));
        Object.defineProperty(document, 'fonts', { configurable: true, value: { load } });
        const done = vi.fn();
        void createBrowserStartup().loadFonts().then(done);
        expect(load).toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(FONT_LOAD_TIMEOUT_MS);
        expect(done).toHaveBeenCalled();
    });
});
