import { type RefObject, useRef } from 'react';
import { flushSync } from 'react-dom';
import { isButtonNow } from './useSpindleFocus';

/**
 * 收返歌單（㩒暗位、Esc；S-074、T-037）之後，focus 交返打開歌單嘅碟面（唱片夾一定係 play，
 * 開歌單一律經碟面，B-086 ③）。碟面會重新 mount，所以先同步 render 完先 focus 新嗰個；
 * 碟面唔喺度（例如收返嗰下已經冇得開歌單）就交畀唱片夾
 */
export const useListOpener = (spindleRef: RefObject<SVGGElement | null>) => {
    const faceRef = useRef<SVGPathElement>(null);
    const closeList = (action: () => void) => (): void => {
        flushSync(action);
        const face = faceRef.current;
        const target = face && isButtonNow(face) ? face : spindleRef.current;
        if (target && isButtonNow(target)) target.focus();
    };
    return { faceRef, closeList };
};
