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

interface Props {
    view: TrackColumnView | null;
    /** 顯示緊嘅碟（冇歌單欄時都有，例如揀咗歌） */
    albumId: string | null;
}

/* 設計稿第 19 版 ACTIONS.turn（B-086 ④）：快擰途中唔顯示歌單欄；旋鈕停喺一隻碟 settle 毫秒先出 */
describe('useSettledColumn', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const hook = (view: TrackColumnView | null, albumId = view?.albumId ?? null) =>
        renderHook(({ view: current, albumId: shown }: Props) => useSettledColumn(current, shown), {
            initialProps: { view, albumId },
        });

    it('should show the column straight away while the dial is closed', () => {
        const view = column('room', false);
        expect(hook(view).result.current).toBe(view);
        expect(hook(null, 'room').result.current).toBeNull();
    });

    // 揀咗歌嘅碟（冇歌單欄）打開字母盤：即刻出（設計稿 ACTIONS.wheel）
    it('should show the column straight away when the dial opens on the disc on screen', () => {
        const { result, rerender } = hook(null, 'room');
        const open = column('room', true);
        rerender({ view: open, albumId: 'room' });
        expect(result.current).toBe(open);
    });

    it('should hide the column while turning and show it once the dial rests on a disc', () => {
        const { result, rerender } = hook(column('room', true));
        ['apollo-18', 'hours', 'i'].forEach((albumId) => {
            rerender({ view: column(albumId, true), albumId });
            act(() => vi.advanceTimersByTime(columnSettleMs - 1));
            expect(result.current).toBeNull();
        });
        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toMatchObject({ albumId: 'i' });
    });

    it('should show the column at once when the dial is released before it settles', () => {
        const { result, rerender } = hook(column('room', true));
        rerender({ view: column('hours', true), albumId: 'hours' });
        expect(result.current).toBeNull();
        const released = column('hours', false);
        rerender({ view: released, albumId: 'hours' });
        expect(result.current).toBe(released);
    });
});
