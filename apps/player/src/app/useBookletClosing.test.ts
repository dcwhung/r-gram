import { act, renderHook } from '@testing-library/react';
import { MOTION } from '../config/motion';
import { useBookletClosing } from './useBookletClosing';

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

const renderClosing = (open: boolean) => {
    const toggle = vi.fn();
    const hook = renderHook((props: { open: boolean }) => useBookletClosing(props.open, toggle), {
        initialProps: { open },
    });
    return { toggle, ...hook };
};

/* T-072：收返歌書先行 0.24 秒動畫，完咗先轉場景狀態；期間鎖住 i 掣（Technical Spec「歌書過場」） */
describe('useBookletClosing', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stubReducedMotion(false);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should open straight away', () => {
        const { result, toggle } = renderClosing(false);
        act(() => result.current.press());
        expect(toggle).toHaveBeenCalledTimes(1);
        expect(result.current.closing).toBe(false);
    });

    it('should play the closing transition before closing, and ignore presses meanwhile', () => {
        const { result, toggle } = renderClosing(true);
        act(() => result.current.press());
        expect(result.current.closing).toBe(true);
        expect(toggle).not.toHaveBeenCalled();
        act(() => {
            result.current.press();
            result.current.close();
        });
        act(() => vi.advanceTimersByTime(MOTION.scene.bookletCloseMs - 1));
        expect(toggle).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(1));
        expect(toggle).toHaveBeenCalledTimes(1);
    });

    it('should close at once with reduced motion', () => {
        stubReducedMotion(true);
        const { result, toggle } = renderClosing(true);
        act(() => result.current.close());
        expect(toggle).toHaveBeenCalledTimes(1);
        expect(result.current.closing).toBe(false);
    });

    it('should do nothing on close while the booklet is shut', () => {
        const { result, toggle } = renderClosing(false);
        act(() => result.current.close());
        expect(toggle).not.toHaveBeenCalled();
    });

    // 收返途中開 MV：電視即刻取代歌書，唔好再收多次；之後再開歌書由頭嚟（唔係「收返緊」）
    it('should drop a pending close when the booklet goes away by itself', () => {
        const { result, toggle, rerender } = renderClosing(true);
        act(() => result.current.close());
        rerender({ open: false });
        act(() => vi.advanceTimersByTime(MOTION.scene.bookletCloseMs));
        expect(toggle).not.toHaveBeenCalled();
        rerender({ open: true });
        expect(result.current.closing).toBe(false);
    });
});
