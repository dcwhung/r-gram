import type { KeyboardEvent } from 'react';

const ACTIVATION_KEYS: readonly string[] = ['Enter', ' '];

/**
 * SVG 入面嘅「掣」（`<g role="button">`）要自己處理鍵盤：Enter 同空白鍵 = 㩒。
 * 停用時唔叫 onPress，但仍然 focus 得到（讀屏會講「已停用」）。
 * `focusable = false`：俾其他嘢蓋住（例如歌單嘅暗層，S-074）：唔喺 Tab 次序入面。SVG 冇 `inert`，所以用 tabIndex。
 */
export const pressable = (onPress: () => void, disabled = false, focusable = true) => {
    const press = () => {
        if (!disabled) onPress();
    };
    return {
        role: 'button',
        tabIndex: focusable ? 0 : -1,
        onClick: press,
        onKeyDown: (event: KeyboardEvent) => {
            if (!ACTIVATION_KEYS.includes(event.key)) return;
            event.preventDefault();
            // 㩒住唔放嘅重覆 keydown 只計第一下
            if (!event.repeat) press();
        },
    } as const;
};
