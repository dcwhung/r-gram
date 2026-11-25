import { act, render, screen } from '@testing-library/react';
import { Stage } from './Stage';

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

const unitOf = (element: HTMLElement) => Number.parseFloat(element.style.getPropertyValue('--u'));

describe('Stage', () => {
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
