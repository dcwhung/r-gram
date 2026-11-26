/*
 * 元件內部嘅滾輪（歌單欄 T-049、弧線歌單 T-037 共用）：喺元件入面就由元件食咗（non-passive），
 * 頁面唔會捲、唔會回彈（Technical Spec 實現注意事項 13）。
 */
import { type RefObject, useEffect, useRef } from 'react';

/** WheelEvent.deltaMode：0 = px、1 = 行、2 = 版 */
const DELTA_LINE = 1;
const DELTA_PAGE = 2;

/** 滾輪移咗幾多設計單位：行 = pitch、版 = room、px 按舞台縮放（unit = 1 設計單位幾多 px）換算 */
export const wheelUnits = (
    event: WheelEvent,
    { pitch, room, unit }: { pitch: number; room: number; unit: number },
): number => {
    if (event.deltaMode === DELTA_LINE) return event.deltaY * pitch;
    if (event.deltaMode === DELTA_PAGE) return event.deltaY * room;
    return event.deltaY / unit;
};

/** 將 `onWheel` 掛喺 ref 嘅元素（non-passive）。`onWheel` 要穩定（useCallback），否則每次 render 重新掛 */
export const useWheel = (onWheel: (event: WheelEvent) => void): RefObject<SVGGElement | null> => {
    const ref = useRef<SVGGElement>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        const listener = (event: WheelEvent) => {
            event.preventDefault();
            onWheel(event);
        };
        element.addEventListener('wheel', listener, { passive: false });
        return () => element.removeEventListener('wheel', listener);
    }, [onWheel]);
    return ref;
};
