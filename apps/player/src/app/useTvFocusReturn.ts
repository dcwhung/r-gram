import { useEffect, useRef } from 'react';

/** MV 掣（三粒細掣入面 icon = mv 嗰粒） */
const MV_BUTTON = '[data-part="small-buttons"] [data-icon="mv"]';

/**
 * 電視收埋之後 focus 交返 MV 掣（電視開住時 focus 喺電視入面，收埋就冇咗；同歌單收返交返碟面一樣，S-074）。
 * 回傳背後唱片機嗰層嘅 ref（喺佢入面搵掣）
 */
export const useTvFocusReturn = (tvShown: boolean) => {
    const layer = useRef<HTMLDivElement>(null);
    const wasShown = useRef(tvShown);
    useEffect(() => {
        const closed = wasShown.current && !tvShown;
        wasShown.current = tvShown;
        if (!closed) return;
        layer.current?.querySelector<SVGElement>(MV_BUTTON)?.focus({ preventScroll: true });
    }, [tvShown]);
    return layer;
};
