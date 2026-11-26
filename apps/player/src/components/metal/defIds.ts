/* 共用 SVG 定義（漸層、濾鏡、車床紋）嘅 id。成個頁面只 render 一次 <SvgDefs />；元件用 `ref()` 引用 */
export const DEF = {
    dome: 'rg-dome',
    bevel: 'rg-bevel',
    cylinder: 'rg-cylinder',
    clamp: 'rg-clamp',
    ball: 'rg-ball',
    sheen: 'rg-sheen',
    vinyl: 'rg-vinyl',
    stage: 'rg-stage',
    shadow: 'rg-shadow',
    shadowLarge: 'rg-shadow-large',
    glow: 'rg-glow',
    lathe: 'rg-lathe',
} as const;

export type DefId = (typeof DEF)[keyof typeof DEF];

/** `fill` / `stroke` / `filter` 用：`url(#id)` */
export const ref = (id: DefId): string => `url(#${id})`;
