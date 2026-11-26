/*
 * WebGL 嘅基本功（T-114）：編譯 shader、開 buffer、開 texture、將 #rrggbb 變成 0–1。
 * 出錯一律 throw（呼叫者當冇 WebGL，用 2D 靜止一格）。
 */
import { FLAG_FRAGMENT_SOURCE, FLAG_VERTEX_SOURCE } from './flagShader';

type Gl = WebGLRenderingContext;

const compile = (gl: Gl, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('WebGL shader could not be created');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Flag shader does not compile: ${log ?? ''}`);
    }
    return shader;
};

/** 編譯兩個 shader 再 link；link 完 shader 本身即刻刪（program 已經有晒） */
export const linkFlagProgram = (gl: Gl): WebGLProgram => {
    const vertex = compile(gl, gl.VERTEX_SHADER, FLAG_VERTEX_SOURCE);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FLAG_FRAGMENT_SOURCE);
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL program could not be created');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Flag program does not link: ${log ?? ''}`);
    }
    return program;
};

/** 開一個 buffer 填 `data`（`usage`：STATIC_DRAW 一次過、DYNAMIC_DRAW 每格更新） */
export const makeBuffer = (
    gl: Gl,
    target: number,
    data: Float32Array | Uint16Array,
    usage: number,
): WebGLBuffer => {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL buffer could not be created');
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, usage);
    return buffer;
};

/** 將 `buffer` 接去 attribute `name`（每點 `size` 個 float） */
export const bindAttribute = (
    gl: Gl,
    program: WebGLProgram,
    name: string,
    buffer: WebGLBuffer,
    size: number,
): void => {
    const location = gl.getAttribLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
};

/** 布料圖 texture：唔係 2 嘅次方都得（WebGL 1：唔用 mipmap、邊位 clamp） */
export const makeTexture = (gl: Gl): WebGLTexture => {
    const texture = gl.createTexture();
    if (!texture) throw new Error('WebGL texture could not be created');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
};

const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const CHANNEL_DIGITS = 2;
const CHANNELS = 3;

/** '#0a0a0a' → [r, g, b]，每個 0–1（gl.clearColor 用） */
export const unitRgb = (hex: string): [number, number, number] => {
    const digits = hex.replace('#', '');
    const channel = (index: number) =>
        parseInt(digits.slice(index * CHANNEL_DIGITS, (index + 1) * CHANNEL_DIGITS), HEX_RADIX) /
        CHANNEL_MAX;
    const [r = 0, g = 0, b = 0] = Array.from({ length: CHANNELS }, (_, index) => channel(index));
    return [r, g, b];
};
