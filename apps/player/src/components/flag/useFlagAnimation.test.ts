import { renderHook } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { flagSceneFor } from './flagScene';
import { useFlagAnimation } from './useFlagAnimation';

const scene = flagSceneFor(PHONE_LAYOUT.preload, 0);
const SCALE = 0.5;

/** 假嘅 2D context：只數 fillRect（每畫一格清一次畫面）同 setTransform */
const fakeContext = () => {
    const counts = { fillRect: 0, setTransform: [] as number[][] };
    const context = new Proxy(
        {},
        {
            get: (_target, name: string) => {
                if (name === 'createImageData') {
                    return (width: number, height: number) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                    });
                }
                if (name === 'setTransform') {
                    return (...args: number[]) => counts.setTransform.push(args);
                }
                return name === 'fillRect' ? () => (counts.fillRect += 1) : () => undefined;
            },
            set: () => true,
        },
    );
    return { context, counts };
};

/** 畫面嘅 canvas：淨係要 getContext（唔用真 element，免得同離屏 canvas 共用 spy） */
const canvasWith = (context: unknown) =>
    ({ getContext: () => context }) as unknown as HTMLCanvasElement;

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

/* Technical Spec「旗幟」：DPR 上限；減少動態效果畫一格靜止 */
describe('useFlagAnimation', () => {
    beforeEach(() => {
        // 離屏 canvas（布料、光暗圖）都用假 context
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
            () => fakeContext().context as CanvasRenderingContext2D,
        );
    });
    afterEach(() => vi.restoreAllMocks());

    it('should draw one still frame when reduced motion is requested', () => {
        stubReducedMotion(true);
        const frame = vi.fn(() => 1);
        vi.stubGlobal('requestAnimationFrame', frame);
        const { context, counts } = fakeContext();
        renderHook(() => useFlagAnimation({ current: canvasWith(context) }, scene, SCALE));
        expect(counts.fillRect).toBe(1);
        expect(frame).not.toHaveBeenCalled();
        expect(counts.setTransform).toEqual([[SCALE, 0, 0, SCALE, 0, 0]]);
    });

    it('should keep waving frame after frame and stop when it goes away', () => {
        stubReducedMotion(false);
        const callbacks: FrameRequestCallback[] = [];
        vi.stubGlobal(
            'requestAnimationFrame',
            vi.fn((callback: FrameRequestCallback) => callbacks.push(callback)),
        );
        const cancel = vi.fn();
        vi.stubGlobal('cancelAnimationFrame', cancel);
        const { context, counts } = fakeContext();
        const { unmount } = renderHook(() =>
            useFlagAnimation({ current: canvasWith(context) }, scene, SCALE),
        );
        callbacks.shift()?.(0);
        callbacks.shift()?.(16);
        expect(counts.fillRect).toBe(2);
        unmount();
        expect(cancel).toHaveBeenCalled();
    });

    it('should do nothing without a 2D context', () => {
        stubReducedMotion(true);
        const frame = vi.fn();
        vi.stubGlobal('requestAnimationFrame', frame);
        renderHook(() => useFlagAnimation({ current: canvasWith(null) }, scene, SCALE));
        renderHook(() => useFlagAnimation({ current: null }, scene, SCALE));
        expect(frame).not.toHaveBeenCalled();
    });
});
