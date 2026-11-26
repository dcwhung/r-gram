import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { HeldScrim } from './HeldScrim';

const { scrim } = PHONE_LAYOUT.heldTracks;

/* T-049 review W-044：半透明層（設計稿第 18 版 listScrim()：左邊 62% 實，直線淡到右邊 0） */
describe('HeldScrim', () => {
    it('should fade the stage colour from the scrim opacity at the left to nothing at the right', () => {
        const { container } = render(
            <svg>
                <HeldScrim layout={PHONE_LAYOUT} shown screws={[]} />
            </svg>,
        );
        const gradient = container.querySelector('linearGradient');
        expect(gradient).toHaveAttribute('x1', '0');
        expect(gradient).toHaveAttribute('x2', String(scrim.end));
        const stops = [...container.querySelectorAll('stop')].map((stop) => [
            Number(stop.getAttribute('offset')),
            Number(stop.getAttribute('stop-opacity')),
        ]);
        expect(stops).toEqual([
            [0, scrim.opacity],
            [scrim.solid / scrim.end, scrim.opacity],
            [1, 0],
        ]);
        expect(scrim.opacity).toBe(0.62);
    });
});
