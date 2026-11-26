import { type KeyboardEvent, type PointerEvent, type RefObject, useEffect, useRef } from 'react';
import { MOTION } from '../../config/motion';
import type { StageLayout } from '../../stage/layouts';
import { keyTarget, type KnobTurn, moveTurn, startTurn, turnedPosition } from './knobTurn';
import { type SeamJump, useSeamJump } from './useSeamJump';

const RAD_TO_DEG = 180 / Math.PI;
/** 完成揀碟（留喺指住嗰隻碟）嘅鍵 */
const FINISH_KEY = 'Enter';
/** 取消揀碟（返去開始嗰隻碟）嘅鍵（S-154） */
const CANCEL_KEY = 'Escape';
/** 直接去頭尾嘅鍵：唔當跨過 ♥ 同第一隻碟之間（指針照舊轉過去） */
const EDGE_KEYS: readonly string[] = ['Home', 'End'];

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
    /** 㩒落嘅位置（CSS px）：郁過 turnThresholdPx 就當開始擰 */
    startX: number;
    startY: number;
    /** 字母盤開咗未（S-152：㩒住夠時間或者開始擰先開） */
    opened: boolean;
}

/** 滑鼠左掣；手指同筆㩒落都係呢個值 */
const PRIMARY_BUTTON = 0;

/** pointer 郁咗：計新嘅格，變咗先報 */
const dragTo = (drag: Drag, event: PointerEvent, options: KnobTurnOptions) => {
    const limits = limitsOf(options);
    drag.turn = moveTurn(drag.turn, angleOf(drag.knob, event));
    const position = turnedPosition(drag.turn, limits);
    if (position === drag.reported) return;
    drag.reported = position;
    options.onTurn(position);
};

/** 㩒落：主掣、而且未有手勢先開始；記低 pointerId，攞 pointer capture */
const grab = (
    event: PointerEvent<SVGGElement>,
    hit: Element | null,
    options: KnobTurnOptions,
): Drag | null => {
    if (event.button !== PRIMARY_BUTTON) return null;
    const knob = measure(hit, options.layout.knob.turnDeadZone);
    if (!knob) return null;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const turn = moveTurn(startTurn(options.current), angleOf(knob, event));
    const { clientX: startX, clientY: startY } = event;
    return {
        pointerId: event.pointerId,
        knob,
        turn,
        reported: options.current,
        startX,
        startY,
        opened: false,
    };
};

/** 未開字母盤時郁咗幾遠先當開始擰 */
const startsTurning = (drag: Drag, event: PointerEvent, options: KnobTurnOptions) =>
    Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >=
    options.layout.knob.turnThresholdPx;

