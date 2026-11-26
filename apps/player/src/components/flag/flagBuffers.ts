/*
 * WebGL 旗幟嘅網格 buffer（純函數，T-114）：點嘅次序同 projectCloth() 一樣（行 × (cols + 1) + 列），
 * 每格拆兩個三角形，同 2D renderer（flagRenderer.ts drawMesh）一樣：左上 (p00, p10, p01)、右下 (p10, p11, p01)。
 * (u, v) 同三角形只砌一次；每格只更新位置（flagGl.ts bufferSubData）。
 */
import type { Cloth } from './flagMesh';

type Grid = Pick<Cloth, 'cols' | 'rows'>;

/** 16-bit index 最多去到幾多（WebGL 1 唔一定有 32-bit index） */
const MAX_INDEX = 0xffff;
const UV_SIZE = 2;
const INDICES_PER_CELL = 6;

/** 每點嘅 (u, v)：u 沿旗 0 → 1，v 向下 0 → 1 */
export const clothUvs = ({ cols, rows }: Grid): Float32Array => {
    const columns = cols + 1;
    const out = new Float32Array(columns * (rows + 1) * UV_SIZE);
    for (let row = 0; row <= rows; row += 1) {
        for (let col = 0; col <= cols; col += 1) {
            const offset = (row * columns + col) * UV_SIZE;
            out[offset] = col / cols;
            out[offset + 1] = row / rows;
        }
    }
    return out;
};

/** 三角形嘅點（每格六個 index） */
export const clothIndices = ({ cols, rows }: Grid): Uint16Array => {
    const columns = cols + 1;
    if (columns * (rows + 1) - 1 > MAX_INDEX) throw new RangeError('Flag grid is too fine');
    const out = new Uint16Array(cols * rows * INDICES_PER_CELL);
    let offset = 0;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const p00 = row * columns + col;
            const [p10, p01, p11] = [p00 + 1, p00 + columns, p00 + columns + 1];
            out.set([p00, p10, p01, p10, p11, p01], offset);
            offset += INDICES_PER_CELL;
        }
    }
    return out;
};
