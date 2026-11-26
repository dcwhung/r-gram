/*
 * 歌單欄嘅欄內捲動（設計稿第 18 版互動格：拖動、滾輪；Technical Spec「補充：第 18 版」捲動）：
 * - 拖動：過咗門檻（CSS px）先當拖，之後捉住 pointer；拖完嗰下 click 唔當㩒（D57）
 * - 滾輪：喺欄入面就由欄食咗（non-passive，頁面唔會捲、唔會回彈）
 * - 鍵盤：焦點喺欄或者行時上下鍵一行、Page Up／Down 一版、Home／End 去頭尾；focus 到嘅行自動捲入欄
 * 換碟時歸零：元件以碟做 key，換碟 = 新 state。
 */
import {
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent,
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { clampScroll, type ColumnMetrics, columnMetrics, scrollToShow } from './columnLayout';

export interface ScrollSpec {
    count: number;
    pitch: number;
    /** 欄高（設計單位） */
    room: number;
    minThumb: number;
    /** 1 設計單位 = 幾多 CSS px */
    unit: number;
    /** 拖動門檻（CSS px） */
    thresholdPx: number;
}

type Move = (scroll: number) => number;
type ScrollTo = (move: Move) => void;

/** WheelEvent.deltaMode：0 = px、1 = 行、2 = 版 */
const DELTA_LINE = 1;
const DELTA_PAGE = 2;

const wheelUnits = (
    event: WheelEvent,
    { pitch, room, unit }: Pick<ScrollSpec, 'pitch' | 'room' | 'unit'>,
): number => {
    if (event.deltaMode === DELTA_LINE) return event.deltaY * pitch;
    if (event.deltaMode === DELTA_PAGE) return event.deltaY * room;
    return event.deltaY / unit;
};

/** 鍵盤：每個鍵點樣移；其他鍵唔理（Enter／空白鍵留畀行） */
const keyMove = (key: string, { pitch, room }: ScrollSpec, most: number): Move | null => {
    const page = Math.max(pitch, room - pitch);
    const moves: Record<string, Move> = {
        ArrowDown: (scroll) => scroll + pitch,
        ArrowUp: (scroll) => scroll - pitch,
        PageDown: (scroll) => scroll + page,
        PageUp: (scroll) => scroll - page,
        Home: () => 0,
        End: () => most,
    };
    return Object.hasOwn(moves, key) ? (moves[key] ?? null) : null;
};

const useWheelScroll = (spec: ScrollSpec, scrollTo: ScrollTo): RefObject<SVGGElement | null> => {
    const listRef = useRef<SVGGElement>(null);
    const { pitch, room, unit } = spec;
    useEffect(() => {
        const list = listRef.current;
        if (!list) return undefined;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const units = wheelUnits(event, { pitch, room, unit });
            scrollTo((scroll) => scroll + units);
        };
        list.addEventListener('wheel', onWheel, { passive: false });
        return () => list.removeEventListener('wheel', onWheel);
    }, [pitch, room, unit, scrollTo]);
    return listRef;
};

interface DragState {
    pointerId: number;
    startY: number;
    lastY: number;
    moved: boolean;
}

/** 過咗門檻之後，每次移動按 px 換算做設計單位，向反方向捲（手指向上 = 睇下面嘅行） */
const dragMove = (drag: DragState, event: PointerEvent<SVGGElement>, spec: ScrollSpec) => {
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < spec.thresholdPx) return null;
    if (!drag.moved) event.currentTarget.setPointerCapture?.(event.pointerId);
    const units = (drag.lastY - event.clientY) / spec.unit;
    Object.assign(drag, { moved: true, lastY: event.clientY });
    return units;
};

const useDragScroll = (spec: ScrollSpec, scrollTo: ScrollTo) => {
    const drag = useRef<DragState | null>(null);
    const dragged = useRef(false);
    const end = () => {
        if (drag.current?.moved) dragged.current = true;
        drag.current = null;
    };
    return {
        onPointerDown: ({ pointerId, clientY }: PointerEvent<SVGGElement>) => {
            drag.current = { pointerId, startY: clientY, lastY: clientY, moved: false };
            dragged.current = false;
        },
        onPointerMove: (event: PointerEvent<SVGGElement>) => {
            if (drag.current?.pointerId !== event.pointerId) return;
            const units = dragMove(drag.current, event, spec);
            if (units !== null) scrollTo((scroll) => scroll + units);
        },
        onPointerUp: end,
        onPointerCancel: end,
        onClickCapture: (event: MouseEvent) => {
            if (!dragged.current) return;
            dragged.current = false;
            event.stopPropagation();
        },
    };
};

export interface ColumnScroll {
    metrics: ColumnMetrics;
    listRef: RefObject<SVGGElement | null>;
    /** 放喺欄（role="list"）上面嘅 handler */
    handlers: ReturnType<typeof useDragScroll> & { onKeyDown: (event: KeyboardEvent) => void };
    /** 某行攞到 focus：捲到見到成行 */
    showRow: (index: number) => void;
}

export const useColumnScroll = (spec: ScrollSpec): ColumnScroll => {
    const [raw, setRaw] = useState(0);
    const metrics = columnMetrics({ ...spec, scroll: raw });
    const most = metrics.maxScroll;
    const scrollTo = useCallback<ScrollTo>(
        (move) => setRaw((previous) => clampScroll(move(clampScroll(previous, most)), most)),
        [most],
    );
    const onKeyDown = (event: KeyboardEvent) => {
        const move = keyMove(event.key, spec, most);
        if (!move) return;
        event.preventDefault();
        scrollTo(move);
    };
    const showRow = (index: number) =>
        scrollTo((scroll) => scrollToShow(index, spec.pitch, spec.room, scroll));
    const handlers = { ...useDragScroll(spec, scrollTo), onKeyDown };
    return { metrics, listRef: useWheelScroll(spec, scrollTo), handlers, showRow };
};
