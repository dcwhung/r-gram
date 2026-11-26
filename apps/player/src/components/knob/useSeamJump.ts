/*
 * 頭尾相接（設計稿第 20 版；Functional Spec CR-009 決定 4）：指針跨過 ♥ 同第一隻碟之間嗰一步唔行過場，
 * 由刻度尾即刻跳返刻度頭（或者倒轉），唔會轉成個刻度弧返去。
 * `jump` 淨係講啱啱嗰一步（S-218）：
 * - 擰、方向鍵：行最短路跨過接駁位 = 跳；Home / End 唔當跳
 * - Esc 取消：返去開始嗰隻碟都係行最短路，跨過接駁位一樣跳
 * - Enter、放手、focus 離開：唔係一步，冇跳
 * - 唔係旋鈕要求嘅改動（例如㩒 ♥ 掣）：唔跳
 */
import { useRef, useState } from 'react';
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

export const useSeamJump = (current: number, positions: number): SeamJump => {
    const [pending, setPending] = useState<Step | null>(null);
    const [shown, setShown] = useState({ current, jump: false });
    // 未經 start（例如一開始已經喺度揀緊）：當開始嗰格係第一次 render 嗰格
    const startAt = useRef(current);
    // 「render 期間調整 state」：指住嗰格一變，就喺同一次 render 決定呢一步跳唔跳
    if (shown.current !== current) {
        setShown({ current, jump: pending !== null && pending.to === current && pending.jump });
        setPending(null);
    }
    const ask = (to: number, mayJump: boolean) =>
        setPending({ to, jump: mayJump && crossesSeam(current, to, positions) });
    return {
        jump: shown.jump,
        turn: ask,
        start: () => {
            startAt.current = current;
        },
        cancel: () => ask(startAt.current, true),
        finish: () => setShown({ current, jump: false }),
    };
};
