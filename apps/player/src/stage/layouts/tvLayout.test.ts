import { tvLegBottom, tvPicture } from '../../components/tv/tvShapes';
import { DESIGN_HEIGHT } from '../fitStage';
import { hitSizeUnits } from '../geometry';
import { PHONE_LAYOUT } from './phone';

const { tv } = PHONE_LAYOUT;
const HIT = hitSizeUnits(PHONE_LAYOUT);
/** 隻腳落地嘅位同畫面底差幾多都算「企喺底」（設計稿算出嚟係 1922） */
const FLOOR_TOLERANCE = 4;

/* T-060：設計稿「MV 電視」嘅 TV 常數同量度（Functional Spec §CR-002「MV 電視」、US-007） */
describe('TV layout', () => {
    it('should copy the TV body of the mockup', () => {
        expect(tv).toMatchObject({ x: 36, y: 928, w: 1008, h: 900, corner: 50, rise: 1090 });
        expect(tv.glass).toMatchObject({ x: 88, y: 86, w: 658, h: 560 });
        expect(tv.knobs).toMatchObject({ x: 885, volumeY: 300, seekY: 520, r: 44, dialR: 64 });
        expect(tv.buttons).toMatchObject({ y: 800, r: 30, xs: [700, 822, 944] });
    });

    // D26：▶ ❚❚ ■ 搬去機身下面，每粒 44pt 感應範圍唔重疊
    it('should give each TV button a 44 pt hit area that does not overlap the next', () => {
        const [play = 0, pause = 0, stop = 0] = tv.buttons.xs;
        expect(pause - play).toBeGreaterThanOrEqual(HIT);
        expect(stop - pause).toBeGreaterThanOrEqual(HIT);
    });

    it('should give the two knobs 44 pt hit areas that do not overlap', () => {
        const knobHit = Math.max(HIT, (tv.knobs.dialR + tv.knobs.rim) * 2);
        expect(tv.knobs.seekY - tv.knobs.volumeY).toBeGreaterThanOrEqual(knobHit);
        // 下面嗰粒旋鈕同 ▶ ❚❚ ■ 嗰排都唔重疊
        expect(tv.buttons.y - HIT / 2).toBeGreaterThanOrEqual(tv.knobs.seekY + knobHit / 2);
    });

    // 16:9 嘅片放喺 4:3 嘅螢幕入面，上下黑邊（US-007）
    it('should fit a 16:9 picture across the glass with black bands above and below', () => {
        const picture = tvPicture(tv);
        expect(picture.w).toBe(tv.glass.w);
        expect(picture.h).toBeCloseTo((tv.glass.w * 9) / 16);
        expect(picture.y).toBeGreaterThan(tv.glass.y);
        expect(picture.y + picture.h).toBeLessThan(tv.glass.y + tv.glass.h);
        expect(picture.y + picture.h / 2).toBeCloseTo(tv.glass.y + tv.glass.h / 2);
    });

    // 設計稿：腳加長到 92，電視企喺畫面底（高身手機跟貼底組一齊向下移）
    it('should stand the TV on the bottom of the stage', () => {
        expect(Math.abs(tv.y + tvLegBottom(tv) - DESIGN_HEIGHT)).toBeLessThanOrEqual(
            FLOOR_TOLERANCE,
        );
    });

    // 升起之前成部機（天線未彈出，只計天線座）喺畫面下面
    it('should start the rise with the whole body below the stage', () => {
        expect(tv.y + tv.rise + tv.antenna.mount.y).toBeGreaterThanOrEqual(DESIGN_HEIGHT);
    });
});
