import type { CatalogDocument } from '@r-gram/catalog';
import { renderHook } from '@testing-library/react';
import { COVER_VARIANT, type CoverVariants } from './coverVariants';
import { makeAlbum, makeDocument, withSecondCover } from './testing/catalogFixtures';
import { prefetchImage, usePrefetchOtherArt } from './usePrefetchOtherArt';

const IMG = 'https://api.example/catalog/v1/img/';
const catalog: CatalogDocument = makeDocument([
    withSecondCover(makeAlbum('komorebi', [])),
    { ...makeAlbum('room', []), cover: 'room.webp', thumb: 'room-t.webp' },
]);
const picks: CoverVariants = new Map([['komorebi', COVER_VARIANT.FIRST]]);

/** 即刻行 idle callback（測試唔使等瀏覽器有空） */
const immediate = (callback: () => void) => {
    callback();
    return () => {};
};

/* Functional Spec FR-042：兩張封面都入離線 cache；Technical Spec：idle 時順手攞另一張，只限睇過嘅專輯 */
describe('usePrefetchOtherArt', () => {
    it('should fetch the cover and thumbnail that are not shown once the browser is idle', () => {
        const prefetch = vi.fn();
        renderHook(() =>
            usePrefetchOtherArt(catalog, 'komorebi', picks, { prefetch, onIdle: immediate }),
        );
        expect(prefetch.mock.calls.map(([url]) => url)).toEqual([
            `${IMG}komorebi-cover2.webp`,
            `${IMG}komorebi-thumb2.webp`,
        ]);
    });

    it('should fetch nothing for an album with a single cover or no album on screen', () => {
        const prefetch = vi.fn();
        const { rerender } = renderHook(
            ({ albumId }) =>
                usePrefetchOtherArt(catalog, albumId, picks, { prefetch, onIdle: immediate }),
            { initialProps: { albumId: 'room' as string | null } },
        );
        rerender({ albumId: null });
        expect(prefetch).not.toHaveBeenCalled();
    });

    it('should fetch the other cover of an album only once', () => {
        const prefetch = vi.fn();
        const { rerender } = renderHook(
            ({ albumId }) =>
                usePrefetchOtherArt(catalog, albumId, picks, { prefetch, onIdle: immediate }),
            { initialProps: { albumId: 'komorebi' } },
        );
        rerender({ albumId: 'room' });
        rerender({ albumId: 'komorebi' });
        expect(prefetch).toHaveBeenCalledTimes(2);
    });

    it('should cancel the idle fetch when the disc changes first', () => {
        const prefetch = vi.fn();
        const cancel = vi.fn();
        const { rerender } = renderHook(
            ({ albumId }) =>
                usePrefetchOtherArt(catalog, albumId, picks, { prefetch, onIdle: () => cancel }),
            { initialProps: { albumId: 'komorebi' } },
        );
        rerender({ albumId: 'room' });
        expect(cancel).toHaveBeenCalled();
        expect(prefetch).not.toHaveBeenCalled();
    });
});

describe('prefetchImage', () => {
    it('should ask for the image without CORS and ignore a failed request', async () => {
        const fetch = vi.fn(() => Promise.reject(new TypeError('offline')));
        vi.stubGlobal('fetch', fetch);
        prefetchImage(`${IMG}komorebi-cover2.webp`);
        await Promise.resolve();
        expect(fetch).toHaveBeenCalledWith(`${IMG}komorebi-cover2.webp`, { mode: 'no-cors' });
    });
});
