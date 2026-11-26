/*
 * 電視旋鈕嘅拖動（T-061）：㩒住旋鈕繞住中心扭，報告由㩒落開始總共扭咗幾多度（順時針為正）；
 * 郁唔夠門檻就放手 = 㩒一下。中心由旋鈕嘅感應圓（`data-knob-hit`）量。只跟第一隻手指。
 */
import { type PointerEvent, useRef } from 'react';
import type { Point } from '../../stage/layouts';
import { pointerAngle, turnDelta } from './knobAngle';

interface Drag {
    pointerId: number;
    centre: Point;
    start: Point;
    last: number;
    turned: number;
    moved: boolean;
}

export interface KnobDragOptions {
    thresholdPx: number;
    disabled: boolean;
    /** 㩒落（開始扭之前）：記低開始嗰陣嘅值 */
    onStart?: () => void;
    onTurn: (turnedDeg: number) => void;
    /** 冇扭過就放手 */
    onTap?: () => void;
    /** 放手（扭完或者㩒完）、被取消 */
    onEnd?: () => void;
}

const HIT = '[data-knob-hit]';
const MAIN_BUTTON = 0;

const pointOf = (event: PointerEvent): Point => ({ x: event.clientX, y: event.clientY });

const centreOf = (knob: Element): Point => {
    const rect = (knob.querySelector(HIT) ?? knob).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const beginDrag = (event: PointerEvent): Drag => {
    const centre = centreOf(event.currentTarget);
    const start = pointOf(event);
    const last = pointerAngle(centre, start);
    return { pointerId: event.pointerId, centre, start, last, turned: 0, moved: false };
};

/** 郁過門檻先算扭；之後每次 move 加上同上次之間嘅角度 */
const follow = (drag: Drag, event: PointerEvent, thresholdPx: number): boolean => {
    const point = pointOf(event);
    const far = Math.hypot(point.x - drag.start.x, point.y - drag.start.y) >= thresholdPx;
    if (!drag.moved && !far) return false;
    drag.moved = true;
    const angle = pointerAngle(drag.centre, point);
    drag.turned += turnDelta(drag.last, angle);
    drag.last = angle;
    return true;
};

export const useKnobDrag = (options: KnobDragOptions) => {
    const { thresholdPx, disabled, onStart, onTurn, onTap, onEnd } = options;
    const drag = useRef<Drag | null>(null);
    const mine = (event: PointerEvent) => drag.current?.pointerId === event.pointerId;
    return {
        onPointerDown: (event: PointerEvent) => {
            if (disabled || drag.current || event.button > MAIN_BUTTON) return;
            drag.current = beginDrag(event);
            event.currentTarget.setPointerCapture?.(event.pointerId);
            onStart?.();
        },
        onPointerMove: (event: PointerEvent) => {
            const current = drag.current;
            if (current && mine(event) && follow(current, event, thresholdPx))
                onTurn(current.turned);
        },
        onPointerUp: (event: PointerEvent) => {
            if (!mine(event)) return;
            const tapped = !drag.current?.moved;
            drag.current = null;
            if (tapped && !disabled) onTap?.();
            onEnd?.();
        },
        onPointerCancel: (event: PointerEvent) => {
            if (!mine(event)) return;
            drag.current = null;
            onEnd?.();
        },
    };
};
