import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../fitStage';
import { circleLeftAt } from '../geometry';
import type { StageLayout } from './types';

/*
 * 手機直度。數值以已確認嘅設計稿做準：_mockups_/home-turntable/src/template.html（第 15 版）嘅常數
 *（DISC、PLATTER、HUB、ARM、ORBIT、BTN、BUTTONS、KNOB、SCALE、DIAL、SCREWS、LIST / ARC）。
 * 改數值之前先改設計稿並取得確認；clearance.test.ts 會驗淨空規則同設計稿嘅量度值。
 */
const DISC = { x: 940, y: 1196, r: 700 };
const PLATTER_RADIUS = 716;
const KNOB_Y = 1784;
const KNOB_RADIUS = 76;
const BUTTON_COLUMN_X = 112;
const SCREW_INSET = 62;

export const PHONE_LAYOUT: StageLayout = {
    id: 'phone',
    disc: DISC,
    platter: { r: PLATTER_RADIUS },
    hub: { clear: 0.16, clamp: 0.118, rim: 0.972 },
    arm: { x: 900, y: 330, length: 640, base: 92, parkDeg: 176, playDeg: 99 },
    orbit: { r: 1000, startDeg: -48, stepDeg: 30, scale: 0.72, veil: 0.42, spread: 0.9 },
    buttons: {
        r: 44,
        ringGap: 9,
        ringWidth: 3.5,
        iconSize: 52,
        items: [
            { id: 'booklet', x: BUTTON_COLUMN_X, y: 1380 },
            { id: 'mv', x: BUTTON_COLUMN_X, y: 1510 },
            { id: 'mode', x: BUTTON_COLUMN_X, y: 1640 },
        ],
    },
    // 旋鈕喺畫面左邊同轉盤邊嘅正中間：位置由轉盤計出嚟，唔寫死
    knob: {
        x: Math.round(circleLeftAt(DISC, PLATTER_RADIUS, KNOB_Y) / 2),
        y: KNOB_Y,
        r: KNOB_RADIUS,
        heartHitGap: 10,
    },
    scale: {
        fromDeg: 185,
        stepDeg: 11.25,
        inner: 92,
        outer: 104,
        long: 112,
        heart: 26,
        heartGap: 18,
    },
    dial: { inner: 186, outer: 288, letters: 237, current: 46, other: 28 },
    screws: {
        // 右下角喺碟底下，見唔到，所以得三粒
        points: [
            { x: SCREW_INSET, y: SCREW_INSET },
            { x: SCREW_INSET, y: DESIGN_HEIGHT - SCREW_INSET },
            { x: DESIGN_WIDTH - SCREW_INSET, y: SCREW_INSET },
        ],
        zoneIndex: 1,
    },
    arc: { r: 556, stepDeg: 9.2 },
    clearance: { cd: 16, platter: 40, controlGap: 40, screwZone: 120, hitPt: 44, viewportPt: 390 },
};
