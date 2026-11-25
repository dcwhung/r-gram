import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { MetalButton } from './MetalButton';

const renderButton = (props: Partial<Parameters<typeof MetalButton>[0]> = {}) => {
    const onPress = vi.fn();
    const { container } = render(
        <svg>
            <MetalButton
                x={112}
                y={1380}
                icon="info"
                label="歌書"
                glow="#24f96f"
                metrics={PHONE_LAYOUT.buttons}
                hitRadius={61}
                onPress={onPress}
                {...props}
            />
        </svg>,
    );
    return { onPress, container, button: screen.getByRole('button', { name: '歌書' }) };
};

describe('MetalButton', () => {
    it('should call onPress when clicked', async () => {
        const { button, onPress } = renderButton();
        await userEvent.click(button);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it.each(['Enter', ' '])('should call onPress on the %j key', (key) => {
        const { button, onPress } = renderButton();
        fireEvent.keyDown(button, { key });
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should stay focusable but not react when disabled', async () => {
        const { button, onPress } = renderButton({ disabled: true });
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('tabindex', '0');
        await userEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(onPress).not.toHaveBeenCalled();
    });

    it('should show the glow ring and tint the icon only when lit', () => {
        const off = renderButton();
        expect(off.button).toHaveAttribute('aria-pressed', 'false');
        expect(off.container.querySelector('[data-part="glow-ring"]')).toBeNull();
        off.container.remove();

        const on = renderButton({ lit: true });
        expect(on.button).toHaveAttribute('aria-pressed', 'true');
        expect(on.container.querySelector('[data-part="glow-ring"]')).toHaveAttribute(
            'stroke',
            '#24f96f',
        );
        expect(on.container.querySelector('[data-part="icon"]')).toHaveAttribute('fill', '#24f96f');
    });

    it('should give the touch target the radius it is told (44pt rule)', () => {
        const { container } = renderButton();
        expect(container.querySelector('[data-part="hit"]')).toHaveAttribute('r', '61');
    });
});
