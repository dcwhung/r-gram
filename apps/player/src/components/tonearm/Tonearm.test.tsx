import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import type { ArmLeadIn, ArmPose } from './armPose';
import { Tonearm } from './Tonearm';

type Arm = Parameters<typeof Tonearm>[0]['arm'];

const renderArm = (pose: ArmPose, arm: Arm = PHONE_LAYOUT.arm, leadIn: ArmLeadIn = null) => {
    const { container } = render(
        <svg>
            <Tonearm arm={arm} pose={pose} leadIn={leadIn} glow="#24f96f" />
        </svg>,
    );
    return (name: string) => container.querySelector<SVGElement>(`[data-part="${name}"]`);
};

const PARK = 'translate(900px, 330px) rotate(176deg)';
const PLAY = 'translate(900px, 330px) rotate(99deg)';
/** 設計稿 ARM_LIFT：升針 = 成支臂放大 1.018、落影由 (5, 9) 移去 (14, 25) */
const DOWN = { lift: 'scale(1)', shadow: 'translate(5px, 9px)' };
const UP = { lift: 'scale(1.018)', shadow: 'translate(14px, 25px)' };

/** 而家嘅樣：角度、升定落、小燈 */
const look = (part: ReturnType<typeof renderArm>) => ({
    arm: part('arm')?.style.transform,
    lift: part('arm-lift')?.style.transform,
    shadow: part('arm-shadow')?.style.transform,
    led: part('led')?.getAttribute('fill'),
    glow: part('led-glow') !== null,
});

/** 針頭殼一截：臂管路徑、針頭殼嘅位置同角度、連去針頭嗰條線 */
const headGeometry = (bend: Arm['bend']) => {
    const arm = renderArm('parked', { ...PHONE_LAYOUT.arm, bend })('arm-lift');
    const head = arm?.querySelector(':scope > g:not([data-part])');
    return {
        tube: arm?.querySelector(':scope > path')?.getAttribute('d'),
        head: head?.getAttribute('transform'),
        wire: head?.querySelector('path')?.getAttribute('d'),
    };
};

describe('Tonearm', () => {
    it('should rest at the park angle with the needle down and the lamp off when parked', () => {
        expect(look(renderArm('parked'))).toEqual({
            arm: PARK,
            ...DOWN,
            led: '#5a5a5a',
            glow: false,
        });
    });

    it('should lower the needle over the disc and light the cartridge lamp when playing', () => {
        expect(look(renderArm('playing'))).toEqual({
            arm: PLAY,
            ...DOWN,
            led: '#24f96f',
            glow: true,
        });
    });

    // CR-003 決定 11：暫停 = 唱臂留喺碟上面原位、唱針略為升起、小燈熄
    it('should stay at the play angle with the needle slightly lifted and the lamp off when paused', () => {
        expect(look(renderArm('lifted'))).toEqual({
            arm: PLAY,
            ...UP,
            led: '#5a5a5a',
            glow: false,
        });
    });

    // 由泊位開始播：第一段升高住轉入，第二段放低；小燈等放低之後先著
    it('should swing in lifted, then lower the needle, keeping the lamp off during the lead-in', () => {
        const off = { led: '#5a5a5a', glow: false };
        expect(look(renderArm('playing', PHONE_LAYOUT.arm, 'swing'))).toEqual({
            arm: PLAY,
            ...UP,
            ...off,
        });
        expect(look(renderArm('playing', PHONE_LAYOUT.arm, 'drop'))).toEqual({
            arm: PLAY,
            ...DOWN,
            ...off,
        });
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
