import { act, render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Stage } from '../../stage/Stage';
import { FlagCanvas } from './FlagCanvas';
import { createFlagGl } from './flagGl';

vi.mock('./flagGl', () => ({ createFlagGl: vi.fn() }));

/** 2D context：乜都收（jsdom 冇 canvas） */
const anyContext = () =>
    new Proxy(
        {},
        {
            get: (_target, name: string) =>
                name === 'createImageData'
                    ? (width: number, height: number) => ({
                          data: new Uint8ClampedArray(width * height * 4),
                      })
                    : () => undefined,
            set: () => true,
        },
    );

/* Technical Spec「CR-010 → Preload 旗幟用 WebGL」：context lost → 靜止一格（一塊新 2D canvas） */
describe('FlagCanvas', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: false })),
        );
        vi.stubGlobal('requestAnimationFrame', vi.fn());
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        vi.mocked(createFlagGl).mockReturnValue({
            draw: vi.fn(),
            setLogo: vi.fn(),
            dispose: vi.fn(),
        });
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should swap in a fresh canvas with a still 2D frame when the WebGL context is lost', () => {
        const getContext = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockImplementation(function (this: HTMLCanvasElement, type: string) {
                return (type === '2d' ? anyContext() : { fake: 'webgl' }) as RenderingContext;
            });
        const { container } = render(
            <Stage>
                <FlagCanvas preload={PHONE_LAYOUT.preload} />
            </Stage>,
        );
        const waving = container.querySelector('canvas');
        expect(waving).toHaveClass('preload-flag');
        act(() => {
            waving?.dispatchEvent(new Event('webglcontextlost'));
        });
        const still = container.querySelector('canvas');
        expect(still).not.toBe(waving);
        expect(still).toHaveClass('preload-flag');
        expect(still).toHaveAttribute('aria-hidden', 'true');
        const onStill = getContext.mock.calls.filter(
            (_call, index) => getContext.mock.contexts[index] === still,
        );
        expect(onStill.map(([type]) => type)).toEqual(['2d']);
    });
});
