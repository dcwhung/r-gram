import type { CatalogDocument } from '@r-gram/catalog';
import { renderHook } from '@testing-library/react';
import { COVER_VARIANT } from './coverVariants';
import { makeAlbum, makeDocument, withSecondCover } from './testing/catalogFixtures';
import { useCoverVariants } from './useCoverVariants';

const catalogOf = (...ids: string[]): CatalogDocument =>
    makeDocument(ids.map((id) => withSecondCover(makeAlbum(id, []))));

/* Functional Spec D56：開 app 揀一次，開住期間唔變，唔記低 */
describe('useCoverVariants', () => {
    it('should have no picks before the catalog arrives', () => {
        const { result } = renderHook(() => useCoverVariants(null, () => 0.9));
        expect(result.current.size).toBe(0);
    });

    it('should pick once when the catalog arrives and keep the picks across renders', () => {
        const random = vi.fn(() => 0.9);
        const catalog = catalogOf('room');
        const { result, rerender } = renderHook(() => useCoverVariants(catalog, random));
        rerender();
        expect(result.current.get('room')).toBe(COVER_VARIANT.SECOND);
        expect(random).toHaveBeenCalledTimes(1);
    });

    it('should keep the picks when the catalog is refreshed and pick for new albums', () => {
        let random = () => 0.9;
        const { result, rerender } = renderHook(
            ({ catalog }) => useCoverVariants(catalog, () => random()),
            { initialProps: { catalog: catalogOf('room') } },
        );
        random = () => 0;
        rerender({ catalog: catalogOf('room', 'ni-dou') });
        expect(result.current.get('room')).toBe(COVER_VARIANT.SECOND);
        expect(result.current.get('ni-dou')).toBe(COVER_VARIANT.FIRST);
    });

    it('should not write the picks to local storage', () => {
        renderHook(() => useCoverVariants(catalogOf('room'), () => 0.9));
        expect(localStorage.length).toBe(0);
    });
});
