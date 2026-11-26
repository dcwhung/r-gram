import { type RefObject, useRef } from 'react';
import { flushSync } from 'react-dom';
import { isButtonNow } from './useSpindleFocus';

/** 邊粒掣打開歌單：唱片夾（未揀歌）或者碟面（T-037） */
type Opener = 'spindle' | 'disc';

/**
 * 收返歌單（㩒暗位、Esc；S-074、T-037）之後，focus 交返打開歌單嗰粒掣。兩粒都會重新 mount，
 * 所以先同步 render 完先 focus 新嗰個；碟面唔係掣（冇歌載入時只畀手指㩒）就交畀唱片夾
 */
export const useListOpener = (spindleRef: RefObject<SVGGElement | null>) => {
    const faceRef = useRef<SVGPathElement>(null);
    const opener = useRef<Opener>('spindle');
    const openFrom = (who: Opener, action: () => void) => (): void => {
        opener.current = who;
        action();
    };
    const closeList = (action: () => void) => (): void => {
        flushSync(action);
        const face = opener.current === 'disc' ? faceRef.current : null;
        const target = face && isButtonNow(face) ? face : spindleRef.current;
        if (target && isButtonNow(target)) target.focus();
    };
    return { faceRef, openFrom, closeList };
};
