import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../fitStage';
import { circleLeftAt } from '../geometry';
import type { StageLayout } from './types';

/*
 * 手機直度。數值以已確認嘅設計稿做準：_mockups_/home-turntable/src/template.html（第 17 版，用戶 2026-11-25 確認）嘅常數
 *（DISC、PLATTER、HUB、ARM、ORBIT、BTN、BUTTONS、KNOB、SCALE、DIAL、SCREWS、LIST / ARC）同 info() 入面嘅位置。
 * 改數值之前先改設計稿並取得確認；clearance.test.ts 會驗淨空規則同設計稿嘅量度值。
 */
const DISC = { x: 940, y: 1196, r: 700 };
const PLATTER_RADIUS = 716;
const KNOB_Y = 1784;
const KNOB_RADIUS = 76;
const BUTTON_COLUMN_X = 112;
const SCREW_INSET = 62;
const ARM = { x: 900, y: 330, length: 640, base: 92, parkDeg: 176, playDeg: 99, bend: -1 } as const;
/*
 * 左上資訊嘅闊度上限：碟名右邊留返同左邊一樣嘅位（T-035 定）；碟名縮字最細 48。
 * 歌名照設計稿第 18 版 SONG_FIT（CR-005 D51）：連後面嘅心形停喺唱臂底座左邊 SONG_ARM_GAP 之外
 *（SONG_FIT.right = ARM.x − ARM.base − 36）；44 → 32 每次縮 2；斷兩行時第二行到 470（泊位嘅唱臂）。
 */
const INFO_X = 70;
const SONG_ARM_GAP = 36;
const TITLE_MIN_SIZE = 48;

export const PHONE_LAYOUT: StageLayout = {
    id: 'phone',
    disc: DISC,
    platter: { r: PLATTER_RADIUS },
    hub: { clear: 0.16, clamp: 0.118, rim: 0.972 },
    arm: ARM,
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
        toDeg: 376.25,
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
    info: {
        title: {
            x: INFO_X,
            latin: { y: 192, size: 88, spacing: 1 },
            cjk: { y: 188, size: 80, spacing: 4 },
            minSize: TITLE_MIN_SIZE,
            maxRight: DESIGN_WIDTH - INFO_X,
        },
        year: { x: 74, y: 244, size: 29, spacing: 6 },
        rule: { gap: 22, y: 234, length: 98, width: 3.5 },
        song: {
            x: 128,
            y: 318,
            size: 44,
            minSize: 32,
            step: 2,
            maxRight: ARM.x - ARM.base - SONG_ARM_GAP,
            lift: 22,
            pitch: 38,
            secondRight: 470,
        },
        bars: {
            x: 74,
            step: 13,
            width: 8,
            height: 30,
            corner: 1.5,
            lift: 2,
            levels: [0.72, 1, 0.5],
        },
        heart: { gap: 46, size: 50, rise: 0.364, stroke: 2.6 },
        track: { x: 74, y: 368, size: 22, spacing: 3 },
        version: { x: 1008, y: 118, size: 22, spacing: 3 },
    },
    arc: { r: 556, stepDeg: 9.2 },
    clearance: { cd: 16, platter: 40, controlGap: 40, screwZone: 120, hitPt: 44, viewportPt: 390 },
};
