import { useRef } from 'react';
import { flushSync } from 'react-dom';

/** 讀屏睇得到（唔喺 aria-hidden / inert 入面）：拎住另一隻碟時唱片夾唔係掣，唔好 focus 落去 */
export const isButtonNow = (element: Element): boolean =>
    element.closest('[aria-hidden="true"], [inert]') === null;

/**
 * 做完一個會令 focus 緊嘅掣冇咗（或者淡出、離開 Tab 次序）嘅動作之後，將 focus 交畀唱片夾，唔好跌去 body：
 * 收返歌單（S-074）、㩒細唱片機返去載入嘅碟（T-048）。
 * 唱片夾會重新 mount（換位、換碟），所以先同步 render 完先 focus 新嗰個。
 * 動作被守衛擋咗（仍然拎住碟，唱片夾仍然唔係掣）就唔郁 focus，留喺原位（review S-180）。
 */
export const useSpindleFocus = () => {
    const spindleRef = useRef<SVGGElement>(null);
    const focusSpindleAfter = (action: () => void) => (): void => {
        flushSync(action);
        const spindle = spindleRef.current;
        if (spindle && isButtonNow(spindle)) spindle.focus();
    };
    return { spindleRef, focusSpindleAfter };
};
