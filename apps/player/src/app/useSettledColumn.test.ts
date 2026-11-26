import { act, renderHook } from '@testing-library/react';
import { MOTION } from '../config/motion';
import type { TrackColumnView } from './heldTracksView';
import { useSettledColumn } from './useSettledColumn';

const column = (albumId: string, dialOpen: boolean): TrackColumnView => ({
    albumId,
    accent: '#c8442b',
    rows: [],
    emptyText: '',
    dialOpen,
});

const { columnSettleMs } = MOTION.input;

/* 設計稿第 19 版 ACTIONS.turn（B-086 ④）：快擰途中唔顯示歌單欄；旋鈕停喺一隻碟 settle 毫秒先出 */
describe('useSettledColumn', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const hook = (initial: TrackColumnView | null) =>
        renderHook(({ view }) => useSettledColumn(view), { initialProps: { view: initial } });

    it('should show the column straight away while the dial is closed', () => {
        const view = column('room', false);
        expect(hook(view).result.current).toBe(view);
        expect(hook(null).result.current).toBeNull();
    });

    it('should show the column straight away when the dial opens on the same disc', () => {
        const { result, rerender } = hook(null);
        rerender({ view: column('room', false) });
        const open = column('room', true);
        rerender({ view: open });
        expect(result.current).toBe(open);
    });

    it('should hide the column while turning and show it once the dial rests on a disc', () => {
        const { result, rerender } = hook(column('room', true));
        ['apollo-18', 'hours', 'i'].forEach((albumId) => {
            rerender({ view: column(albumId, true) });
            act(() => vi.advanceTimersByTime(columnSettleMs - 1));
            expect(result.current).toBeNull();
        });
        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toMatchObject({ albumId: 'i' });
    });

    it('should show the column at once when the dial is released before it settles', () => {
        const { result, rerender } = hook(column('room', true));
        rerender({ view: column('hours', true) });
        expect(result.current).toBeNull();
        const released = column('hours', false);
        rerender({ view: released });
        expect(result.current).toBe(released);
    });
});
