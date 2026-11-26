import { act, renderHook } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { createFlagGl, type FlagGl } from './flagGl';
import { flagSceneFor } from './flagScene';
import { useFlagAnimation } from './useFlagAnimation';

vi.mock('./flagGl', () => ({ createFlagGl: vi.fn() }));

const scene = flagSceneFor(PHONE_LAYOUT.preload, 0);
const SCALE = 0.5;
const FAKE_GL = { fake: 'webgl' };

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

/** 畫面嘅 canvas：`webgl` 同 `2d` 各自畀乜（唔用真 element，免得同離屏 canvas 共用 spy） */
const canvasWith = ({ gl = null as unknown, twoD = null as unknown }) => {
    const target = new EventTarget();
    const getContext = vi.fn((type: string) => (type === '2d' ? twoD : gl));
    return Object.assign(target, { getContext }) as unknown as HTMLCanvasElement & {
        getContext: typeof getContext;
    };
};

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

const stubFrames = () => {
    const callbacks: FrameRequestCallback[] = [];
    const request = vi.fn((callback: FrameRequestCallback) => callbacks.push(callback));
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', request);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    return { callbacks, request, cancel };
};

const fakeRenderer = (): FlagGl => ({ draw: vi.fn(), setLogo: vi.fn(), dispose: vi.fn() });

/* Technical Spec「CR-010 → Preload 旗幟用 WebGL」、「旗幟」：WebGL → 2D 靜止一格；減少動態效果畫一格靜止 */
describe('useFlagAnimation', () => {
    beforeEach(() => {
        // 離屏 canvas（布料、光暗圖）都用假 2D context
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
            () => fakeContext().context as CanvasRenderingContext2D,
        );
        vi.mocked(createFlagGl).mockReset();
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should wave with WebGL frame after frame and clean everything up when it goes away', () => {
        stubReducedMotion(false);
        const { callbacks, cancel } = stubFrames();
        const renderer = fakeRenderer();
        vi.mocked(createFlagGl).mockReturnValue(renderer);
        const canvas = canvasWith({ gl: FAKE_GL });
        const { result, unmount } = renderHook(() =>
            useFlagAnimation({ current: canvas }, scene, SCALE),
        );
        expect(createFlagGl).toHaveBeenCalledWith(FAKE_GL, scene, SCALE, expect.any(Function));
        callbacks.shift()?.(100);
        callbacks.shift()?.(116);
        expect(vi.mocked(renderer.draw).mock.calls).toEqual([[0], [16]]);
        expect(canvas.getContext).not.toHaveBeenCalledWith('2d');
        expect(result.current).toBe('live');
        unmount();
        expect(cancel).toHaveBeenCalled();
        expect(renderer.dispose).toHaveBeenCalled();
    });

    it('should draw one still 2D frame without any loop when WebGL is not available', () => {
        stubReducedMotion(false);
        const { request } = stubFrames();
        const { context, counts } = fakeContext();
        const canvas = canvasWith({ twoD: context });
        renderHook(() => useFlagAnimation({ current: canvas }, scene, SCALE));
        expect(counts.fillRect).toBe(1);
        expect(counts.setTransform).toEqual([[SCALE, 0, 0, SCALE, 0, 0]]);
        expect(request).not.toHaveBeenCalled();
        expect(createFlagGl).not.toHaveBeenCalled();
    });

    it('should ask for a fresh canvas and a still frame when the WebGL renderer cannot start', () => {
        stubReducedMotion(false);
        const { request } = stubFrames();
        vi.mocked(createFlagGl).mockImplementation(() => {
            throw new Error('Flag shader does not compile');
        });
        const ref = { current: canvasWith({ gl: FAKE_GL }) };
        const { result } = renderHook(() => useFlagAnimation(ref, scene, SCALE));
        expect(result.current).toBe('still');
        expect(request).not.toHaveBeenCalled();
    });

    it('should stop waving and turn still when the WebGL context is lost', () => {
        stubReducedMotion(false);
        const { cancel } = stubFrames();
        const renderer = fakeRenderer();
        vi.mocked(createFlagGl).mockReturnValue(renderer);
        const ref = { current: canvasWith({ gl: FAKE_GL }) };
        const { result } = renderHook(() => useFlagAnimation(ref, scene, SCALE));
        const lost = ref.current;
        // FlagCanvas 用 mode 做 key：失去 context 之後換一塊新 canvas（2D）
        const { context, counts } = fakeContext();
        ref.current = canvasWith({ twoD: context });
        act(() => {
            lost.dispatchEvent(new Event('webglcontextlost'));
        });
        expect(cancel).toHaveBeenCalled();
        expect(renderer.dispose).toHaveBeenCalled();
        expect(result.current).toBe('still');
        expect(counts.fillRect).toBe(1);
    });

    it('should draw one still frame and never try WebGL when reduced motion is requested', () => {
        stubReducedMotion(true);
        const { request } = stubFrames();
        const { context, counts } = fakeContext();
        const canvas = canvasWith({ gl: FAKE_GL, twoD: context });
        const { result } = renderHook(() => useFlagAnimation({ current: canvas }, scene, SCALE));
        expect(result.current).toBe('still');
        expect(counts.fillRect).toBe(1);
        expect(canvas.getContext).not.toHaveBeenCalledWith('webgl', expect.anything());
        expect(request).not.toHaveBeenCalled();
    });

    it('should do nothing without a canvas or any context', () => {
        stubReducedMotion(true);
        const { request } = stubFrames();
        renderHook(() => useFlagAnimation({ current: canvasWith({}) }, scene, SCALE));
        renderHook(() => useFlagAnimation({ current: null }, scene, SCALE));
        expect(request).not.toHaveBeenCalled();
    });
});
