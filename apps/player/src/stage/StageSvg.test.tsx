import { render } from '@testing-library/react';
import { DEF } from '../components/metal/defIds';
import { fitStage } from './fitStage';
import { StageContext } from './StageContext';
import { StageSvg } from './StageSvg';

/** iPhone 15 主畫面 App：393 × 852，安全區頂 59、底 34 */
const FIT = fitStage(393, 852, { top: 59, bottom: 34 });

const renderSvg = (fit = FIT) => {
    const { container } = render(
        <StageContext.Provider value={fit}>
            <StageSvg top={<g data-part="top-group" />} bottom={<g data-part="bottom-group" />} />
        </StageContext.Provider>,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;
    const numbers = (value: string | null) => (value ?? '').split(/[\s,]+/).map(Number);
    return { svg, numbers };
};

/* T-117（B-094）：舞台嘅 SVG 畫到螢幕最頂最底；安全區入面嘅座標同畫面不變 */
describe('StageSvg bleed', () => {
    it('should widen its view box over the bleed above and below the stage', () => {
        const { svg, numbers } = renderSvg();
        const [x, y, width, height] = numbers(svg.getAttribute('viewBox'));
        expect(x).toBe(0);
        expect(width).toBe(1080);
        expect(y).toBeCloseTo(-FIT.bleedTop, 3);
        expect(height).toBeCloseTo(FIT.bleedTop + FIT.heightUnits + FIT.bleedBottom, 3);
    });

    it('should paint the stage background from the top of the screen to the bottom', () => {
        const { svg } = renderSvg();
        const background = svg.querySelector(':scope > rect') as SVGRectElement;
        expect(background).toHaveAttribute('fill', `url(#${DEF.stage})`);
        expect(Number(background.getAttribute('y'))).toBeCloseTo(-FIT.bleedTop, 3);
        expect(Number(background.getAttribute('height'))).toBeCloseTo(
            FIT.bleedTop + FIT.heightUnits + FIT.bleedBottom,
            3,
        );
    });

    /* 漸層要同以前（objectBoundingBox = 舞台）一模一樣：安全區入面像素不變，延伸部分自然接落去 */
    it('should keep the stage gradient laid out on the stage box, not on the bleed', () => {
        const { svg, numbers } = renderSvg();
        const gradient = svg.querySelector(`radialGradient#${DEF.stage}`) as SVGElement;
        expect(gradient).toHaveAttribute('gradientUnits', 'userSpaceOnUse');
        expect(gradient).toHaveAttribute('cx', '0.3');
        expect(gradient).toHaveAttribute('cy', '0.12');
        expect(gradient).toHaveAttribute('r', '1.1');
        const transform = gradient.getAttribute('gradientTransform') ?? '';
        const [, , scaleX, scaleY] = numbers(transform.replace(/[a-z()]/g, ' ').trim());
        expect(transform).toMatch(/^translate\(0 0\) scale\(/);
        expect(scaleX).toBe(1080);
        expect(scaleY).toBeCloseTo(FIT.heightUnits, 3);
    });

    it('should leave the anchored groups where they were', () => {
        const { svg } = renderSvg();
        const bottom = svg.querySelector('[data-anchor="bottom"]');
        expect(bottom).toHaveAttribute('transform', `translate(0 ${FIT.extraUnits})`);
        expect(svg.querySelector('[data-anchor="top"]')).not.toHaveAttribute('transform');
    });

    it('should be the stage box when there is no bleed', () => {
        const { svg } = renderSvg(fitStage(1080, 1920));
        expect(svg).toHaveAttribute('viewBox', '0 0 1080 1920');
    });
});
