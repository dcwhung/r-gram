import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import type { StageLayout } from '../../stage/layouts';
import { keyTarget, type KnobTurn, moveTurn, startTurn, turnedPosition } from './knobTurn';

const RAD_TO_DEG = 180 / Math.PI;
/** 完成揀碟嘅鍵 */
const FINISH_KEYS: readonly string[] = ['Enter', 'Escape'];

export interface KnobTurnOptions {
    layout: StageLayout;
    positions: number;
    current: number;
    open: boolean;
    /** 開始揀碟（打開字母盤） */
    onStart: () => void;
    /** 指針去咗另一格 */
    onTurn: (position: number) => void;
    /** 完成揀碟（收埋字母盤，留喺指住嗰隻碟） */
    onEnd: () => void;
}

/** 旋鈕喺螢幕上嘅圓心同死區半徑（px）：由感應圈量 */
interface KnobOnScreen {
    x: number;
    y: number;
    deadPx: number;
}

const measure = (hit: Element | null, deadZone: number): KnobOnScreen | null => {
    if (!hit) return null;
    const box = hit.getBoundingClientRect();
    return {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        deadPx: (box.width / 2) * deadZone,
    };
};

/** pointer 喺旋鈕中心嘅角度；太近中心 = null（角度會亂跳） */
const angleOf = (knob: KnobOnScreen, event: PointerEvent) => {
    const dx = event.clientX - knob.x;
    const dy = event.clientY - knob.y;
    return Math.hypot(dx, dy) < knob.deadPx ? null : Math.atan2(dy, dx) * RAD_TO_DEG;
};

const limitsOf = ({ layout, positions }: KnobTurnOptions) => ({
    positions,
    stepDeg: positions > 1 ? (layout.scale.toDeg - layout.scale.fromDeg) / (positions - 1) : 0,
});

interface Drag {
    knob: KnobOnScreen;
    turn: KnobTurn;
    /** 上一次報咗邊格（冇變就唔再報） */
    reported: number;
}

/** pointer 郁咗：計新嘅格，變咗先報 */
const dragTo = (drag: Drag, event: PointerEvent, options: KnobTurnOptions) => {
    const limits = limitsOf(options);
    drag.turn = moveTurn(drag.turn, angleOf(drag.knob, event), limits);
    const position = turnedPosition(drag.turn, limits);
    if (position === drag.reported) return;
    drag.reported = position;
    options.onTurn(position);
};

/**
 * 擰旋鈕嘅手勢（Functional Spec CR-002「轉碟」：拖住大旋鈕打圈）：㩒住 = 打開字母盤；pointer 圍住旋鈕轉 =
 * 指針跟住轉，吸附去最近一格（knobTurn.ts）；放手 = 揀咗。pointer capture：手指離開旋鈕都照轉。
 */
const usePointerTurn = (options: KnobTurnOptions) => {
    const hitRef = useRef<SVGCircleElement>(null);
    const drag = useRef<Drag | null>(null);
    const onPointerDown = (event: PointerEvent<SVGGElement>) => {
        const knob = measure(hitRef.current, options.layout.knob.turnDeadZone);
        if (!knob) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const turn = moveTurn(startTurn(options.current), angleOf(knob, event), limitsOf(options));
        drag.current = { knob, turn, reported: options.current };
        options.onStart();
    };
    const onPointerUp = () => {
        if (!drag.current) return;
        drag.current = null;
        options.onEnd();
    };
    const onPointerMove = (event: PointerEvent) => {
        if (drag.current) dragTo(drag.current, event, options);
    };
    return {
        hitRef,
        drag,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
    };
};

/** 鍵盤（US-012）：方向鍵 / Home / End 打開字母盤兼轉；Enter、Esc 或者 focus 離開 = 完成 */
const keyboardTurn = (options: KnobTurnOptions, dragging: () => boolean) => ({
    onKeyDown: (event: KeyboardEvent) => {
        if (FINISH_KEYS.includes(event.key)) {
            if (!options.open) return;
            event.preventDefault();
            options.onEnd();
            return;
        }
        const target = keyTarget(event.key, options.current, options.positions);
        if (target === null) return;
        event.preventDefault();
        if (!options.open) options.onStart();
        if (target !== options.current) options.onTurn(target);
    },
    onBlur: () => {
        if (options.open && !dragging()) options.onEnd();
    },
});

export const useKnobTurn = (options: KnobTurnOptions) => {
    const { hitRef, drag, ...pointer } = usePointerTurn(options);
    const keyboard = keyboardTurn(options, () => drag.current !== null);
    return { hitRef, handlers: { ...pointer, ...keyboard } };
};
