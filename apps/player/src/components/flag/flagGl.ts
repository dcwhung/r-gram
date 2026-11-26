/*
 * Preload 旗幟嘅 WebGL renderer（T-114；Technical Spec「CR-010 → Preload 旗幟用 WebGL」；spike 報告 §1.2 ⑤ 方案 B）。
 * 同 2D renderer（flagRenderer.ts）一樣嘅樣，但每格嘅工夫唔同：
 *   - 布料圖（黑布 + logo，flagCloth.ts）只畫一次、上載一次做 texture（logo 到咗再上載一次）
 *   - 網格 (u, v) 同三角形只上載一次；每格淨係 projectCloth() 喺 CPU 計 31 × 41 點，bufferSubData 上載
 *   - 光暗喺 fragment shader 逐像素計（flagShader.ts），一次 drawElements 畫晒
 * 出錯（shader 唔 compile、開唔到資源）會 throw：呼叫者當冇 WebGL。
 */
import { clothIndices, clothUvs } from './flagBuffers';
import { FLAG_BLACK, type LogoImage, paintCloth } from './flagCloth';
import { bindAttribute, linkFlagProgram, makeBuffer, makeTexture, unitRgb } from './flagGlSetup';
import { gustAt, projectCloth, WAVES } from './flagMesh';
import type { FlagCanvas } from './flagRenderer';
import type { FlagScene } from './flagScene';
import { FLAG_ATTRIBUTE, FLAG_UNIFORM, waveShifts } from './flagShader';

type Gl = WebGLRenderingContext;

export interface FlagGl {
    /** 畫 `elapsedMs`（由開始飄計）嗰一格 */
    draw: (elapsedMs: number) => void;
    /** logo 圖載入咗：重畫布料圖、再上載一次 */
    setLogo: (logo: LogoImage) => void;
    /** 刪晒 GL 資源（拆走時） */
    dispose: () => void;
}

const MS_PER_SECOND = 1000;
const HALF = 2;
const UV_SIZE = 2;
const OPAQUE = 1;

interface Buffers {
    uv: WebGLBuffer;
    index: WebGLBuffer;
    xs: WebGLBuffer;
    ys: WebGLBuffer;
    count: number;
}

/** 網格：(u, v) 同三角形一次過；x、y 各一個 buffer（projectCloth 本身就分開寫，唔使再砌） */
const createBuffers = (gl: Gl, program: WebGLProgram, scene: FlagScene): Buffers => {
    const indices = clothIndices(scene.cloth);
    const points = (scene.cloth.cols + 1) * (scene.cloth.rows + 1);
    const uv = makeBuffer(gl, gl.ARRAY_BUFFER, clothUvs(scene.cloth), gl.STATIC_DRAW);
    bindAttribute(gl, program, FLAG_ATTRIBUTE.uv, uv, UV_SIZE);
    const xs = makeBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    bindAttribute(gl, program, FLAG_ATTRIBUTE.x, xs, 1);
    const ys = makeBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    bindAttribute(gl, program, FLAG_ATTRIBUTE.y, ys, 1);
    const index = makeBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    return { uv, index, xs, ys, count: indices.length };
};

/** 布料圖嘅大細：同畫面一樣解像度（1 設計單位最多 1 像素），唔超過 GPU 上限 */
const textureCanvas = (gl: Gl, scene: FlagScene, scale: number, make: MakeCanvas) => {
    const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const { width, height } = scene.cloth;
    const ratio = Math.min(1, scale, limit / width, limit / height);
    return make(
        Math.min(limit, Math.ceil(width * ratio)),
        Math.min(limit, Math.ceil(height * ratio)),
    );
};

/** 畫布料圖（縮放到 canvas 大細）再上載做 texture */
const uploadCloth = (gl: Gl, canvas: FlagCanvas, scene: FlagScene, logo: LogoImage | null) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.setTransform(
        canvas.width / scene.cloth.width,
        0,
        0,
        canvas.height / scene.cloth.height,
        0,
        0,
    );
    paintCloth(ctx, scene, logo);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas as TexImageSource);
};

/** 唔會變嘅 uniform：設計單位 → 成個 canvas、布料大細、texture 單元；底色 */
const setFixedState = (gl: Gl, program: WebGLProgram, scene: FlagScene, scale: number) => {
    const { width, height } = gl.canvas;
    const at = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform2f(at(FLAG_UNIFORM.screen), width / scale, height / scale);
    gl.uniform2f(at(FLAG_UNIFORM.size), scene.cloth.width, scene.cloth.height);
    gl.uniform1i(at(FLAG_UNIFORM.cloth), 0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(...unitRgb(FLAG_BLACK), OPAQUE);
};

/** 每格：投影網格 → 上載位置 → 波嘅相位同風力 → 清底、一次畫晒 */
const frameDrawer = (gl: Gl, program: WebGLProgram, scene: FlagScene, buffers: Buffers) => {
    const points = (scene.cloth.cols + 1) * (scene.cloth.rows + 1);
    const mesh = { sx: new Float32Array(points), sy: new Float32Array(points) };
    const centre = { x: scene.screen.width / HALF, y: scene.screen.height / HALF };
    const shifts = new Float32Array(WAVES.length);
    const shiftAt = gl.getUniformLocation(program, FLAG_UNIFORM.shift);
    const ampAt = gl.getUniformLocation(program, FLAG_UNIFORM.amp);
    return (elapsedMs: number) => {
        const phase = elapsedMs / MS_PER_SECOND;
        const gust = gustAt(elapsedMs);
        projectCloth(scene.cloth, phase, gust, centre, mesh);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.xs);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.sx);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.ys);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.sy);
        gl.uniform3fv(shiftAt, waveShifts(phase, shifts));
        gl.uniform1f(ampAt, scene.cloth.amp * gust);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    };
};

export type MakeCanvas = (width: number, height: number) => FlagCanvas;

/** `scale` = 1 個設計單位幾多個 canvas 像素；`make` 開離屏 2D canvas（布料圖） */
export const createFlagGl = (gl: Gl, scene: FlagScene, scale: number, make: MakeCanvas): FlagGl => {
    const program = linkFlagProgram(gl);
    gl.useProgram(program);
    const buffers = createBuffers(gl, program, scene);
    const texture = makeTexture(gl);
    const canvas = textureCanvas(gl, scene, scale, make);
    uploadCloth(gl, canvas, scene, null);
    setFixedState(gl, program, scene, scale);
    return {
        draw: frameDrawer(gl, program, scene, buffers),
        setLogo: (logo) => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            uploadCloth(gl, canvas, scene, logo);
        },
        dispose: () => {
            [buffers.uv, buffers.index, buffers.xs, buffers.ys].forEach((b) => gl.deleteBuffer(b));
            gl.deleteTexture(texture);
            gl.deleteProgram(program);
        },
    };
};
