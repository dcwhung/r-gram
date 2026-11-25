/*
 * 將布料畫落 canvas（移植自設計稿 v16 anim.js 嘅 makeFlag()、shadeFlag()、composeFlag()、drawFlagMesh()）：
 *   ① 光暗圖：每格畫面用細解像度（lightCols × lightRows）計一次光暗
 *   ② 布料圖：黑布 + 白 logo + 光暗圖（拉大到布料大細）
 *   ③ 網格：每格拆兩個三角形，將布料圖貼去投影咗嘅位置
 * 所有坐標係設計單位；呼叫者負責將 context 縮放到畫面像素（setTransform）。
 */
import {
    affineFor,
    newSample,
    flagWave,
    gustAt,
    projectCloth,
    shadeAt,
    type Triangle,
} from './flagMesh';
import type { FlagScene } from './flagScene';

/** `document.createElement('canvas')` 用到嘅部分（測試用假嘅） */
export interface FlagCanvas {
    width: number;
    height: number;
    getContext(type: '2d'): CanvasRenderingContext2D | null;
}

export type LogoImage = CanvasImageSource & { width: number; height: number };

/** 旗嘅黑（同 tokens.css --color-flag-bg）；canvas 讀唔到 CSS 變數 */
const FLAG_BLACK = '#0a0a0a';
/** 布料底色（v16 composeFlag：純黑，等光暗圖有對比） */
const CLOTH_BLACK = '#000';
const MS_PER_SECOND = 1000;
const RGBA = 4;
const OPAQUE = 255;
const WHITE = 255;
/** 三角形向外擴少少（設計單位），隔籬兩個之間唔會見到隙；取樣多啲邊位，擴出去嗰度有圖 */
const TRI_BLEED = 0.9;
const TRI_PAD = 4;
const HALF = 2;

interface Surfaces {
    texture: CanvasRenderingContext2D;
    textureCanvas: FlagCanvas;
    light: CanvasRenderingContext2D;
    lightCanvas: FlagCanvas;
    pixels: ImageData;
}

const surfacesFor = (scene: FlagScene, make: (w: number, h: number) => FlagCanvas): Surfaces => {
    const { cloth } = scene;
    const textureCanvas = make(cloth.width, cloth.height);
    const lightCanvas = make(cloth.lightCols, cloth.lightRows);
    const texture = textureCanvas.getContext('2d');
    const light = lightCanvas.getContext('2d');
    if (!texture || !light) throw new Error('2D canvas is not available');
    const pixels = light.createImageData(cloth.lightCols, cloth.lightRows);
    return { texture, textureCanvas, light, lightCanvas, pixels };
};

/** ① 光暗圖：疊白定疊黑、幾深 */
const shadeLight = (scene: FlagScene, surfaces: Surfaces, phase: number, gust: number) => {
    const { cloth } = scene;
    const { data } = surfaces.pixels;
    const sample = newSample();
    let offset = 0;
    for (let row = 0; row < cloth.lightRows; row += 1) {
        for (let col = 0; col < cloth.lightCols; col += 1) {
            flagWave(
                cloth,
                col / (cloth.lightCols - 1),
                row / (cloth.lightRows - 1),
                phase,
                gust,
                sample,
            );
            const { light, alpha } = shadeAt(sample);
            const tone = light ? WHITE : 0;
            data[offset] = tone;
            data[offset + 1] = tone;
            data[offset + 2] = tone;
            data[offset + 3] = alpha * OPAQUE;
            offset += RGBA;
        }
    }
    surfaces.light.putImageData(surfaces.pixels, 0, 0);
};

/** ② 布料圖：黑布、logo（載入咗先有）、光暗圖 */
const composeTexture = (scene: FlagScene, surfaces: Surfaces, logo: LogoImage | null) => {
    const { cloth } = scene;
    const { texture } = surfaces;
    texture.fillStyle = CLOTH_BLACK;
    texture.fillRect(0, 0, cloth.width, cloth.height);
    if (logo) {
        const { x, y, width } = scene.logo;
        const height = (width * logo.height) / logo.width;
        texture.drawImage(logo, x - width / HALF, y - height / HALF, width, height);
    }
    texture.drawImage(surfaces.lightCanvas as CanvasImageSource, 0, 0, cloth.width, cloth.height);
};

/** 三角形頂點由重心向外推 TRI_BLEED */
const grown = (target: Triangle): Triangle => {
    const gx = (target[0] + target[2] + target[4]) / 3;
    const gy = (target[1] + target[3] + target[5]) / 3;
    const out = [...target];
    for (let corner = 0; corner < out.length; corner += 2) {
        const dx = (out[corner] ?? 0) - gx;
        const dy = (out[corner + 1] ?? 0) - gy;
        const length = Math.hypot(dx, dy) || 1;
        out[corner] = (out[corner] ?? 0) + (dx / length) * TRI_BLEED;
        out[corner + 1] = (out[corner + 1] ?? 0) + (dy / length) * TRI_BLEED;
    }
    return out as unknown as Triangle;
};

