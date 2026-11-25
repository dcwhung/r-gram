/*
 * 擰旋鈕（純函數；Functional Spec CR-002「轉碟」入口 = 拖住大旋鈕打圈；Technical Spec：拖動吸附去最近一格）。
 * 同真旋鈕一樣：pointer 圍住旋鈕中心轉幾多度，指針就轉幾多度，吸附去最近嘅刻度格。
 * 順時針（螢幕角度增加，y 向下）= 後面嘅碟；轉過咗頭尾唔會再累積，一轉返轉頭就即刻郁。
 */

const HALF_TURN_DEG = 180;
const FULL_TURN_DEG = 360;
/** 吸附嘅界線：過咗半格就去下一格 */
const SNAP_HALF = 0.5;

export interface KnobTurn {
    /** 㩒落去嗰陣指住邊格 */
    startPos: number;
    /** 由㩒落去起計轉咗幾多度（已經夾喺頭尾之內） */
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** pointer 去咗 pointDeg（null = 去咗旋鈕中心嘅死區） */
export const moveTurn = (turn: KnobTurn, pointDeg: number | null, limits: TurnLimits): KnobTurn => {
    if (pointDeg === null) return { ...turn, lastDeg: null };
    if (turn.lastDeg === null) return { ...turn, lastDeg: pointDeg };
    const { stepDeg, positions } = limits;
    // 頭尾各多半格：喺最尾一格再轉落去唔累積，轉返轉頭即刻郁
    const min = -(turn.startPos + SNAP_HALF) * stepDeg;
    const max = (positions - 1 - turn.startPos + SNAP_HALF) * stepDeg;
    const turnedDeg = clamp(turn.turnedDeg + turnDelta(turn.lastDeg, pointDeg), min, max);
    return { ...turn, turnedDeg, lastDeg: pointDeg };
};

/** 而家指住邊格 */
export const turnedPosition = (turn: KnobTurn, { stepDeg, positions }: TurnLimits): number => {
    if (positions <= 1 || stepDeg <= 0) return 0;
    return clamp(turn.startPos + Math.round(turn.turnedDeg / stepDeg), 0, positions - 1);
};

/** 鍵盤：方向鍵逐格、Home / End 去頭尾（♥）；其他鍵 = null */
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
    const last = positions - 1;
    return clamp(KEY_MOVES[key]?.(current, last) ?? current, 0, last);
};
