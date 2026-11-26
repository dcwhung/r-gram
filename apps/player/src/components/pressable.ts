import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';

const ACTIVATION_KEYS: readonly string[] = ['Enter', ' '];

/**
 * 喺停用時㩒落嘅掣（QA W-056）：同一下嘅 click 唔算，就算 pointerdown 同 click 之間解除咗停用。
 * 例：鍵盤開咗字母盤再用滑鼠㩒唱片夾：pointerdown 搶 focus → 旋鈕 blur 收字母盤 → click 時已經唔停用。
 * 下一次 pointerdown 會重新判斷，所以唔使清
 */
const blockedPresses = new WeakSet<Element>();

/**
 * SVG 入面嘅「掣」（`<g role="button">`）要自己處理鍵盤：Enter 同空白鍵 = 㩒。
 * 停用時唔叫 onPress，但仍然 focus 得到（讀屏會講「已停用」）；停用時開始嘅㩒（pointer）亦唔算。
 * `focusable = false`：俾其他嘢蓋住（例如歌單嘅暗層，S-074）：唔喺 Tab 次序入面。SVG 冇 `inert`，所以用 tabIndex。
 */
export const pressable = (onPress: () => void, disabled = false, focusable = true) => {
    const press = () => {
        if (!disabled) onPress();
    };
    return {
        role: 'button',
        tabIndex: focusable ? 0 : -1,
        onPointerDown: ({ currentTarget }: PointerEvent) => {
            if (disabled) blockedPresses.add(currentTarget);
            else blockedPresses.delete(currentTarget);
        },
        onClick: ({ currentTarget }: MouseEvent) => {
            if (blockedPresses.delete(currentTarget)) return;
            press();
        },
        onKeyDown: (event: KeyboardEvent) => {
            if (!ACTIVATION_KEYS.includes(event.key)) return;
            event.preventDefault();
            // 㩒住唔放嘅重覆 keydown 只計第一下
            if (!event.repeat) press();
        },
    } as const;
};
