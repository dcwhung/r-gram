/*
 * 布料圖（移植自設計稿 v16 composeFlag() 嘅頭兩步）：黑布 + 白 logo，坐標係布料（平放）嘅設計單位。
 * 2D renderer（flagRenderer.ts，每格再疊光暗圖）同 WebGL renderer（flagGl.ts，畫一次上載做 texture）共用，樣先一樣。
 */
import type { FlagScene } from './flagScene';

export type LogoImage = CanvasImageSource & { width: number; height: number };

/** 布料外面（畫面）嘅黑（同 tokens.css --color-flag-bg）；canvas 讀唔到 CSS 變數 */
export const FLAG_BLACK = '#0a0a0a';
/** 布料底色（v16 composeFlag：純黑，等光暗有對比） */
const CLOTH_BLACK = '#000';
const HALF = 2;

/** 填黑布，logo 載入咗就畫喺 `scene.logo` 嘅位置（以中心定位，保持比例） */
export const paintCloth = (
    ctx: CanvasRenderingContext2D,
    scene: FlagScene,
    logo: LogoImage | null,
): void => {
    const { cloth } = scene;
    ctx.fillStyle = CLOTH_BLACK;
    ctx.fillRect(0, 0, cloth.width, cloth.height);
    if (!logo) return;
    const { x, y, width } = scene.logo;
    const height = (width * logo.height) / logo.width;
    ctx.drawImage(logo, x - width / HALF, y - height / HALF, width, height);
};
