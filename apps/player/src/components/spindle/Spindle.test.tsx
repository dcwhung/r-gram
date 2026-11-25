import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Spindle, type SpindleMode } from './Spindle';

const renderSpindle = (mode: SpindleMode, progress = 0.25, disabled = false) => {
    const onPress = vi.fn();
    const { container } = render(
        <svg>
            <Spindle
                layout={PHONE_LAYOUT}
                mode={mode}
                progress={progress}
                accent="#2f8f57"
                disabled={disabled}
                onPress={onPress}
            />
        </svg>,
    );
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    return { onPress, part, button: screen.getByRole('button') };
};

/* 唱片夾四個狀態（Functional Spec CR-002「唱片夾同碟」） */
describe('Spindle', () => {
    it('should show the bare clamp and open the track list when no song is chosen', () => {
        const { button, part } = renderSpindle('idle');
        expect(button).toHaveAccessibleName('開啟歌單');
        expect(part('play')).toBeNull();
        expect(part('pause')).toBeNull();
        expect(part('progress')).toBeNull();
    });

    it('should show a white ring with play in the track list', () => {
        const { button, part } = renderSpindle('list');
        expect(button).toHaveAccessibleName('播放');
        expect(part('list-ring')).not.toBeNull();
        expect(part('play')).not.toBeNull();
        expect(part('progress')).toBeNull();
    });

    it('should show the progress ring in the album colour with pause while playing', () => {
        const { button, part } = renderSpindle('playing');
        expect(button).toHaveAccessibleName('暫停');
        expect(part('pause')).not.toBeNull();
        expect(part('play')).toBeNull();
        expect(part('progress')).toHaveAttribute('stroke', '#2f8f57');
    });

    it('should show the progress ring with play while paused', () => {
        const { button, part } = renderSpindle('paused');
        expect(button).toHaveAccessibleName('播放');
        expect(part('play')).not.toBeNull();
        expect(part('progress')).not.toBeNull();
    });

    it('should draw the progress as a share of the ring', () => {
        const { part } = renderSpindle('playing', 0.25);
        const [filled, whole] = (part('progress')?.getAttribute('stroke-dasharray') ?? '')
            .split(' ')
            .map(Number);
        expect((filled ?? 0) / (whole ?? 1)).toBeCloseTo(0.25, 2);
    });

    it.each([-1, 2, Number.NaN])(
        'should keep an out-of-range progress of %d inside the ring',
        (progress) => {
            const { part } = renderSpindle('playing', progress);
            const [filled, whole] = (part('progress')?.getAttribute('stroke-dasharray') ?? '')
                .split(' ')
                .map(Number);
            expect(filled).toBeGreaterThanOrEqual(0);
            expect(filled).toBeLessThanOrEqual(whole ?? 0);
        },
    );

    it('should sit at the centre of the disc and call onPress', async () => {
        const { button, onPress, part } = renderSpindle('idle');
        expect(part('clamp')?.getAttribute('transform')).toBe('translate(940 1196)');
        await userEvent.click(button);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    // S-073：停用時讀屏講「已停用」，㩒落去冇反應，但仍然 focus 得到
    it('should be marked disabled and ignore presses when disabled', async () => {
        const { button, onPress } = renderSpindle('paused', 0.25, true);
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('tabindex', '0');
        await userEvent.click(button);
        button.focus();
        await userEvent.keyboard('{Enter}');
        expect(onPress).not.toHaveBeenCalled();
    });
});
