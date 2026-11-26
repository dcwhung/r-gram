/*
 * MV 電視嘅幾何表型別（設計稿 TV 同 tvSet()；T-060）。除咗 `x`、`y`、`rise`，全部係機身入面嘅座標（機身左上 = 0, 0）。
 */
import type { Point } from './types';

export interface TvBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** 螢幕形狀（設計稿 crtPath）：上下左右邊向外拱，四角圓 */
export interface TvCurve extends TvBox {
    bulgeX: number;
    bulgeY: number;
    corner: number;
}

export interface TvLayout {
    /** 機身左上（貼底組：高身手機跟畫面底，FR-039）、闊、高、圓角 */
    x: number;
    y: number;
    w: number;
    h: number;
    corner: number;
    /** 升起之前喺最後位置下面幾遠（設計稿 tvRise 嘅 translateY）；收埋時落返去 */
    rise: number;
    /** 鋁殼三層（外斜邊 → 內斜邊 → 正面）每層縮入幾多；落影向下幾多 */
    shell: { insets: readonly [number, number]; shadowDy: number };
    /** 凹入嘅深灰面板 */
    front: TvBox & { corner: number };
    /** 暖白斜邊框：外框、三層各縮入幾多、拱位、圓角（每縮 1 圓角少 cornerShrink） */
    mask: TvBox & {
        insets: readonly number[];
        bulgeX: number;
        bulgeY: number;
        corner: number;
        cornerShrink: number;
    };
    /** 玻璃；`rim` = 外面黑膠邊闊幾多、圓角大幾多 */
    glass: TvCurve & { rim: number; rimCorner: number };
    /** 右邊控制板、喇叭坑 */
    panel: TvBox & {
        corner: number;
        grille: { top: number; bottom: number; pitch: number; inset: number; slot: number };
    };
    /** 兩粒大旋鈕：音量（上）、快轉／倒轉（下）；`rim` = 黑底盤比刻度圈大幾多；icon 喺刻度圈下面幾遠 */
    knobs: {
        x: number;
        volumeY: number;
        seekY: number;
        r: number;
        dialR: number;
        rim: number;
        ticks: number;
        glyphGap: number;
        /** 音量把手由靜（左下）到最大（右下）扭幾多度（T-061） */
        sweepDeg: number;
        /** 快轉／倒轉：每扭幾多度算一格；把手開始時嘅角度（設計稿 −63°） */
        seekStepDeg: number;
        seekRestDeg: number;
        /** pointer 郁過幾多 CSS px 先算扭（之下 = 㩒一下） */
        dragThresholdPx: number;
    };
    /** 機身下面：進度線、指示燈、`MV` + 歌名、時間、散熱坑 */
    strip: {
        lineX: number;
        lineY: number;
        lineW: number;
        lineH: number;
        textY: number;
        led: { x: number; dy: number; r: number; halo: number };
        mv: { x: number; size: number };
        title: { x: number; size: number; gap: number };
        time: { size: number; spacing: number };
        vents: { count: number; pitch: number; w: number; dy: number };
    };
    /** ▶ ❚❚ ■（D26：搬去機身下面；半徑 30、中心距 122） */
    buttons: { y: number; r: number; ringGap: number; xs: readonly number[] };
    /** 天線：座（機身頂、置中）、兩支桿（由座伸出）、球頭半徑 */
    antenna: {
        baseY: number;
        mount: { w: number; h: number; y: number };
        rods: readonly Point[];
        ball: number;
    };
    /** 腳：離機身兩邊幾遠、向外斜幾多度、分幾多段上色、由邊度起係黑色膠腳、頂同底半闊、藏喺機身後面幾多、加長 */
    leg: {
        inset: number;
        leanDeg: number;
        slices: number;
        tipFrom: number;
        topHalf: number;
        tipHalf: number;
        tuck: number;
        length: number;
    };
}
