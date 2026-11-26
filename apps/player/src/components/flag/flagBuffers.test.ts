import { PHONE_LAYOUT } from '../../stage/layouts';
import { clothIndices, clothUvs } from './flagBuffers';

const SMALL = { cols: 2, rows: 1 };

/* Technical Spec「CR-010 → Preload 旗幟用 WebGL」：網格同 2D 版一樣，每格兩個三角形 */
describe('clothUvs', () => {
    it('should give every grid point its (u, v), row by row like projectCloth', () => {
        expect(Array.from(clothUvs(SMALL))).toEqual([0, 0, 0.5, 0, 1, 0, 0, 1, 0.5, 1, 1, 1]);
    });
});

describe('clothIndices', () => {
    it('should split each cell into the same two triangles as the 2D renderer', () => {
        // 點：0 1 2 / 3 4 5；左上三角形 (p00, p10, p01)、右下 (p10, p11, p01)
        expect(Array.from(clothIndices(SMALL))).toEqual([0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4]);
    });

    it('should fit the phone flag (31 x 41 points) in 16-bit indices', () => {
        const { cols, rows } = PHONE_LAYOUT.preload.flag;
        const indices = clothIndices(PHONE_LAYOUT.preload.flag);
        expect(indices).toBeInstanceOf(Uint16Array);
        expect(indices).toHaveLength(cols * rows * 6);
        expect(Math.max(...indices)).toBe((cols + 1) * (rows + 1) - 1);
    });

    it('should refuse a grid too big for 16-bit indices', () => {
        expect(() => clothIndices({ cols: 300, rows: 300 })).toThrow(RangeError);
    });
});
