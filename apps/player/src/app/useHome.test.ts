import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import { sampleDocument, withSecondCover } from '../catalog/testing/catalogFixtures';
import { useHome } from './useHome';

/** `apollo-18` 第 1 首有 MV */
const catalogWithMv = (): CatalogDocument => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

const press = (home: { current: ReturnType<typeof useHome> }, name: 'onSpindle' | 'onMv') =>
    act(() => home.current.handlers?.[name]());

describe('useHome', () => {
    // S-073：電視開住時唱片夾喺電視後面（T-060）：就算有人叫到 onSpindle 都唔反應
    it('should ignore the clamp while the MV is open', () => {
        const { result } = renderHook(() => useHome(catalogWithMv()));
        press(result, 'onSpindle');
        press(result, 'onSpindle');
        press(result, 'onMv');
        const before = { stage: result.current.stage, playback: result.current.playback };
        press(result, 'onSpindle');
        expect(result.current.stage).toBe(before.stage);
        expect(result.current.playback).toBe(before.playback);
        expect(result.current.view?.mvOpen).toBe(true);
    });
});

/* Review S-078：catalog 遲過 Preload 開始先到，都要離開得 Preload（T-034） */
describe('useHome finishPreload', () => {
    it('should open the first disc when Preload finishes after a late catalog', () => {
        const { result, rerender } = renderHook(({ catalog }) => useHome(catalog), {
            initialProps: { catalog: null as CatalogDocument | null },
        });
        expect(result.current.stage.scene).toBe('preload');
        rerender({ catalog: sampleDocument() });
        expect(result.current.stage.scene).toBe('preload');
        act(() => result.current.finishPreload());
        expect(result.current.stage.scene).toBe('home');
        expect(result.current.stage.viewAlbumId).toBe('apollo-18');
    });

    it('should stay on Preload when there is still no catalog', () => {
        const { result } = renderHook(() => useHome(null));
        act(() => result.current.finishPreload());
        expect(result.current.stage.scene).toBe('preload');
    });
});

/* CR-005 D56：主頁用開 app 時揀中嘅封面；catalog 更新都唔變 */
describe('useHome cover pick', () => {
    const catalogWithTwoCovers = (): CatalogDocument => {
        const document = sampleDocument();
        document.albums = document.albums.map(withSecondCover);
        return document;
    };

    it('should show the cover picked when the app started, even after a catalog refresh', () => {
        let random = () => 0.9;
        const { result, rerender } = renderHook(({ catalog }) => useHome(catalog, () => random()), {
            initialProps: { catalog: catalogWithTwoCovers() },
        });
        random = () => 0;
        rerender({ catalog: catalogWithTwoCovers() });
        expect(result.current.view?.coverUrl).toBe(
            'https://api.example/catalog/v1/img/apollo-18-cover2.webp',
        );
    });
});

/* T-036：擰旋鈕揀碟、♥（Functional Spec US-003、US-013；D27：留喺揀咗嗰隻碟） */
describe('useHome turning the knob', () => {
    const turn = (home: { current: ReturnType<typeof useHome> }, position?: number) => ({
        start: () => act(() => home.current.handlers?.onTurnStart()),
        to: () => act(() => home.current.handlers?.onTurn(position ?? 0)),
        end: () => act(() => home.current.handlers?.onTurnEnd()),
    });

    it('should open the dial, follow the knob and stay on the chosen disc when released', () => {
        const { result } = renderHook(() => useHome(sampleDocument()));
        turn(result).start();
        expect(result.current.stage.scene).toBe('discChange');
        turn(result, 1).to();
        expect(result.current.stage.viewAlbumId).toBe('room');
        expect(result.current.view?.dial.current).toBe(1);
        turn(result).end();
        expect(result.current.stage).toMatchObject({ scene: 'home', viewAlbumId: 'room' });
    });

    it('should go to the Favourites disc at the ♥ position', () => {
        const { result } = renderHook(() => useHome(sampleDocument()));
        turn(result).start();
        turn(result, 2).to();
        expect(result.current.stage.viewAlbumId).toBe('favourites');
    });

    it('should ignore a position outside the dial', () => {
        const { result } = renderHook(() => useHome(sampleDocument()));
        turn(result).start();
        const before = result.current.stage;
        turn(result, 9).to();
        expect(result.current.stage).toBe(before);
    });

    it('should go to the Favourites disc and back with ♥', () => {
        const { result } = renderHook(() => useHome(sampleDocument()));
        act(() => result.current.handlers?.onFavourites());
        expect(result.current.stage.viewAlbumId).toBe('favourites');
        act(() => result.current.handlers?.onFavourites());
        expect(result.current.stage.viewAlbumId).toBe('apollo-18');
    });
});
