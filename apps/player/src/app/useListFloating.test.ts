import { act, renderHook } from '@testing-library/react';
import { PHONE_LAYOUT } from '../stage/layouts';
import { listFloatTotalMs } from '../components/arc-list/arcFloat';
import type { ArcListView } from './listView';
import { useListFloating } from './useListFloating';

const list = (fromColumn: boolean): ArcListView => ({
    albumId: 'room',
    accent: '#c8442b',
    rows: [],
    focusIndex: 0,
    emptyText: '',
    fromColumn,
});

/* 設計稿第 19 版 openListFloating()：由歌單欄開弧線歌單先飄；過場完就停（之後重畫唔再播）；減少動態效果冇 */
describe('useListFloating', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });
    const hook = () =>
        renderHook(({ view }) => useListFloating(view, PHONE_LAYOUT), {
            initialProps: { view: null as ArcListView | null },
        });

    it('should float while the list opened from the column is arriving', () => {
        const { result, rerender } = hook();
        expect(result.current).toBe(false);
        rerender({ view: list(true) });
        expect(result.current).toBe(true);
        act(() => vi.advanceTimersByTime(listFloatTotalMs(PHONE_LAYOUT)));
        expect(result.current).toBe(false);
    });

    it('should not float when the list opens on the loaded disc', () => {
        const { result, rerender } = hook();
        rerender({ view: list(false) });
        expect(result.current).toBe(false);
    });

    it('should not float when motion is reduced', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: true })),
        );
        const { result, rerender } = hook();
        rerender({ view: list(true) });
        expect(result.current).toBe(false);
    });
});
