import { fireEvent, render, screen } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth, type TextMeasure } from '../../utils/textMeasure';
import { UpdateButton } from './UpdateButton';

const NAME = '已有新版本，立即更新並重新載入';

const renderButton = (covered = false, measure: TextMeasure = estimateTextWidth) => {
    const onPress = vi.fn();
    const { container } = render(
        <svg>
            <UpdateButton
                layout={PHONE_LAYOUT}
                measure={measure}
                onPress={onPress}
                covered={covered}
            />
        </svg>,
    );
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    return { onPress, part };
};

describe('UpdateButton', () => {
    it('should show the version text inside a pill, named for what pressing does', () => {
        const { part } = renderButton();
        const button = screen.getByRole('button', { name: NAME });
        expect(button).toHaveTextContent(/^v\d+\.\d+\.\d+$/);
        expect(button).toHaveAttribute('tabindex', '0');
        expect(part('update-pill')).toHaveAttribute('fill', 'none');
        expect(part('update-pill')).toHaveAttribute('stroke-width', '3');
        expect(part('update-text')).toHaveAttribute('text-anchor', 'end');
    });

    it('should size the pill from the measured text and keep its right edge at 1034', () => {
        const MEASURED = 120;
        const { part } = renderButton(false, () => MEASURED);
        const { update, version } = PHONE_LAYOUT.info;
        const width = MEASURED - version.spacing + update.padX * 2;
        expect(part('update-pill')).toHaveAttribute('width', String(width));
        expect(part('update-pill')).toHaveAttribute('x', String(update.right - width));
    });

    it('should measure the version text in the slab face at the button size', () => {
        const measure = vi.fn<TextMeasure>(() => 100);
        renderButton(false, measure);
        expect(measure).toHaveBeenCalledWith(expect.stringMatching(/^v\d/), {
            family: 'slab',
            size: PHONE_LAYOUT.info.update.size,
            weight: 400,
            spacing: PHONE_LAYOUT.info.version.spacing,
        });
    });

    it('should blink the whole button, not the hit area', () => {
        const { part } = renderButton();
        const blink = part('update-blink');
        expect(blink).toHaveClass('update-blink');
        expect(blink).toContainElement(part('update-pill') as HTMLElement);
        expect(blink).toContainElement(part('update-text') as HTMLElement);
        expect(blink).not.toContainElement(part('update-hit') as HTMLElement);
    });

    it('should apply the update on click, Enter and Space', () => {
        const { onPress } = renderButton();
        const button = screen.getByRole('button', { name: NAME });
        fireEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
        fireEvent.keyDown(button, { key: ' ' });
        expect(onPress).toHaveBeenCalledTimes(3);
    });

    // W-058（D95 🅰️ ①）：暗層下面唔係掣（唔㩒得、唔入 Tab 次序），但版本號照畀讀屏讀
    it('should be dimmed with the stage but not pressable or focusable while covered by the veil', () => {
        const { onPress, part } = renderButton(true);
        expect(screen.queryByRole('button')).toBeNull();
        const button = part('update-button') as Element;
        expect(button).not.toHaveAttribute('tabindex');
        expect(button).not.toHaveAttribute('role');
        expect(button).not.toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('pointer-events', 'none');
        expect(part('update-hit')).toBeNull();
        fireEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(onPress).not.toHaveBeenCalled();
    });

    it('should keep the version number readable by screen readers while covered', () => {
        renderButton(true);
        const version = screen.getByText(/^v\d+\.\d+\.\d+$/);
        expect(version.closest('[aria-hidden="true"]')).toBeNull();
    });
});
