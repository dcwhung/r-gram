import { render } from '@testing-library/react';
import { ChromeFade } from './ChromeFade';

const renderFade = (hidden: boolean) =>
    render(
        <svg>
            <ChromeFade part="chrome-arm" hidden={hidden}>
                <circle data-part="inside" r={1} />
            </ChromeFade>
        </svg>,
    ).container.querySelector('[data-part="chrome-arm"]');

/* Functional Spec D52：揀碟時淡出嘅一組嘢；淡出咗就唔接受 pointer、讀屏唔讀 */
describe('ChromeFade', () => {
    it('should keep its contents reachable while shown', () => {
        const fade = renderFade(false);
        expect(fade).toHaveAttribute('data-hidden', 'false');
        expect(fade).not.toHaveAttribute('pointer-events');
        expect(fade).not.toHaveAttribute('aria-hidden');
    });

    it('should let the pointer through and hide from screen readers while hidden', () => {
        const fade = renderFade(true);
        expect(fade).toHaveAttribute('data-hidden', 'true');
        expect(fade).toHaveAttribute('pointer-events', 'none');
        expect(fade).toHaveAttribute('aria-hidden', 'true');
    });
});
