import { fireEvent, render, screen } from '@testing-library/react';
import { useSpindleFocus } from './useSpindleFocus';

/** 一粒掣做動作；唱片夾 `hidden` = 拎住另一隻碟時嘅樣（aria-hidden、唔入 Tab 次序） */
const Probe = ({ hidden, action }: { hidden: boolean; action: () => void }) => {
    const { spindleRef, focusSpindleAfter } = useSpindleFocus();
    return (
        <svg>
            <g role="button" tabIndex={0} aria-label="動作" onClick={focusSpindleAfter(action)} />
            <g
                ref={spindleRef}
                data-testid="spindle"
                tabIndex={hidden ? -1 : 0}
                aria-hidden={hidden || undefined}
            />
        </svg>
    );
};

/* S-074、T-048、review S-180：做完動作 focus 交畀唱片夾，但只喺唱片夾係掣嗰陣 */
describe('useSpindleFocus', () => {
    it('should run the action and focus the clamp', () => {
        const action = vi.fn();
        render(<Probe hidden={false} action={action} />);
        const button = screen.getByRole('button', { name: '動作' });
        button.focus();
        fireEvent.click(button);
        expect(action).toHaveBeenCalled();
        expect(document.activeElement).toBe(screen.getByTestId('spindle'));
    });

    it('should leave the focus where it is while the clamp is hidden from assistive tech', () => {
        render(<Probe hidden action={vi.fn()} />);
        const button = screen.getByRole('button', { name: '動作' });
        button.focus();
        fireEvent.click(button);
        expect(document.activeElement).toBe(button);
    });
});
