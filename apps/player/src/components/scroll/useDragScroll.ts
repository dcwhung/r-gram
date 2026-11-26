/*
 * 元件內部嘅拖動捲動（歌單欄 T-049、弧線歌單 T-037 共用；Technical Spec 實現注意事項 13）：
 * 過咗門檻（CSS px）先當拖，之後捉住 pointer；每次移動按 px 換算做設計單位，向反方向捲（手指向上 = 睇下面）。
 * 拖完嗰下 click 唔當㩒（D57；設計稿互動格「拖過就唔當㩒」）：喺 capture 階段截住，唔會去到行或者暗層。
 * 只跟第一隻手指（W-050）：拖緊時第二隻手指、手掌唔理；第一隻手指鬆手、取消、甩咗 capture 都當拖完（吸附）。
 */
import { type MouseEvent, type PointerEvent, useRef } from 'react';

export interface DragSpec {
    /** 1 設計單位 = 幾多 CSS px */
    unit: number;
    /** 拖動門檻（CSS px） */
    thresholdPx: number;
}

interface DragState {
    pointerId: number;
    startY: number;
    lastY: number;
    moved: boolean;
}

/** 過咗門檻之後，今次移動咗幾多設計單位（正 = 捲向下面嘅行）；未過門檻 = null */
const dragMove = (drag: DragState, event: PointerEvent<SVGGElement>, spec: DragSpec) => {
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < spec.thresholdPx) return null;
    if (!drag.moved) event.currentTarget.setPointerCapture?.(event.pointerId);
    const units = (drag.lastY - event.clientY) / spec.unit;
    Object.assign(drag, { moved: true, lastY: event.clientY });
    return units;
};

/** useRef 嘅值（傳畀 hook 用） */
type Ref<T> = { current: T };

/** 㩒落：已經拖緊（捉住咗 pointer，一定收到鬆手）先唔理；未拖過嘅舊 press 可能喺元件外面鬆咗手，由新嘅取代 */
const usePress =
    (drag: Ref<DragState | null>, dragged: Ref<boolean>) =>
    ({ pointerId, clientY }: PointerEvent<SVGGElement>) => {
        if (drag.current?.moved) return;
        drag.current = { pointerId, startY: clientY, lastY: clientY, moved: false };
        dragged.current = false;
    };

/** `scrollBy(units)`：捲幾多設計單位；`onDragEnd`：拖完（真係拖過）鬆手（例如吸附） */
export const useDragScroll = (
    spec: DragSpec,
    scrollBy: (units: number) => void,
    onDragEnd?: () => void,
) => {
    const drag = useRef<DragState | null>(null);
    const dragged = useRef(false);
    const onPointerDown = usePress(drag, dragged);
    const end = ({ pointerId }: PointerEvent<SVGGElement>) => {
        if (drag.current?.pointerId !== pointerId) return;
        dragged.current = drag.current.moved;
        drag.current = null;
        if (dragged.current) onDragEnd?.();
    };
    return {
        onPointerDown,
        onPointerMove: (event: PointerEvent<SVGGElement>) => {
            if (drag.current?.pointerId !== event.pointerId) return;
            const units = dragMove(drag.current, event, spec);
            if (units !== null) scrollBy(units);
        },
        onPointerUp: end,
        onPointerCancel: end,
        onLostPointerCapture: end,
        onClickCapture: (event: MouseEvent) => {
            if (dragged.current) event.stopPropagation();
            dragged.current = false;
        },
    };
};
