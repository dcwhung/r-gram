/*
 * 唱臂嘅形狀（設計稿 tonearm()）。軸心、臂長、底座半徑、角度同彎向喺幾何表 `arm`；呢度係零件本身嘅比例同細部尺寸。
 * 「× base」= 以底座半徑做 1，「× tube」= 以臂管粗做 1，「× length」= 以臂長做 1；其餘係設計單位或者度。
 */
export const ARM_SHAPE = {
    /** 底座圓面：車床紋角度、斜邊 */
    base: { rot: -28, bevel: 0.07 },
    /** 底座上面一圈螺絲：幾多粒、第一粒喺幾多度；離軸心幾遠、半徑（× base） */
    baseScrews: { count: 4, startDeg: 45, orbit: 0.72, r: 0.07 },
    /** 軸心帽：半徑（× base）、車床紋角度、斜邊；`pin` = 正中嗰粒釘嘅半徑（× base） */
    pivot: { r: 0.34, rot: 60, bevel: 0.14, pin: 0.1 },
    /** 配重：位置同大細（× base）、圓角 */
    counterweight: { x: -1.62, y: -0.4, width: 1.05, height: 0.8, corner: 7 },
    /** 配重連去軸心嗰一截：長（× base）；頂邊同高（× tube） */
    stub: { length: 0.62, y: -0.45, height: 0.9 },
    /** 臂管：粗（× base，最少 minWidth）；管身、頂部反光嘅粗同反光向上移幾多（× tube）；落影偏移 */
    tube: {
        width: 0.2,
        minWidth: 16,
        body: 0.74,
        highlight: 0.22,
        highlightLift: 0.16,
        shadow: { dx: 5, dy: 9 },
    },
    /** 臂管路徑：直身去到 straight（× length）；彎位嘅控制點喺針頭殼前面 curveLead 咁遠 */
    path: { straight: 0.76, curveLead: 20 },
    /** 臂管上面嘅套環：位置（× length）、闊；頂邊同高（× tube）；圓角 */
    collar: { at: 0.42, width: 14, y: -0.62, height: 1.24, corner: 3 },
    /** 針頭殼喺臂尾嘅位置：離臂尾幾遠；彎入幾多、轉幾多度（後兩個乘 arm.bend） */
    head: { inset: 58, drop: 30, turnDeg: 24 },
    /** 以下四項喺針頭殼自己嘅座標入面。連去針頭嗰條線：兩個 y 乘 −arm.bend（喺彎向嘅另一邊） */
    wire: { x1: 22, y1: 15, x2: 44, y2: 42, width: 5 },
    shell: { x: -6, y: -19, width: 66, height: 38, corner: 6 },
    cartridge: { x: 6, y: -12, width: 30, height: 24, corner: 3 },
    /** 小燈：位置、半徑、著燈時光暈嘅半徑 */
    led: { x: 47, y: 0, r: 5.5, glowR: 11 },
    /** 配重同針頭殼外框嘅線粗 */
    outline: 1.5,
} as const;
