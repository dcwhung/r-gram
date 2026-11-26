import { act, renderHook } from '@testing-library/react';
import { MOTION } from '../../config/motion';
import type { ArmPose } from './armPose';
import { useArmLeadIn } from './useArmLeadIn';

const { tonearmMs, needleDropMs } = MOTION.scene;

const mockReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

const renderLeadIn = (initial: ArmPose) =>
    renderHook(({ pose }: { pose: ArmPose }) => useArmLeadIn(pose), {
        initialProps: { pose: initial },
    });

describe('useArmLeadIn', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should swing for the tonearm time, then drop for the needle time, then finish', () => {
        mockReducedMotion(false);
        const { result, rerender } = renderLeadIn('parked');
        expect(result.current).toBeNull();
        rerender({ pose: 'playing' });
        expect(result.current).toBe('swing');
        act(() => vi.advanceTimersByTime(tonearmMs - 1));
        expect(result.current).toBe('swing');
        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toBe('drop');
        act(() => vi.advanceTimersByTime(needleDropMs));
        expect(result.current).toBeNull();
    });

    it('should not lead in when resuming from the lifted pose or when first shown playing', () => {
        mockReducedMotion(false);
        const { result, rerender } = renderLeadIn('playing');
        expect(result.current).toBeNull();
        rerender({ pose: 'lifted' });
        rerender({ pose: 'playing' });
        expect(result.current).toBeNull();
    });

    it('should drop the lead-in when the pose changes half way', () => {
        mockReducedMotion(false);
        const { result, rerender } = renderLeadIn('parked');
        rerender({ pose: 'playing' });
        rerender({ pose: 'parked' });
        expect(result.current).toBeNull();
        act(() => vi.advanceTimersByTime(tonearmMs + needleDropMs));
        expect(result.current).toBeNull();
    });

    it('should go straight to the end state when the user asks for reduced motion', () => {
        mockReducedMotion(true);
        const { result, rerender } = renderLeadIn('parked');
        rerender({ pose: 'playing' });
        expect(result.current).toBeNull();
    });

    // S-072：轉入途中暫停再播，唱臂仲轉緊：小燈同碟照樣要等唱針放低（FR-040）
    it('should keep swinging when paused and played again during the swing', () => {
        mockReducedMotion(false);
        const early = tonearmMs / 4;
        const { result, rerender } = renderLeadIn('parked');
        rerender({ pose: 'playing' });
        act(() => vi.advanceTimersByTime(early));
        rerender({ pose: 'lifted' });
        rerender({ pose: 'playing' });
        expect(result.current).toBe('swing');
        act(() => vi.advanceTimersByTime(tonearmMs - early - 1));
        expect(result.current).toBe('swing');
        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toBe('drop');
        act(() => vi.advanceTimersByTime(needleDropMs));
        expect(result.current).toBeNull();
    });

    // 暫停住等轉入完：唱針唔可以自己放低；之後繼續就係一般嘅繼續（冇開場）
    it('should not drop the needle while paused when the swing ends', () => {
        mockReducedMotion(false);
        const { result, rerender } = renderLeadIn('parked');
        rerender({ pose: 'playing' });
        rerender({ pose: 'lifted' });
        act(() => vi.advanceTimersByTime(tonearmMs + needleDropMs));
        expect(result.current).not.toBe('drop');
        rerender({ pose: 'playing' });
        expect(result.current).toBeNull();
    });
});

/* T-036：唱臂淡出咗（揀碟期間）時姿勢變咗：即時到位，唔行開場（設計稿 swapAlbum、data-arm-instant；FR-040） */
describe('useArmLeadIn while the arm is out of sight', () => {
    it('should not lead in when the pose changes while the arm is hidden', () => {
        mockReducedMotion(false);
        const { result, rerender } = renderHook(
            ({ pose, instant }: { pose: ArmPose; instant: boolean }) => useArmLeadIn(pose, instant),
            { initialProps: { pose: 'parked' as ArmPose, instant: true } },
        );
        rerender({ pose: 'playing', instant: true });
        expect(result.current).toBeNull();
        rerender({ pose: 'playing', instant: false });
        expect(result.current).toBeNull();
    });
});
