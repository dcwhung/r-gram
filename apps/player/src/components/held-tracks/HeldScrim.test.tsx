import { render } from '@testing-library/react';
import { fitStage } from '../../stage/fitStage';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { StageContext } from '../../stage/StageContext';
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
        const stops = [...(gradient?.querySelectorAll('stop') ?? [])].map((stop) => [
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

/* T-117（B-094）：半透明層喺貼底組，蓋埋螢幕頂同底嘅延伸；顏色同舞台底色一樣（連延伸） */
describe('HeldScrim bleed', () => {
    const FIT = fitStage(393, 852, { top: 59, bottom: 34 });
    const renderScrim = () =>
        render(
            <StageContext.Provider value={FIT}>
                <svg>
                    <HeldScrim layout={PHONE_LAYOUT} shown screws={[]} />
                </svg>
            </StageContext.Provider>,
        ).container;

    it('should cover the stage and the bleed, measured from the bottom-anchored group', () => {
        const container = renderScrim();
        const layer = container.querySelector('rect[mask]') as SVGRectElement;
        expect(Number(layer.getAttribute('y'))).toBeCloseTo(-FIT.extraUnits - FIT.bleedTop, 3);
        expect(Number(layer.getAttribute('height'))).toBeCloseTo(
            FIT.bleedTop + FIT.heightUnits + FIT.bleedBottom,
            3,
        );
        const mask = container.querySelector('mask') as SVGMaskElement;
        expect(mask.getAttribute('y')).toBe(layer.getAttribute('y'));
        expect(mask.getAttribute('height')).toBe(layer.getAttribute('height'));
    });

    it('should use the stage gradient laid out on the stage box in the group coordinates', () => {
        const container = renderScrim();
        const layer = container.querySelector('rect[mask]') as SVGRectElement;
        const id = /^url\(#(.+)\)$/.exec(layer.getAttribute('fill') ?? '')?.[1] ?? '';
        const gradient = container.querySelector(`radialGradient[id="${id}"]`);
        expect(gradient).toHaveAttribute('gradientUnits', 'userSpaceOnUse');
        expect(gradient?.getAttribute('gradientTransform')).toMatch(
            new RegExp(`^translate\\(0 -${Math.floor(FIT.extraUnits)}\\.\\d+\\) scale\\(1080 `),
        );
    });
});
