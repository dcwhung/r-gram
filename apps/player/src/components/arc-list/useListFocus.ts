/*
 * 歌單開住時嘅鍵盤 focus（WCAG 2.1 AA；review S-074）：
 * - 打開：focus 入歌單（listbox；冇歌就入暗層 =「關閉歌單」）
 * - Tab／Shift+Tab 只喺舞台入面仲 Tab 得到嘅嘢之間轉（歌單、唱片夾 = 播放、暗層 = 關閉）；下面嘅掣已經
 *   `tabindex="-1"`，所以呢度唔使逐個數
 * - 舞台外面冇掣要兜（T-109：更新提示變咗舞台入面嘅版本掣，喺暗層下面，Tab 唔到；D95）
 * - Esc：收返（同㩒暗位一樣，D25）
 * 收返之後 focus 交返打開歌單嗰粒掣，係外面（HomeScene）嘅事。
 */
import { type RefObject, useEffect } from 'react';
import { trapTab } from '../focusTrap';

/** 開歌單時 focus 落去嘅嘢：歌單；冇歌（冇 listbox）就暗層 */
const FIRST_STOPS = ['[role="listbox"]', '[data-part="arc-veil"]'];

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
