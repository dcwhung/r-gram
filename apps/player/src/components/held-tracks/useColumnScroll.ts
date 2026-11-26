/*
 * 歌單欄嘅欄內捲動（設計稿第 18 版互動格：拖動、滾輪；Technical Spec「補充：第 18 版」捲動）：
 * - 拖動：過咗門檻（CSS px）先當拖，之後捉住 pointer；拖完嗰下 click 唔當㩒（D57；scroll/useDragScroll.ts）
 * - 滾輪：喺欄入面就由欄食咗（non-passive，頁面唔會捲、唔會回彈；scroll/useWheel.ts）
 * - 鍵盤：焦點喺欄本身時上下鍵捲一行、Page Up／Down 一版、Home／End 去頭尾；焦點喺行時同樣嘅鍵移 focus
 *   去另一行（rowFocus.ts，W-042）；focus 到嘅行自動捲入欄
 * 換碟時歸零：元件以碟做 key，換碟 = 新 state。
 */
import { type KeyboardEvent, type RefObject, useCallback, useState } from 'react';
import { useDragScroll } from '../scroll/useDragScroll';
import { useWheel, wheelUnits } from '../scroll/useWheel';
import { clampScroll, type ColumnMetrics, columnMetrics, scrollToShow } from './columnLayout';
import { moveRowFocus, rowIndexOf } from './rowFocus';

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

/** 焦點喺欄本身：按鍵捲欄；處理咗就 true */
const scrollByKey = (key: string, spec: ScrollSpec, most: number, scrollTo: ScrollTo): boolean => {
    const move = keyMove(key, spec, most);
    if (move) scrollTo(move);
    return move !== null;
};

const useWheelScroll = (spec: ScrollSpec, scrollTo: ScrollTo): RefObject<SVGGElement | null> => {
    const { pitch, room, unit } = spec;
    const onWheel = useCallback(
        (event: WheelEvent) => {
            const units = wheelUnits(event, { pitch, room, unit });
            scrollTo((scroll) => scroll + units);
        },
        [pitch, room, unit, scrollTo],
    );
    return useWheel(onWheel);
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
    const listRef = useWheelScroll(spec, scrollTo);
    const onKeyDown = (event: KeyboardEvent) => {
        const row = rowIndexOf(event.target);
        const handled =
            row === null
                ? scrollByKey(event.key, spec, most, scrollTo)
                : moveRowFocus(listRef.current, event.key, row, spec);
        if (handled) event.preventDefault();
    };
    // 穩定嘅 callback：行係 memo（W-043），捲動唔好令佢哋 re-render
    const { pitch, room } = spec;
    const showRow = useCallback(
        (index: number) => scrollTo((scroll) => scrollToShow(index, pitch, room, scroll)),
        [pitch, room, scrollTo],
    );
    const drag = useDragScroll(spec, (units) => scrollTo((scroll) => scroll + units));
    const handlers = { ...drag, onKeyDown };
    return { metrics, listRef, handlers, showRow };
};
