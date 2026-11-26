import { useRef } from 'react';
import { flushSync } from 'react-dom';

/**
 * 做完一個會令 focus 緊嘅掣冇咗（或者淡出、離開 Tab 次序）嘅動作之後，將 focus 交畀唱片夾，唔好跌去 body：
 * 收返歌單（S-074）、㩒細唱片機返去載入嘅碟（T-048）。
 * 唱片夾會重新 mount（換位、換碟），所以先同步 render 完先 focus 新嗰個。
 */
export const useSpindleFocus = () => {
    const spindleRef = useRef<SVGGElement>(null);
    const focusSpindleAfter = (action: () => void) => (): void => {
        flushSync(action);
        spindleRef.current?.focus();
    };
    return { spindleRef, focusSpindleAfter };
};
