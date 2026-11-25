import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Tonearm } from './Tonearm';

const renderArm = (playing: boolean) => {
    const { container } = render(
        <svg>
            <Tonearm arm={PHONE_LAYOUT.arm} playing={playing} glow="#24f96f" />
        </svg>,
    );
    return (name: string) => container.querySelector<SVGElement>(`[data-part="${name}"]`);
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
});
