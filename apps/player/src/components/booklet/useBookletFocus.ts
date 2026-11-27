/*
 * 歌書開住時嘅鍵盤 focus（WCAG 2.1 AA；同弧線歌單 useListFocus 一樣嘅做法）：
 * - 打開：focus 落歌書本身（role="dialog"），讀屏讀出「歌書：歌名」
 * - Tab／Shift+Tab 只喺舞台入面仲 Tab 得到嘅嘢之間轉：三粒細掣（喺暗層上面）、心形、唱片夾（播／停，決定 5）、
 *   歌詞欄（純文字，可以捲）、暗層 =「關閉歌書」。下面嘅旋鈕、♥、版本掣已經 `tabindex="-1"`
 * - Esc：收返（同㩒暗位一樣）
 * 收返之後 focus 交返 i 掣，係外面（BookletLayer）嘅事。
 */
import { type RefObject, useEffect } from 'react';
import { trapTab } from '../focusTrap';

export const useBookletFocus = (root: RefObject<SVGGElement | null>, onClose: () => void) => {
    useEffect(() => {
        root.current?.focus({ preventScroll: true });
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
