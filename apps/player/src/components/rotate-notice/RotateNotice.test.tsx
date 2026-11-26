import { render, screen } from '@testing-library/react';
import { RotateNotice } from './RotateNotice';

describe('RotateNotice', () => {
    it('should ask in written Chinese to turn the device upright', () => {
        render(<RotateNotice />);
        expect(screen.getByRole('alert')).toHaveTextContent('請將裝置轉為直向');
    });

    it('should hide the decorative phone drawing from assistive technology', () => {
        const { container } = render(<RotateNotice />);
        const drawing = container.querySelector('svg');
        expect(drawing).toHaveAttribute('aria-hidden', 'true');
        expect(drawing).toHaveAttribute('focusable', 'false');
    });

    it('should give every stroke of the drawing an explicit colour', () => {
        const { container } = render(<RotateNotice />);
        const shapes = container.querySelectorAll('svg path, svg rect');
        expect(shapes.length).toBeGreaterThan(0);
        shapes.forEach((shape) => {
            expect(shape).toHaveAttribute('fill');
            expect(shape).toHaveAttribute('stroke');
        });
    });
});
