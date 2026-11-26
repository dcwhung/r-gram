import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { useSpindleFocus } from './useSpindleFocus';

/**
 * 一粒掣做動作：`hidesButton` = 動作生效，嗰粒掣淡出（aria-hidden，好似㩒完細唱片機）；
 * 唱片夾 `hidden` = 讀屏睇唔到
 */
const Probe = ({ hidden, hidesButton }: { hidden: boolean; hidesButton: boolean }) => {
    const { spindleRef, focusSpindleAfter } = useSpindleFocus();
    const [gone, setGone] = useState(false);
    return (
        <svg>
            <g aria-hidden={gone || undefined}>
                <g
                    role="button"
                    tabIndex={0}
                    aria-label="動作"
                    onClick={focusSpindleAfter(() => setGone(hidesButton))}
                />
            </g>
            <g
                ref={spindleRef}
                data-testid="spindle"
                tabIndex={hidden ? -1 : 0}
                aria-hidden={hidden || undefined}
            />
        </svg>
    );
};

const pressAction = () => {
    const button = screen.getByRole('button', { name: '動作' });
    button.focus();
    fireEvent.click(button);
    return button;
};

/* S-074、T-048、review S-180：做完動作，㩒嗰粒掣冇咗就將 focus 交畀唱片夾（要係掣） */
describe('useSpindleFocus', () => {
    it('should focus the clamp once the pressed button is gone', () => {
        render(<Probe hidden={false} hidesButton />);
        pressAction();
        expect(document.activeElement).toBe(screen.getByTestId('spindle'));
    });

    it('should leave the focus where it is when the action changed nothing', () => {
        render(<Probe hidden={false} hidesButton={false} />);
        const button = pressAction();
        expect(document.activeElement).toBe(button);
    });

    it('should not focus a clamp hidden from assistive tech', () => {
        render(<Probe hidden hidesButton />);
        pressAction();
        expect(document.activeElement).not.toBe(screen.getByTestId('spindle'));
    });
});
