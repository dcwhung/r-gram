import { COVER_SIDE_PX, IMAGE_MAX_BYTES, IMAGE_MAX_MB, THUMB_SIDE_PX } from '../index';

// 管理端出圖同 Worker 收圖（API-050、API-017）用同一份數字：管理端出得到 = Worker 收得到
describe('cover sizes', () => {
    it('should be the two square sides of Technical Spec D50', () => {
        expect([COVER_SIDE_PX, THUMB_SIDE_PX]).toEqual([1200, 320]);
    });

    it('should cap an uploaded image at 2 MB', () => {
        expect(IMAGE_MAX_MB).toBe(2);
        expect(IMAGE_MAX_BYTES).toBe(2 * 1024 * 1024);
    });
});
