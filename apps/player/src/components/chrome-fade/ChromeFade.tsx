import type { ReactNode } from 'react';
import './chromeFade.css';

interface ChromeFadeProps {
    /** `data-part`（測試同截圖用） */
    part: string;
    hidden: boolean;
    children?: ReactNode;
}

/**
 * 揀碟時淡出嘅一組嘢（唱臂、三粒細掣、左上歌名嗰部分；Functional Spec D52）：淡出淡入用 chromeFade token，
 * 減少動態效果時即時。隱藏時唔接受 pointer、讀屏唔讀（可以 focus 嘅掣要自己離開 Tab 次序）。
 */
export const ChromeFade = ({ part, hidden, children }: ChromeFadeProps) => (
    <g
        data-part={part}
        className="chrome-fade"
        data-hidden={hidden}
        aria-hidden={hidden || undefined}
        pointerEvents={hidden ? 'none' : undefined}
    >
        {children}
    </g>
);
