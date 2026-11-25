import { fetchImage } from './fetchImage';

const IMAGE_URL = 'https://api.example/catalog/v1/img/komorebi-cover2.webp';

/*
 * B-071 ②：圖片 route 對播放端 origin 有 CORS header，用 cors 攞到嘅係普通回應，Service Worker 先肯 cache
 *（opaque 回應 Workbox 預設唔 cache）。B-072 ③：結果講明攞唔攞到。
 */
describe('fetchImage', () => {
    it('should ask for the image with CORS and report success when it arrives', async () => {
        const fetch = vi.fn(() => Promise.resolve(new Response('img', { status: 200 })));
        vi.stubGlobal('fetch', fetch);
        const controller = new AbortController();
        await expect(fetchImage(IMAGE_URL, controller.signal)).resolves.toBe(true);
        expect(fetch).toHaveBeenCalledWith(IMAGE_URL, { mode: 'cors', signal: controller.signal });
    });

    it('should report failure when the request fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.reject(new TypeError('offline'))),
        );
        await expect(fetchImage(IMAGE_URL)).resolves.toBe(false);
    });

    it('should report failure when the server answers with an error status', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(new Response('missing', { status: 404 }))),
        );
        await expect(fetchImage(IMAGE_URL)).resolves.toBe(false);
    });

    it('should report failure when the body breaks off', async () => {
        const broken = new Response('img', { status: 200 });
        vi.spyOn(broken, 'arrayBuffer').mockRejectedValue(new TypeError('reset'));
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(broken)),
        );
        await expect(fetchImage(IMAGE_URL)).resolves.toBe(false);
    });
});
