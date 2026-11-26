/*
 * 手勢期間唔換版本（T-039）：有手指或者滑鼠㩒住畫面（轉旋鈕、拖歌單）= 用緊手勢，放晒手先算完。
 * 喺 window 嘅 capture 階段聽，元件 stopPropagation 都唔會走漏。
 */
type GestureTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

const PRESS = ['pointerdown'] as const;
const RELEASE = ['pointerup', 'pointercancel'] as const;

/** 開始追蹤；`onChange(true)` = 有嘢㩒住，`onChange(false)` = 全部放手。返回停止 function */
export const trackGestures = (
    target: GestureTarget,
    onChange: (active: boolean) => void,
): (() => void) => {
    const pressed = new Set<number>();
    const press = (event: Event) => {
        pressed.add((event as PointerEvent).pointerId);
        onChange(true);
    };
    const release = (event: Event) => {
        pressed.delete((event as PointerEvent).pointerId);
        if (pressed.size === 0) onChange(false);
    };
    // 㩒住期間切走（收埋 app、彈出系統畫面）可能收唔到放手：當全部放手，唔好卡住更新
    const reset = () => {
        pressed.clear();
        onChange(false);
    };
    PRESS.forEach((name) => target.addEventListener(name, press, true));
    RELEASE.forEach((name) => target.addEventListener(name, release, true));
    target.addEventListener('blur', reset);
    return () => {
        PRESS.forEach((name) => target.removeEventListener(name, press, true));
        RELEASE.forEach((name) => target.removeEventListener(name, release, true));
        target.removeEventListener('blur', reset);
    };
};
