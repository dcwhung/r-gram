import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import type { StageLayout } from '../../stage/layouts';
import { keyTarget, type KnobTurn, moveTurn, startTurn, turnedPosition } from './knobTurn';

const RAD_TO_DEG = 180 / Math.PI;
/** 完成揀碟（留喺指住嗰隻碟）嘅鍵 */
const FINISH_KEY = 'Enter';
/** 取消揀碟（返去開始嗰隻碟）嘅鍵（S-154） */
const CANCEL_KEY = 'Escape';

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
    /** 取消揀碟（收埋字母盤，返去開始嗰隻碟） */
    onCancel: () => void;
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
    /** 開始呢個手勢嘅 pointer：其他 pointer（第二隻手指）唔理（S-150） */
    pointerId: number;
    knob: KnobOnScreen;
    turn: KnobTurn;
    /** 上一次報咗邊格（冇變就唔再報） */
    reported: number;
}

/** 滑鼠左掣；手指同筆㩒落都係呢個值 */
const PRIMARY_BUTTON = 0;

/** pointer 郁咗：計新嘅格，變咗先報 */
const dragTo = (drag: Drag, event: PointerEvent, options: KnobTurnOptions) => {
    const limits = limitsOf(options);
    drag.turn = moveTurn(drag.turn, angleOf(drag.knob, event), limits);
    const position = turnedPosition(drag.turn, limits);
    if (position === drag.reported) return;
    drag.reported = position;
    options.onTurn(position);
};

/** 㩒落：主掣、而且未有手勢先開始；記低 pointerId，攞 pointer capture */
const grab = (event: PointerEvent<SVGGElement>, hit: Element | null, options: KnobTurnOptions) => {
    if (event.button !== PRIMARY_BUTTON) return null;
    const knob = measure(hit, options.layout.knob.turnDeadZone);
    if (!knob) return null;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const turn = moveTurn(startTurn(options.current), angleOf(knob, event), limitsOf(options));
    return { pointerId: event.pointerId, knob, turn, reported: options.current };
};

/**
 * 擰旋鈕嘅手勢（Functional Spec CR-002「轉碟」：拖住大旋鈕打圈）：㩒住 = 打開字母盤；pointer 圍住旋鈕轉 =
 * 指針跟住轉，吸附去最近一格（knobTurn.ts）；放手 = 揀咗。pointer capture：手指離開旋鈕都照轉；
 * 冇咗 capture（例如系統搶咗手勢）當放手。只跟㩒落嗰個 pointer（S-150）。
 */
const usePointerTurn = (options: KnobTurnOptions) => {
    const hitRef = useRef<SVGCircleElement>(null);
    const drag = useRef<Drag | null>(null);
    const ours = (event: PointerEvent) => drag.current?.pointerId === event.pointerId;
    const onPointerDown = (event: PointerEvent<SVGGElement>) => {
        if (drag.current) return;
        drag.current = grab(event, hitRef.current, options);
        if (drag.current) options.onStart();
    };
    const onPointerUp = (event: PointerEvent) => {
        if (!ours(event)) return;
        drag.current = null;
        options.onEnd();
    };
    const onPointerMove = (event: PointerEvent) => {
        if (drag.current && ours(event)) dragTo(drag.current, event, options);
    };
    const pointer = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
    return { hitRef, drag, ...pointer, onLostPointerCapture: onPointerUp };
};

/** Enter = 完成；Esc = 取消（拖緊都放棄埋個手勢，之後嘅 move / 放手唔理）；字母盤閂埋就唔理 */
const finishByKey = (
    event: KeyboardEvent,
    options: KnobTurnOptions,
    drag: { current: unknown },
) => {
    if (!options.open) return;
    event.preventDefault();
    if (event.key === FINISH_KEY) {
        options.onEnd();
        return;
    }
    drag.current = null;
    options.onCancel();
};

/** 鍵盤（US-012）：方向鍵 / Home / End 打開字母盤兼轉；Enter 或者 focus 離開 = 完成；Esc = 取消（S-154） */
const keyboardTurn = (options: KnobTurnOptions, drag: { current: unknown }) => ({
    onKeyDown: (event: KeyboardEvent) => {
        if (event.key === FINISH_KEY || event.key === CANCEL_KEY) {
            finishByKey(event, options, drag);
            return;
        }
        const target = keyTarget(event.key, options.current, options.positions);
        if (target === null) return;
        event.preventDefault();
        if (!options.open) options.onStart();
        if (target !== options.current) options.onTurn(target);
    },
    onBlur: () => {
        if (options.open && drag.current === null) options.onEnd();
    },
});

export const useKnobTurn = (options: KnobTurnOptions) => {
    const { hitRef, drag, ...pointer } = usePointerTurn(options);
    const keyboard = keyboardTurn(options, drag);
    return { hitRef, handlers: { ...pointer, ...keyboard } };
};
