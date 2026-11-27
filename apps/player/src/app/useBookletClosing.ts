/*
 * 收返歌書嘅過場（Technical Spec「歌書過場」；設計稿 ACTIONS.info、BOOK_CLOSE_MS）：㩒 i、㩒暗位、Esc =
 * 先行收返動畫（bookletCloseMs），完咗先真正轉場景狀態；期間再㩒 i（或者 Esc）唔做嘢。減少動態效果：即刻收。
 * 收返途中歌書因為其他原因冇咗（例如開 MV：電視即刻取代歌書）就唔再等。打開冇等：一 mount 就行打開動畫。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOTION } from '../config/motion';
import { useStable } from '../components/arc-list/useStable';
import { prefersReducedMotion } from '../utils/motion';

type Timer = ReturnType<typeof setTimeout>;

export interface BookletClosing {
    /** 收返緊（動畫期間） */
    closing: boolean;
    /** 收返（㩒暗位、Esc）；冇開或者收緊 = 唔做嘢 */
    close: () => void;
    /** i 掣：冇開 = 開；開咗 = 收返 */
    press: () => void;
}

/** `open` = 場景狀態入面歌書開咗；`toggle` = 真正開／收（場景狀態） */
export const useBookletClosing = (open: boolean, toggle: () => void): BookletClosing => {
    const [closing, setClosing] = useState(false);
    const [wasOpen, setWasOpen] = useState(open);
    const timer = useRef<Timer | null>(null);
    const flip = useStable(toggle);
    // 收埋咗（收完、或者被電視取代）：下次打開由頭嚟（React「render 期間調整 state」嘅做法）
    if (wasOpen !== open) {
        setWasOpen(open);
        if (!open) setClosing(false);
    }
    useEffect(() => {
        if (open || !timer.current) return;
        clearTimeout(timer.current);
        timer.current = null;
    }, [open]);
    useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
    const close = useCallback(() => {
        if (!open || timer.current) return;
        if (prefersReducedMotion()) return flip();
        setClosing(true);
        timer.current = setTimeout(() => {
            timer.current = null;
            flip();
        }, MOTION.scene.bookletCloseMs);
    }, [open, flip]);
    const press = useCallback(() => (open ? close() : flip()), [open, close, flip]);
    return { closing: open && closing, close, press };
};
