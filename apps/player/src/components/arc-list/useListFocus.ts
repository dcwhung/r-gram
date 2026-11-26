/*
 * 歌單開住時嘅鍵盤 focus（WCAG 2.1 AA；review S-074）：
 * - 打開：focus 入歌單（listbox；冇歌就入暗層 =「關閉歌單」）
 * - Tab／Shift+Tab 只喺舞台入面仲 Tab 得到嘅嘢之間轉（歌單、唱片夾 = 播放、暗層 = 關閉）；下面嘅掣已經
 *   `tabindex="-1"`，所以呢度唔使逐個數
 * - Esc：收返（同㩒暗位一樣，D25）
 * 收返之後 focus 交返打開歌單嗰粒掣，係外面（HomeScene）嘅事。
 */
import { type RefObject, useEffect } from 'react';

/** 開歌單時 focus 落去嘅嘢：歌單；冇歌（冇 listbox）就暗層 */
const FIRST_STOPS = ['[role="listbox"]', '[data-part="arc-veil"]'];
const TAB_STOPS = '[tabindex="0"]';

/** 讀屏睇得到（唔喺 aria-hidden / inert 入面） */
const isReachable = (element: Element): boolean =>
    element.closest('[aria-hidden="true"], [inert]') === null;

/** Tab 喺舞台入面兜圈：最後一個之後返第一個，反之亦然 */
const trapTab = (root: SVGGElement | null, event: KeyboardEvent) => {
    const stage = root?.ownerSVGElement;
    if (!stage) return;
    const stops = [...stage.querySelectorAll<SVGElement>(TAB_STOPS)].filter(isReachable);
    if (stops.length === 0) return;
    const at = stops.findIndex((stop) => stop === document.activeElement);
    const step = event.shiftKey ? -1 : 1;
    const from = at === -1 && event.shiftKey ? 0 : at;
    const next = stops[(from + step + stops.length) % stops.length];
    event.preventDefault();
    next?.focus();
};

export const useListFocus = (root: RefObject<SVGGElement | null>, onClose: () => void) => {
    useEffect(() => {
        const element = root.current;
        const stops = FIRST_STOPS.map((selector) => element?.querySelector<SVGElement>(selector));
        stops.find(Boolean)?.focus();
    }, [root]);
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            } else if (event.key === 'Tab') {
                trapTab(root.current, event);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [root, onClose]);
};
