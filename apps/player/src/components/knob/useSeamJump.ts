/*
 * 頭尾相接（設計稿第 20 版；Functional Spec CR-009 決定 4）：指針跨過 ♥ 同第一隻碟之間嗰一步唔行過場，
 * 由刻度尾即刻跳返刻度頭（或者倒轉），唔會轉成個刻度弧返去。
 * `jump` 淨係講啱啱嗰一步（S-218）：
 * - 擰、方向鍵：嗰一步行最短路跨過接駁位（♥ ↔ 第一隻碟）= 跳；Home / End 唔當跳
 * - Esc 取消（用戶 2026-11-26「改成滑返去」）：數今次手勢淨係過咗接駁位幾多次（向前 +1、向後 −1，
 *   Home / End 唔計）。唔係 0（真係過咗 ♥）= 跳返開始嗰隻碟；係 0（從來冇過，或者過咗又倒返轉頭）=
 *   指針沿刻度掃返去，幾長都照掃
 * - Enter、放手、focus 離開：唔係一步，冇跳
 * - 唔係旋鈕要求嘅改動（例如㩒 ♥ 掣）：唔跳
 */
import { useRef, useState } from 'react';
import { ringDelta } from '../../utils/ring';
import { crossesSeam } from './knobTurn';

/** 旋鈕要求緊嘅一步：去邊格、跳唔跳 */
interface Step {
    to: number;
    jump: boolean;
}

export interface SeamJump {
    /** 而家指住嗰格係咪啱啱跳過嚟（指針唔行過場） */
    jump: boolean;
    /** 擰、方向鍵：要求去 `to`；`mayJump` false = Home / End */
    turn: (to: number, mayJump: boolean) => void;
    /** 開始揀碟：記低開始嗰格（取消會返去） */
    start: () => void;
    /** 取消：返去開始嗰格 */
    cancel: () => void;
    /** 完成：冇一步，唔跳 */
    finish: () => void;
}

/** 一步跨過接駁位嘅方向：+1 = 由 ♥ 去第一隻碟、−1 = 倒轉、0 = 冇跨過 */
const seamCrossing = (from: number, to: number, positions: number): number =>
    crossesSeam(from, to, positions) ? Math.sign(ringDelta(from, to, positions)) : 0;

/** 今次揀碟嘅開始嗰格同淨係過咗接駁位幾多次（向前 +1、向後 −1） */
interface Gesture {
    startAt: number;
    laps: number;
}

export const useSeamJump = (current: number, positions: number): SeamJump => {
    const [pending, setPending] = useState<Step | null>(null);
    const [shown, setShown] = useState({ current, jump: false });
    // 未經 start（例如一開始已經喺度揀緊）：當開始嗰格係第一次 render 嗰格
    const gesture = useRef<Gesture>({ startAt: current, laps: 0 });
    // 「render 期間調整 state」：指住嗰格一變，就喺同一次 render 決定呢一步跳唔跳
    if (shown.current !== current) {
        setShown({ current, jump: pending !== null && pending.to === current && pending.jump });
        setPending(null);
    }
    return {
        jump: shown.jump,
        turn: (to, mayJump) => {
            // Home / End 沿刻度轉過去，唔算過接駁位
            const crossing = mayJump ? seamCrossing(current, to, positions) : 0;
            gesture.current.laps += crossing;
            setPending({ to, jump: crossing !== 0 });
        },
        start: () => {
            gesture.current = { startAt: current, laps: 0 };
        },
        cancel: () => {
            const { startAt, laps } = gesture.current;
            gesture.current = { startAt, laps: 0 };
            setPending({ to: startAt, jump: laps !== 0 });
        },
        finish: () => setShown({ current, jump: false }),
    };
};
