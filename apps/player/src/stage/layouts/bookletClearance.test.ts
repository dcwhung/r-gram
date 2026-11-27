import { creditRows } from '../../components/booklet/creditRows';
import { plainColumn } from '../../lyrics/plainColumn';
import { frameTextWidth } from '../../lyrics/timedLayout';
import { buttonOuterRadius } from '../geometry';
import { LAYOUTS } from './index';

/** 字形喺基線上面最多伸幾多（字級嘅比例） */
const ASCENT_EM = 1;
/** 每個字一個字級闊（最闊嘅估法） */
const perChar = (text: string, size: number) => [...text].length * size;
const FOUR_CREDITS = { composer: '甲', lyricist: '乙', arranger: '丙', producer: '丁' };

/*
 * T-072、T-082：歌書嘅淨空（Technical Spec「歌書歌詞版面」嘅測試：直身一欄嘅右邊界同頂底入幾何表，唔入唱片夾窿、
 * 唔掂三粒細掣同旋鈕刻度）。高身手機用最矮（冇多出嚟嘅高度）嘅情況，最緊
 */
describe.each(LAYOUTS.map((layout) => [layout.id, layout] as const))(
    'booklet of layout %s',
    (_id, layout) => {
        const column = plainColumn(layout, 0);
        const hubClear = layout.disc.r * layout.hub.clear;

        it('should stop the plain column before the spindle (hub window − 20)', () => {
            expect(column.right).toBe(layout.disc.x - hubClear - layout.booklet.lyrics.hubGap);
        });

        it('should keep the plain column right of the small buttons with the control gap', () => {
            const buttonRight = Math.max(...layout.buttons.items.map((button) => button.x));
            expect(column.x - (buttonRight + buttonOuterRadius(layout))).toBeGreaterThanOrEqual(
                layout.clearance.controlGap,
            );
        });

        // 刻度弧跨過旋鈕正上面（185°–376.25°），所以最高嘅刻度線頂 = 旋鈕中心 − 長刻度
        it('should end the plain column above the knob scale', () => {
            expect(column.bottom).toBeLessThan(layout.knob.y - layout.scale.long);
        });

        it('should start the plain column below the last credit line', () => {
            const rows = creditRows(FOUR_CREDITS, layout, perChar);
            const last = rows.at(-1);
            expect(last).toBeDefined();
            expect(column.top - ASCENT_EM * column.size).toBeGreaterThan(last?.y ?? 0);
        });

        // 框內闊 = 弧線半徑 − 唱片夾窿 − rim − inset（設計稿 410）；斷行之後最高嘅框仍然喺曲詞編監同旋鈕之間
        it('should keep the tallest frame between the credits and the knob', () => {
            expect(frameTextWidth(layout)).toBeGreaterThan(0);
            const { long } = layout.booklet.lyrics;
            const half = (long.maxRows * long.pitch + long.pad) / 2;
            const lastCredit = creditRows(FOUR_CREDITS, layout, perChar).at(-1)?.y ?? 0;
            expect(layout.disc.y - half).toBeGreaterThan(lastCredit);
            expect(layout.disc.y + half).toBeLessThan(layout.knob.y - layout.knob.r);
        });
    },
);