/** ③ 貼一個三角形：剪出目標三角形，用仿射變換畫布料圖嗰部分 */
const drawTriangle = (
    ctx: CanvasRenderingContext2D,
    image: FlagCanvas,
    source: Triangle,
    target: Triangle,
) => {
    const corners = grown(target);
    const [a, b, c, d, e, f] = affineFor(source, target);
    const minX = Math.max(0, Math.min(source[0], source[2], source[4]) - TRI_PAD);
    const minY = Math.max(0, Math.min(source[1], source[3], source[5]) - TRI_PAD);
    const width = Math.min(image.width, Math.max(source[0], source[2], source[4]) + TRI_PAD) - minX;
    const height =
        Math.min(image.height, Math.max(source[1], source[3], source[5]) + TRI_PAD) - minY;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0], corners[1]);
    ctx.lineTo(corners[2], corners[3]);
    ctx.lineTo(corners[4], corners[5]);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(image as CanvasImageSource, minX, minY, width, height, minX, minY, width, height);
    ctx.restore();
};

/** 呢格嘅四個角有冇任何一個喺畫面入面（畫面外嘅格唔畫，慳時間） */
const cellVisible = (xs: readonly number[], ys: readonly number[], scene: FlagScene) =>
    Math.max(...xs) >= 0 &&
    Math.min(...xs) <= scene.screen.width &&
    Math.max(...ys) >= 0 &&
    Math.min(...ys) <= scene.screen.height;

interface Mesh {
    sx: Float32Array;
    sy: Float32Array;
}

/** ③ 網格：每格兩個三角形（左上、右下） */
const drawMesh = (
    ctx: CanvasRenderingContext2D,
    scene: FlagScene,
    mesh: Mesh,
    image: FlagCanvas,
) => {
    const { cols, rows, width, height } = scene.cloth;
    const cellW = width / cols;
    const cellH = height / rows;
    const columns = cols + 1;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const p00 = row * columns + col;
            const [p10, p01, p11] = [p00 + 1, p00 + columns, p00 + columns + 1];
            const xs = [p00, p10, p01, p11].map((index) => mesh.sx[index] ?? 0);
            const ys = [p00, p10, p01, p11].map((index) => mesh.sy[index] ?? 0);
            if (!cellVisible(xs, ys, scene)) continue;
            const [x0, y0, x1, y1] = [
                col * cellW,
                row * cellH,
                (col + 1) * cellW,
                (row + 1) * cellH,
            ];
            const [ax, bx, cx, dx] = xs as [number, number, number, number];
            const [ay, by, cy, dy] = ys as [number, number, number, number];
            drawTriangle(ctx, image, [x0, y0, x1, y0, x0, y1], [ax, ay, bx, by, cx, cy]);
            drawTriangle(ctx, image, [x1, y0, x1, y1, x0, y1], [bx, by, dx, dy, cx, cy]);
        }
    }
};

export interface FlagRenderer {
    /** 畫 `elapsedMs`（由開始飄計）嗰一格 */
    draw: (ctx: CanvasRenderingContext2D, elapsedMs: number) => void;
    /** logo 圖載入咗：之後每格都畫上布料 */
    setLogo: (logo: LogoImage) => void;
}

/** `make` 開離屏 canvas（布料圖、光暗圖）；瀏覽器畀唔到 2D context 會 throw（呼叫者當冇旗） */
export const createFlagRenderer = (
    scene: FlagScene,
    make: (width: number, height: number) => FlagCanvas,
): FlagRenderer => {
    const surfaces = surfacesFor(scene, make);
    const points = (scene.cloth.cols + 1) * (scene.cloth.rows + 1);
    const mesh: Mesh = { sx: new Float32Array(points), sy: new Float32Array(points) };
    const centre = { x: scene.screen.width / HALF, y: scene.screen.height / HALF };
    let logo: LogoImage | null = null;
    return {
        draw: (ctx, elapsedMs) => {
            const phase = elapsedMs / MS_PER_SECOND;
            const gust = gustAt(elapsedMs);
            shadeLight(scene, surfaces, phase, gust);
            composeTexture(scene, surfaces, logo);
            projectCloth(scene.cloth, phase, gust, centre, mesh);
            ctx.fillStyle = FLAG_BLACK;
            ctx.fillRect(0, 0, scene.screen.width, scene.screen.height);
            drawMesh(ctx, scene, mesh, surfaces.textureCanvas);
        },
        setLogo: (image) => {
            logo = image;
        },
    };
};
