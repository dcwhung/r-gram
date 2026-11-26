/*
 * 電視旋鈕嘅角度（純函數；T-061）。角度係度：0° 向右、順時針為正（同舞台一樣，y 向下）。
 */
import type { Point } from '../../stage/layouts';

const RAD_TO_DEG = 180 / Math.PI;
const HALF_TURN = 180;
const FULL_TURN = 360;

/** 音量把手指住邊：0 = 掃角嘅左端、1 = 右端，中間（0.5）向上 */
export const volumeTurn = (volume: number, sweepDeg: number): number =>
    -sweepDeg / 2 + volume * sweepDeg;

/** pointer 喺中心嘅邊個方向 */
export const pointerAngle = (centre: Point, point: Point): number =>
    Math.atan2(point.y - centre.y, point.x - centre.x) * RAD_TO_DEG;

/** 由 from 轉去 to 最短嗰邊（−180 至 180；順時針為正） */
export const turnDelta = (fromDeg: number, toDeg: number): number => {
    const delta = (((toDeg - fromDeg) % FULL_TURN) + FULL_TURN) % FULL_TURN;
    return delta > HALF_TURN ? delta - FULL_TURN : delta;
};

/** 扭咗 turnedDeg 之後嘅音量（成個掃角 = 0 至 1），夾喺 0 至 1 */
export const volumeAfterTurn = (start: number, turnedDeg: number, sweepDeg: number): number =>
    Math.min(1, Math.max(0, start + turnedDeg / sweepDeg));

/** 扭咗幾多格（每格 stepDeg；向右正、向左負；唔夠一格唔算） */
export const seekStepsFor = (turnedDeg: number, stepDeg: number): number =>
    Math.trunc(turnedDeg / stepDeg);
