import { type PointerEvent, useRef, useState } from 'react';
import { TEXT } from '../text';
import { type QuarterTurn, stageDelta } from './rotation';

const ROWS = 30;
const ROW_HEIGHT_PX = 44;
/** 拖到底之後仲睇到嘅高度（大約清單框高） */
const VISIBLE_PX = 220;
const MIN_OFFSET = -(ROWS * ROW_HEIGHT_PX - VISIBLE_PX);

const clamp = (value: number) => Math.min(0, Math.max(MIN_OFFSET, value));

/**
 * 拖動清單：手指移動經 `stageDelta()` 轉做舞台方向（T-111 `useDragScroll` 嘅做法），
 * 所以打橫反方向轉之後，清單都應該跟住手指走
 */
export const DragList = ({ turn }: { turn: QuarterTurn }) => {
    const [offset, setOffset] = useState(0);
    const last = useRef<{ x: number; y: number } | null>(null);
    const down = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        last.current = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent<HTMLDivElement>) => {
        const from = last.current;
        if (!from) return;
        const { dy } = stageDelta(turn, event.clientX - from.x, event.clientY - from.y);
        last.current = { x: event.clientX, y: event.clientY };
        setOffset((value) => clamp(value + dy));
    };
    const up = () => {
        last.current = null;
    };
    return (
        <div
            className="spike-drag-list"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            data-testid="drag-list"
            data-offset={Math.round(offset)}
        >
            <div style={{ transform: `translateY(${offset}px)` }}>
                {Array.from({ length: ROWS }, (_, index) => (
                    <div key={index} className="spike-drag-row">
                        {TEXT.landscape.row(index + 1)}
                    </div>
                ))}
            </div>
        </div>
    );
};
