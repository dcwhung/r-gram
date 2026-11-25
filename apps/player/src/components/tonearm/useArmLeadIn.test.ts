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
});