/** 㩒住夠 dialHoldMs 嘅計時；unmount 時取消（S-152） */
const useHoldTimer = () => {
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cancel = () => clearTimeout(timer.current);
    const start = (onHeld: () => void) => {
        cancel();
        timer.current = setTimeout(onHeld, MOTION.input.dialHoldMs);
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    return { start, cancel };
};

/** 最新嘅 options：計時器嘅 callback 喺之前嗰次 render 砌，要讀最新嘅 onStart */
const useLatest = <T>(value: T): RefObject<T> => {
    const latest = useRef(value);
    useEffect(() => {
        latest.current = value;
    });
    return latest;
};

type DragRef = RefObject<Drag | null>;

/** 開字母盤（只開一次） */
const openDial = (drag: DragRef, latest: RefObject<KnobTurnOptions>) => {
    if (!drag.current || drag.current.opened) return;
    drag.current.opened = true;
    latest.current.onStart();
};

/** 拖緊時郁：未開就要郁過門檻先開（即刻），開咗就轉 */
const moveDrag = (drag: DragRef, latest: RefObject<KnobTurnOptions>, event: PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return false;
    if (!current.opened && !startsTurning(current, event, latest.current)) return false;
    openDial(drag, latest);
    dragTo(current, event, latest.current);
    return true;
};

/**
 * 擰旋鈕嘅手勢（Functional Spec CR-002「轉碟」：拖住大旋鈕打圈）：㩒住 dialHoldMs 或者郁過 turnThresholdPx
 * 先打開字母盤（S-152：輕點冇反應）；pointer 圍住旋鈕轉 = 指針跟住轉，吸附去最近一格（knobTurn.ts）；
 * 放手 = 揀咗。pointer capture：手指離開旋鈕都照轉；冇咗 capture（例如系統搶咗手勢）當放手。
 * 只跟㩒落嗰個 pointer（S-150）。未開就放手、取消、離開 = 乜都唔做。
 */
const usePointerTurn = (options: KnobTurnOptions) => {
    const hitRef = useRef<SVGCircleElement>(null);
    const drag = useRef<Drag | null>(null);
    const latest = useLatest(options);
    const hold = useHoldTimer();
    const ours = (event: PointerEvent) => drag.current?.pointerId === event.pointerId;
    const onPointerDown = (event: PointerEvent<SVGGElement>) => {
        if (drag.current) return;
        drag.current = grab(event, hitRef.current, options);
        if (drag.current) hold.start(() => openDial(drag, latest));
    };
    const onPointerUp = (event: PointerEvent) => {
        if (!ours(event)) return;
        hold.cancel();
        const opened = drag.current?.opened ?? false;
        drag.current = null;
        if (opened) options.onEnd();
    };
    const onPointerMove = (event: PointerEvent) => {
        if (moveDrag(drag, latest, event)) hold.cancel();
    };
    // 有 capture 時離開只會喺放手之後先嚟；冇 capture 而又未開：當放棄
    const onPointerLeave = (event: PointerEvent) => {
        if (ours(event) && !drag.current?.opened) onPointerUp(event);
    };
    const pointer = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
    return { hitRef, drag, hold, ...pointer, onPointerLeave, onLostPointerCapture: onPointerUp };
};

/** Enter = 完成；Esc = 取消（拖緊都放棄埋個手勢，之後嘅 move / 放手唔理）；字母盤閂埋就唔理 */
const finishByKey = (
    event: KeyboardEvent,
    options: KnobTurnOptions,
    drag: { current: unknown },
    cancelHold: () => void,
) => {
    if (!options.open) return;
    event.preventDefault();
    if (event.key === FINISH_KEY) {
        options.onEnd();
        return;
    }
    drag.current = null;
    cancelHold();
    options.onCancel();
};

/** 鍵盤（US-012）：方向鍵 / Home / End 打開字母盤兼轉；Enter 或者 focus 離開 = 完成；Esc = 取消（S-154） */
const keyboardTurn = (
    options: KnobTurnOptions,
    drag: { current: unknown },
    cancelHold: () => void,
    turn: (position: number, mayJump: boolean) => void,
) => ({
    onKeyDown: (event: KeyboardEvent) => {
        if (event.key === FINISH_KEY || event.key === CANCEL_KEY) {
            finishByKey(event, options, drag, cancelHold);
            return;
        }
        const target = keyTarget(event.key, options.current, options.positions);
        if (target === null) return;
        event.preventDefault();
        if (!options.open) options.onStart();
        if (target !== options.current) turn(target, !EDGE_KEYS.includes(event.key));
    },
    onBlur: () => {
        if (options.open && drag.current === null) options.onEnd();
    },
});

/** 將開始、每一步、完成同取消都話畀 useSeamJump 知（指針跨過 ♥ 同第一隻碟之間就跳，S-218） */
const withSeamJump = (options: KnobTurnOptions, seam: SeamJump): KnobTurnOptions => ({
    ...options,
    onStart: () => {
        seam.start();
        options.onStart();
    },
    onTurn: (position) => {
        seam.turn(position, true);
        options.onTurn(position);
    },
    onEnd: () => {
        seam.finish();
        options.onEnd();
    },
    onCancel: () => {
        seam.cancel();
        options.onCancel();
    },
});

export const useKnobTurn = (options: KnobTurnOptions) => {
    const seam = useSeamJump(options.current, options.positions);
    const tracked = withSeamJump(options, seam);
    const { hitRef, drag, hold, ...pointer } = usePointerTurn(tracked);
    /** 鍵盤嘅一步：Home / End 照轉，但唔當跳 */
    const turn = (position: number, mayJump: boolean) => {
        seam.turn(position, mayJump);
        options.onTurn(position);
    };
    const keyboard = keyboardTurn(tracked, drag, hold.cancel, turn);
    return { hitRef, jump: seam.jump, handlers: { ...pointer, ...keyboard } };
};
