import { arcRows, arcRowSpec } from '../../stage/arcRows';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { arcFloats, listFloatTotalMs } from './arcFloat';

const spec = arcRowSpec(PHONE_LAYOUT);
const { heldTracks: column } = PHONE_LAYOUT;

/*
 * 設計稿第 19 版 listLayer()（LIST_FLOAT）：見到嘅弧線行由上至下逐行由歌單欄嘅位（第 slot 行）出發，
 * 字級由歌單欄嘅 28 縮放到弧線上嘅字級，逐行遲 80ms
 */
describe('arcFloats', () => {
    const poses = arcRows(10, 0, spec, () => false);

    it('should start each arc row at its slot in the column at the column size', () => {
        const extra = 120;
        const floats = arcFloats(poses, PHONE_LAYOUT, extra, 80);
        poses.forEach((pose, slot) => {
            const float = floats.get(pose.index);
            expect(float).toBeDefined();
            if (!float) return;
            // 起點：scale × (x, y) + 平移 = 歌單欄嗰行（arc 喺貼底組，所以減返多出嚟嘅高度）
            expect(float.scale * pose.x + float.fx).toBeCloseTo(column.x);
            const fromY = column.top + column.pitch * (slot + 0.5) - extra;
            expect(float.scale * pose.y + float.fy).toBeCloseTo(fromY);
            expect(float.scale).toBeCloseTo(column.size / pose.size);
            expect(float.delayMs).toBe(slot * 80);
        });
    });

    it('should last until the last visible row has landed', () => {
        const rows = Math.floor(PHONE_LAYOUT.list.visible) * 2 + 1;
        expect(listFloatTotalMs(PHONE_LAYOUT)).toBe(rows * 80 + 560);
    });
});
