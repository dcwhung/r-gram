import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Tonearm } from './Tonearm';

type Arm = Parameters<typeof Tonearm>[0]['arm'];

const renderArm = (playing: boolean, arm: Arm = PHONE_LAYOUT.arm) => {
    const { container } = render(
        <svg>
            <Tonearm arm={arm} playing={playing} glow="#24f96f" />
        </svg>,
    );
    return (name: string) => container.querySelector<SVGElement>(`[data-part="${name}"]`);
};

/** 針頭殼一截：臂管路徑、針頭殼嘅位置同角度、連去針頭嗰條線 */
const headGeometry = (bend: Arm['bend']) => {
    const arm = renderArm(false, { ...PHONE_LAYOUT.arm, bend })('arm');
    const head = arm?.querySelector(':scope > g');
    return {
        tube: arm?.querySelector(':scope > path')?.getAttribute('d'),
        head: head?.getAttribute('transform'),
        wire: head?.querySelector('path')?.getAttribute('d'),
    };
};

describe('Tonearm', () => {
    it('should rest at the park angle when not playing', () => {
        const part = renderArm(false);
        expect(part('arm')?.style.transform).toBe('translate(900px, 330px) rotate(176deg)');
        expect(part('led')).toHaveAttribute('fill', '#5a5a5a');
        expect(part('led-glow')).toBeNull();
    });

    it('should swing to the play angle and light the cartridge lamp when playing', () => {
        const part = renderArm(true);
        expect(part('arm')?.style.transform).toBe('translate(900px, 330px) rotate(99deg)');
        expect(part('led')).toHaveAttribute('fill', '#24f96f');
        expect(part('led-glow')).not.toBeNull();
    });

    /* W-009：針頭殼向邊一邊彎由幾何表 arm.bend 決定（設計稿 ARM.bend），元件唔寫死 */
    it('should bend the headshell towards the disc centre for the phone layout', () => {
        expect(headGeometry(PHONE_LAYOUT.arm.bend)).toEqual({
            tube: 'M0 0H486.4Q562 0 582 -30',
            head: 'translate(582 -30) rotate(-24)',
            wire: 'M22 15L44 42',
        });
    });

    it('should mirror the headshell when the layout bends the arm the other way', () => {
        expect(headGeometry(1)).toEqual({
            tube: 'M0 0H486.4Q562 0 582 30',
            head: 'translate(582 30) rotate(24)',
            wire: 'M22 -15L44 -42',
        });
    });
});
