import { PHONE_LAYOUT } from '../../stage/layouts';
import { flagSceneFor } from './flagScene';

const { preload } = PHONE_LAYOUT;

describe('flagSceneFor', () => {
    // v16：logo 喺布料上面 (838, 1130)、闊 640；第 18 版靜止畫面嘅 logo 中心 (540, 860)、闊 560
    it('should place the logo on the cloth so that it sits at the mockup place on a 9:16 screen', () => {
        const scene = flagSceneFor(preload, 0);
        expect(scene.cloth).toEqual(preload.flag);
        expect(scene.logo).toEqual({ x: 838, y: 1100, width: 560 });
        expect(scene.screen).toEqual({ width: 1080, height: 1920 });
    });

    // 高身手機：布料伸長蓋住成個畫面，logo 留喺畫面中間嗰段（底部文字由 Preload 嘅 SVG 貼底）
    it('should stretch the cloth and keep the logo in the middle on a tall phone', () => {
        const extra = 420;
        const scene = flagSceneFor(preload, extra);
        expect(scene.cloth.height).toBe(preload.flag.height + extra);
        expect(scene.cloth.y).toBe(preload.flag.y);
        expect(scene.logo.y).toBe(1100 + extra / 2);
        expect(scene.screen.height).toBe(1920 + extra);
    });
});
