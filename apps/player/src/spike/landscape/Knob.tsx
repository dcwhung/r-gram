import { type PointerEvent, useRef, useState } from 'react';
import { TEXT } from '../text';

/** 每格幾多度（旋鈕擰一格 = 數字加減 1） */
const STEP_DEG = 30;
const HALF_TURN = 180;
const FULL_TURN = 360;
const DEG_PER_RAD = HALF_TURN / Math.PI;

/** 同產品 `useKnobTurn` 一樣：直接用 clientX／clientY 計角度（Technical Spec：轉 90° 之後角度差唔變，唔使改） */
const angleAt = (element: HTMLElement, clientX: number, clientY: number): number => {
    const box = element.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * DEG_PER_RAD;
};

/** 角度差收窄到 −180 至 180（跨過 ±180 嗰下唔好跳成個圈） */
const turnDelta = (from: number, to: number): number => {
    const raw = to - from;
    return ((((raw + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN;
};

export const Knob = () => {
    const [value, setValue] = useState(0);
    const drag = useRef<{ angle: number; carry: number } | null>(null);
    const down = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
            angle: angleAt(event.currentTarget, event.clientX, event.clientY),
            carry: 0,
        };
    };
    const move = (event: PointerEvent<HTMLDivElement>) => {
        const state = drag.current;
        if (!state) return;
        const angle = angleAt(event.currentTarget, event.clientX, event.clientY);
        const carry = state.carry + turnDelta(state.angle, angle);
        const steps = Math.trunc(carry / STEP_DEG);
        drag.current = { angle, carry: carry - steps * STEP_DEG };
        if (steps !== 0) setValue((current) => current + steps);
    };
    const up = () => {
        drag.current = null;
    };
    return (
        <div className="spike-knob-wrap">
            <div
                className="spike-knob"
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                data-testid="knob"
                data-value={value}
            >
                <div
                    className="spike-knob-mark"
                    style={{ transform: `rotate(${value * STEP_DEG}deg)` }}
                />
            </div>
            <p>{TEXT.landscape.position(value)}</p>
        </div>
    );
};
