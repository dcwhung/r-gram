import { fireEvent, render, screen } from '@testing-library/react';
import { pressable } from './pressable';

const renderPressable = (disabled = false) => {
    const onPress = vi.fn();
    render(
        <svg>
            <g aria-label="press me" {...pressable(onPress, disabled)} />
        </svg>,
    );
    return { onPress, button: screen.getByRole('button', { name: 'press me' }) };
};

/** fireEvent 回傳 false = 有人叫咗 preventDefault */
const isPrevented = (notCancelled: boolean) => !notCancelled;

describe('pressable', () => {
    // QA W-056：㩒落嗰陣停用（例如字母盤開住），之後先解除（blur 收字母盤），同一下 click 都唔算
    it('should ignore the click of a press that began while disabled', () => {
        const onPress = vi.fn();
        const { rerender } = render(
            <svg>
                <g aria-label="press me" {...pressable(onPress, true)} />
            </svg>,
        );
        const button = screen.getByRole('button', { name: 'press me' });
        fireEvent.pointerDown(button);
        rerender(
            <svg>
                <g aria-label="press me" {...pressable(onPress, false)} />
            </svg>,
        );
        fireEvent.click(button);
        expect(onPress).not.toHaveBeenCalled();
        fireEvent.pointerDown(button);
        fireEvent.click(button);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should press on a click with no pointerdown before it', () => {
        const { button, onPress } = renderPressable();
        fireEvent.click(button);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it.each(['Enter', ' '])('should press once on the %j key and keep the page still', (key) => {
        const { button, onPress } = renderPressable();
        expect(isPrevented(fireEvent.keyDown(button, { key }))).toBe(true);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    // S-038：㩒住唔放，瀏覽器會連續出 repeat = true 嘅 keydown；只計第一下（否則播放 / 暫停會連跳）
    it.each(['Enter', ' '])('should press only once while the %j key is held down', (key) => {
        const { button, onPress } = renderPressable();
        const HELD_REPEATS = 4;
        fireEvent.keyDown(button, { key });
        for (let count = 0; count < HELD_REPEATS; count += 1) {
            // 重覆嗰啲照樣要 preventDefault：空白鍵唔可以令頁面捲動
            expect(isPrevented(fireEvent.keyDown(button, { key, repeat: true }))).toBe(true);
        }
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    // 其他鍵唔理：尤其係 Tab，食咗佢就變成鍵盤陷阱
    it.each(['Tab', 'Escape', 'ArrowDown', 'a'])(
        'should ignore the %j key and leave it to the browser',
        (key) => {
            const { button, onPress } = renderPressable();
            expect(isPrevented(fireEvent.keyDown(button, { key }))).toBe(false);
            expect(onPress).not.toHaveBeenCalled();
        },
    );

    it('should not press when disabled, by click or by key', () => {
        const { button, onPress } = renderPressable(true);
        fireEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(onPress).not.toHaveBeenCalled();
        expect(button).toHaveAttribute('tabindex', '0');
    });

    it('should leave the Tab order when it is not focusable', () => {
        render(
            <svg>
                <g aria-label="covered" {...pressable(vi.fn(), false, false)} />
            </svg>,
        );
        expect(screen.getByRole('button', { name: 'covered' })).toHaveAttribute('tabindex', '-1');
    });
});
