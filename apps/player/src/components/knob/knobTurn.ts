/*
 * 擰旋鈕（純函數；Functional Spec CR-002「轉碟」入口 = 拖住大旋鈕打圈；Technical Spec：拖動吸附去最近一格）。
 * 同真旋鈕一樣：pointer 圍住旋鈕中心轉幾多度，指針就轉幾多度，吸附去最近嘅刻度格。
 * 順時針（螢幕角度增加，y 向下）= 後面嘅碟。第 20 版頭尾相接：擰過 ♥ 就係第一隻碟，由第一隻碟向後擰就係 ♥；
 * 一路擰就一路兜圈（刻度弧照舊，指針由刻度尾跳返刻度頭）。
 */
import { mod, ringDelta } from '../../utils/ring';

const HALF_TURN_DEG = 180;
const FULL_TURN_DEG = 360;

export interface KnobTurn {
    /** 㩒落去嗰陣指住邊格 */
    startPos: number;
    /** 由㩒落去起計轉咗幾多度（一個手勢入面累積，可以超過一圈） */
    turnedDeg: number;
    /** 上一次 pointer 嘅角度；null = 未有（啱啱㩒落或者喺中心死區入面） */
    lastDeg: number | null;
}

export interface TurnLimits {
    /** 刻度每格幾多度 */
    stepDeg: number;
    /** 格數（連 ♥） */
    positions: number;
}

export const startTurn = (startPos: number): KnobTurn => ({
    startPos,
    turnedDeg: 0,
    lastDeg: null,
});

/** 由 from 轉去 to 嘅最短角度（−180 至 180） */
export const turnDelta = (fromDeg: number, toDeg: number): number => {
    const delta = (((toDeg - fromDeg) % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;
    return delta > HALF_TURN_DEG ? delta - FULL_TURN_DEG : delta;
};

/** pointer 去咗 pointDeg（null = 去咗旋鈕中心嘅死區） */
export const moveTurn = (turn: KnobTurn, pointDeg: number | null): KnobTurn => {
    if (pointDeg === null) return { ...turn, lastDeg: null };
    if (turn.lastDeg === null) return { ...turn, lastDeg: pointDeg };
    const turnedDeg = turn.turnedDeg + turnDelta(turn.lastDeg, pointDeg);
    return { ...turn, turnedDeg, lastDeg: pointDeg };
};

/** 而家指住邊格（頭尾相接：摺返入 0 至 positions − 1） */
export const turnedPosition = (turn: KnobTurn, { stepDeg, positions }: TurnLimits): number => {
    if (positions <= 1 || stepDeg <= 0) return 0;
    return mod(turn.startPos + Math.round(turn.turnedDeg / stepDeg), positions);
};

/**
 * 由 from 一步去 to 有冇跨過 ♥ 同第一隻碟之間（行最短嗰邊）：跨過就係指針由刻度尾跳返刻度頭（或者倒返轉）
 */
export const crossesSeam = (from: number, to: number, positions: number): boolean =>
    Math.abs(ringDelta(from, to, positions)) < Math.abs(to - from);

/** 鍵盤：方向鍵逐格（頭尾相接）、Home / End 去頭尾（♥）；其他鍵 = null */
const KEY_MOVES: Readonly<Record<string, (current: number, last: number) => number>> = {
    ArrowRight: (current) => current + 1,
    ArrowUp: (current) => current + 1,
    ArrowLeft: (current) => current - 1,
    ArrowDown: (current) => current - 1,
    Home: () => 0,
    End: (_current, last) => last,
};

export const keyTarget = (key: string, current: number, positions: number): number | null => {
    if (!Object.hasOwn(KEY_MOVES, key)) return null;
    return mod(KEY_MOVES[key]?.(current, positions - 1) ?? current, positions);
};
