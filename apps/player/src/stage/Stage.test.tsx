import { act, render, screen } from '@testing-library/react';
import * as safeArea from './safeArea';
import { Stage } from './Stage';

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

const unitOf = (element: HTMLElement) => Number.parseFloat(element.style.getPropertyValue('--u'));

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
        const stage = screen.getByTestId('stage');
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
        const stage = screen.getByTestId('stage');
        expect(stage.style.getPropertyValue('--stage-offset-y')).toBe('59.0000px');
        expect(Number.parseFloat(stage.style.getPropertyValue('--stage-extra'))).toBeCloseTo(
            (852 - 93) / (393 / 1080) - 1920,
            1,
        );
    });

    it('should centre the stage horizontally on a wider viewport', () => {
        setViewport(1440, 960);
        render(<Stage>content</Stage>);
        expect(screen.getByTestId('stage').style.getPropertyValue('--stage-offset-x')).toBe(
            '450.0000px',
        );
    });

    it('should size itself from the design width and the fitted height', () => {
        setViewport(393, 852);
        render(<Stage>content</Stage>);
        const stage = screen.getByTestId('stage');
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
        expect(unitOf(screen.getByTestId('stage'))).toBeCloseTo(430 / 1080, 4);
    });
});
