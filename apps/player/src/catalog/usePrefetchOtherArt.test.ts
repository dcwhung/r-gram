import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import { COVER_VARIANT, type CoverVariants } from './coverVariants';
import { makeAlbum, makeDocument, withSecondCover } from './testing/catalogFixtures';
import { usePrefetchOtherArt } from './usePrefetchOtherArt';

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

/** 攞到 = true；攞唔到 = false（B-072 ③） */
const fetched = () => vi.fn((_url: string) => Promise.resolve(true));

/* Functional Spec FR-042：兩張封面都入離線 cache；Technical Spec：idle 時順手攞另一張，只限睇過嘅專輯 */
describe('usePrefetchOtherArt', () => {
    it('should fetch the cover and thumbnail that are not shown once the browser is idle', () => {
        const prefetch = fetched();
        renderHook(() =>
            usePrefetchOtherArt(catalog, 'komorebi', picks, { prefetch, onIdle: immediate }),
        );
        expect(prefetch.mock.calls.map(([url]) => url)).toEqual([
            `${IMG}komorebi-cover2.webp`,
            `${IMG}komorebi-thumb2.webp`,
        ]);
    });

    it('should fetch nothing for an album with a single cover or no album on screen', () => {
        const prefetch = fetched();
        const { rerender } = renderHook(
            ({ albumId }) =>
                usePrefetchOtherArt(catalog, albumId, picks, { prefetch, onIdle: immediate }),
            { initialProps: { albumId: 'room' as string | null } },
        );
        rerender({ albumId: null });
        expect(prefetch).not.toHaveBeenCalled();
    });

    it('should fetch the other cover of an album only once', () => {
        const prefetch = fetched();
        const { rerender } = renderHook(
            ({ albumId }) =>
                usePrefetchOtherArt(catalog, albumId, picks, { prefetch, onIdle: immediate }),
            { initialProps: { albumId: 'komorebi' } },
        );
        rerender({ albumId: 'room' });
        rerender({ albumId: 'komorebi' });
        expect(prefetch).toHaveBeenCalledTimes(2);
    });

    // B-072 ③：失敗（離線、網絡差）唔記做已攞：今次開 app 再睇呢隻碟會再試
    it('should try again when the earlier fetch of the other cover failed', async () => {
        const prefetch = vi.fn((_url: string) => Promise.resolve(false));
        const { rerender } = renderHook(
            ({ albumId }) =>
                usePrefetchOtherArt(catalog, albumId, picks, { prefetch, onIdle: immediate }),
            { initialProps: { albumId: 'komorebi' } },
        );
        await act(() => Promise.resolve());
        rerender({ albumId: 'room' });
        rerender({ albumId: 'komorebi' });
        expect(prefetch).toHaveBeenCalledTimes(4);
    });

    it('should not ask again for an image that is still on its way', () => {
        const prefetch = vi.fn((_url: string) => new Promise<boolean>(() => {}));
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
        const prefetch = fetched();
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
