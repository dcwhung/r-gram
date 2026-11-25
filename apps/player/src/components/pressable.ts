import type { KeyboardEvent } from 'react';

const ACTIVATION_KEYS: readonly string[] = ['Enter', ' '];

/**
 * SVG 入面嘅「掣」（`<g role="button">`）要自己處理鍵盤：Enter 同空白鍵 = 㩒。
 * 停用時唔叫 onPress，但仍然 focus 得到（讀屏會講「已停用」）。
 */
export const pressable = (onPress: () => void, disabled = false) => {
    const press = () => {
        if (!disabled) onPress();
    };
    return {
        role: 'button',
        tabIndex: 0,
        onClick: press,
        onKeyDown: (event: KeyboardEvent) => {
            if (!ACTIVATION_KEYS.includes(event.key)) return;
            event.preventDefault();
            press();
        },
    } as const;
};
