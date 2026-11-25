/*
 * 唱片夾上面嘅 play / pause、進度圈同落影（設計稿 spindle()）。
 * 「× r」= 以唱片夾半徑做 1；其餘係設計單位或者度。唱片夾本體喺 Clamp.tsx（設計稿 clamp()）。
 */
export const SPINDLE_SHAPE = {
    /** 唱片夾嘅落影：偏移、深淺 */
    shadow: { dx: 0, dy: 5, opacity: 0.4 },
    /** 歌單入面圍住唱片夾嘅白圈：線粗 */
    listRing: { width: 3 },
    /** play 三角：歌單、暫停時嘅大細（× r）；左邊兩點嘅 x 同 y、右邊尖嘅 x（× 大細） */
    play: { listSize: 0.62, pausedSize: 0.5, back: 0.42, halfHeight: 0.56, tip: 0.62 },
    /** pause 兩條直條：闊、高（× r）；圓角、左右兩條嘅 x（× 闊） */
    pause: { width: 0.17, height: 0.56, corner: 0.25, leftX: -1.45, rightX: 0.45 },
    /** 進度圈：半徑、線粗（× r，最少 minWidth）；icon 底下壓暗嗰個圓（× r）；由 12 點鐘開始 */
    ring: { r: 0.84, width: 0.1, minWidth: 5, backdrop: 0.74, startDeg: -90 },
} as const;
