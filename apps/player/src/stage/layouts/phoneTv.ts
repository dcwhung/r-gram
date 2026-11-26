import type { TvLayout } from './tvTypes';

/*
 * MV 電視（T-060）照設計稿 TV（尺寸沿用 v16 anim.js）同 tvSet()、tvLeg()、tvDial() 入面寫死嘅數：
 * ▶ ❚❚ ■ 搬去機身下面嗰條（D26），每粒 44pt 感應範圍唔重疊；腳加長到 92（v16 係 58）。
 * 擺位（Functional Spec「覆蓋層」：T-060 定，建議跟畫面底）：喺貼底組，高身手機跟畫面底，隻腳企喺畫面底。
 */
export const PHONE_TV: TvLayout = {
    x: 36,
    y: 928,
    w: 1008,
    h: 900,
    corner: 50,
    rise: 1090,
    shell: { insets: [8, 15], shadowDy: 10 },
    front: { x: 26, y: 26, w: 956, h: 680, corner: 34 },
    mask: {
        x: 44,
        y: 44,
        w: 746,
        h: 644,
        insets: [0, 12, 22],
        bulgeX: 5,
        bulgeY: 9,
        corner: 66,
        cornerShrink: 0.5,
    },
    glass: {
        x: 88,
        y: 86,
        w: 658,
        h: 560,
        bulgeX: 7,
        bulgeY: 20,
        corner: 60,
        rim: 10,
        rimCorner: 8,
    },
    panel: {
        x: 806,
        y: 44,
        w: 158,
        h: 644,
        corner: 26,
        grille: { top: 24, bottom: 136, pitch: 15, inset: 22, slot: 6 },
    },
    /*
     * 兩粒旋鈕（T-061）：設計稿只畫咗樣（把手 26°、−63°），點扭由呢度定（US-007「點樣扭要先出 mockup 確認」；🅰️）：
     * 音量把手掃 270°（真收音機旋鈕常見嘅掃角，最細喺左下、最大喺右下）；快轉／倒轉每扭 30°（刻度兩格）一格；
     * 拖動門檻同其他旋鈕一樣 6 px
     */
    knobs: {
        x: 885,
        volumeY: 300,
        seekY: 520,
        r: 44,
        dialR: 64,
        rim: 7,
        ticks: 24,
        glyphGap: 26,
        sweepDeg: 270,
        seekStepDeg: 30,
        seekRestDeg: -63,
        dragThresholdPx: 6,
    },
    strip: {
        lineX: 70,
        lineY: 729,
        lineW: 530,
        lineH: 6,
        textY: 804,
        led: { x: 86, dy: -13, r: 9, halo: 14 },
        mv: { x: 114, size: 34 },
        title: { x: 194, size: 40, gap: 24 },
        time: { size: 30, spacing: 3 },
        vents: { count: 22, pitch: 24, w: 13, dy: 42 },
    },
    buttons: { y: 800, r: 30, ringGap: 8, xs: [700, 822, 944] },
    antenna: {
        baseY: 6,
        mount: { w: 88, h: 30, y: -14 },
        rods: [
            { x: -210, y: -300 },
            { x: 200, y: -340 },
        ],
        ball: 10,
    },
    leg: {
        inset: 176,
        leanDeg: 11.5,
        slices: 12,
        tipFrom: 2 / 3,
        topHalf: 27,
        tipHalf: 12,
        tuck: 22,
        length: 92,
    },
};
