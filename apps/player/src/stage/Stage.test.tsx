import { act, render, screen } from '@testing-library/react';
import * as safeArea from './safeArea';
import { Stage } from './Stage';

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

/** 舞台嘅 CSS 變數設喺外框（T-117：外框連延伸，舞台喺入面） */
const frame = () => screen.getByTestId('stage-frame');
const unitOf = (element: HTMLElement) => Number.parseFloat(element.style.getPropertyValue('--u'));
const unitsOf = (name: string) => Number.parseFloat(frame().style.getPropertyValue(name));

describe('Stage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('should render its children', () => {
        setViewport(1080, 1920);
        render(<Stage>content</Stage>);
        expect(screen.getByTestId('stage')).toHaveTextContent('content');
    });

    it('should expose the unit and the extra height as CSS variables', () => {
        setViewport(393, 852);
        render(<Stage>content</Stage>);
        const stage = frame();
        expect(unitOf(stage)).toBeCloseTo(393 / 1080, 4);
        expect(Number.parseFloat(stage.style.getPropertyValue('--stage-extra'))).toBeCloseTo(
            852 / (393 / 1080) - 1920,
            1,
        );
    });

    it('should place the stage below the top safe-area inset', () => {
        setViewport(393, 852);
        vi.spyOn(safeArea, 'readSafeAreaInsets').mockReturnValue({ top: 59, bottom: 34 });
        render(<Stage>content</Stage>);
        const stage = frame();
        expect(stage.style.getPropertyValue('--stage-offset-y')).toBe('59.0000px');
        expect(Number.parseFloat(stage.style.getPropertyValue('--stage-extra'))).toBeCloseTo(
            (852 - 93) / (393 / 1080) - 1920,
            1,
        );
    });

    it('should centre the stage horizontally on a wider viewport', () => {
        setViewport(1440, 960);
        render(<Stage>content</Stage>);
        expect(frame().style.getPropertyValue('--stage-offset-x')).toBe('450.0000px');
    });

    it('should size itself from the design width and the fitted height', () => {
        setViewport(393, 852);
        render(<Stage>content</Stage>);
        const stage = frame();
        expect(stage.style.getPropertyValue('--stage-width-units')).toBe('1080');
        expect(Number.parseFloat(stage.style.getPropertyValue('--stage-height-units'))).toBeCloseTo(
            852 / (393 / 1080),
            1,
        );
    });

    it('should refit when the viewport changes', () => {
        setViewport(393, 852);
        render(<Stage>content</Stage>);
        act(() => {
            setViewport(430, 932);
            window.dispatchEvent(new Event('resize'));
        });
        expect(unitOf(frame())).toBeCloseTo(430 / 1080, 4);
    });

    it('should be reachable by assistive technology by default', () => {
        setViewport(393, 852);
        render(<Stage>content</Stage>);
        const stage = screen.getByTestId('stage');
        expect(stage).not.toHaveAttribute('aria-hidden');
        expect(stage).not.toHaveAttribute('inert');
    });

    it('should hide itself from assistive technology and focus while covered', () => {
        setViewport(852, 393);
        render(
            <Stage covered>
                <button type="button">inside</button>
            </Stage>,
        );
        const stage = screen.getByTestId('stage');
        expect(stage).toHaveAttribute('aria-hidden', 'true');
        expect(stage).toHaveAttribute('inert');
        expect(screen.queryByRole('button')).toBeNull();
    });
});

/* T-117（B-094）：外框由螢幕頂去到螢幕底，舞台喺入面（安全區）；延伸部分畫嘢但唔收㩒 */
describe('Stage bleed', () => {
    afterEach(() => vi.restoreAllMocks());

    const renderWithInsets = () => {
        setViewport(393, 852);
        vi.spyOn(safeArea, 'readSafeAreaInsets').mockReturnValue({ top: 59, bottom: 34 });
        return render(<Stage>content</Stage>);
    };

    it('should put the stage inside the frame', () => {
        renderWithInsets();
        expect(frame()).toContainElement(screen.getByTestId('stage'));
    });

    it('should expose the bleed above and below the stage in design units', () => {
        renderWithInsets();
        const unit = 393 / 1080;
        expect(unitsOf('--stage-bleed-top')).toBeCloseTo(59 / unit, 2);
        expect(unitsOf('--stage-bleed-bottom')).toBeCloseTo(34 / unit, 2);
    });

    it('should expose no bleed without safe-area insets', () => {
        setViewport(393, 852);
        render(<Stage>content</Stage>);
        expect(unitsOf('--stage-bleed-top')).toBe(0);
        expect(unitsOf('--stage-bleed-bottom')).toBe(0);
    });

    it('should guard both bleed bands so taps there reach nothing (as before T-117)', () => {
        renderWithInsets();
        const guards = frame().querySelectorAll('[data-part="stage-guard"]');
        expect(guards).toHaveLength(2);
        guards.forEach((guard) => {
            expect(guard).toHaveAttribute('aria-hidden', 'true');
            expect(guard).not.toHaveAttribute('tabindex');
            expect(guard).toBeEmptyDOMElement();
            expect(screen.getByTestId('stage')).not.toContainElement(guard as HTMLElement);
        });
    });
});
