import { polar } from '../stage/geometry';
import { PHONE_LAYOUT } from '../stage/layouts';
import { frameTextWidth, timedLayout } from './timedLayout';

/** 全形空格（一行歌詞入面分隔幾句） */
const SP = '\u3000';

/** 每個字一個字級闊（粗體同普通一樣） */
const perChar = (text: string, size: number) => [...text].length * size;
const MEASURES = { bold: perChar, regular: perChar };
/** 佔位文字（設計稿 PH()），唔係真歌詞 */
const PH = (count: number) => '歌詞佔位文字'.repeat(20).slice(0, count);
const line = (text: string) => ({ text });
const { disc } = PHONE_LAYOUT;
const layoutOf = (lines: { text: string }[], active: number) =>
    timedLayout(lines, active, PHONE_LAYOUT, MEASURES);

/** 9 行短歌詞（每行 6 個字） */
const SHORT = Array.from({ length: 9 }, (_, i) => line(`${PH(5)}${i}`));

/* 設計稿第 18 版「歌書（㩒 i）」ARC；Functional Spec CR-002「歌書」 */
describe('timedLayout on the arc', () => {
    it('should put the current line in the frame at 44, left of the disc centre', () => {
        const { long, focus, frameHeight } = layoutOf(SHORT, 4);
        expect(long).toBe(false);
        expect(frameHeight).toBe(92);
        expect(focus).toMatchObject({
            index: 4,
            rows: [SHORT[4]?.text],
            size: 44,
            x: 940 - 556,
            y: 1196,
        });
    });

    it('should lay the other lines along the arc every 9.2°, fainter further away', () => {
        const { others } = layoutOf(SHORT, 4);
        const above = others.find((pose) => pose.k === -1);
        const point = polar(disc, 556, 180 + 9.2);
        expect(above).toMatchObject({ index: 3, size: 32, opacity: 0.7 });
        expect(above?.x).toBeCloseTo(point.x, 5);
        expect(above?.y).toBeCloseTo(point.y, 5);
        const fades = others.map((pose) => [pose.k, Number(pose.opacity.toFixed(2))]);
        expect(fades).toEqual([
            [-4, 0],
            [-3, 0.3],
            [-2, 0.5],
            [-1, 0.7],
            [1, 0.7],
            [2, 0.5],
            [3, 0.3],
            [4, 0],
        ]);
    });

    // D22：放唔落先縮，最細 32
    it('should shrink a current line that only fits at a smaller size', () => {
        const lines = [line(PH(11))];
        expect(layoutOf(lines, 0).focus).toMatchObject({ size: 36, rows: [PH(11)] });
    });

    // D22：同唱片夾同一個高度嘅行（離碟心 < 112 + 20）去到唱片夾之前（808）就停；其餘去到 1040；放唔落 = 右邊淡出
    it('should stop the lines beside the spindle before it, the others at the screen edge', () => {
        const lines = Array.from({ length: 5 }, () => line(PH(30)));
        const { others } = layoutOf(lines, 2);
        const near = others.find((pose) => pose.k === 1);
        const far = others.find((pose) => pose.k === 2);
        expect(near).toMatchObject({ limit: 808, cut: true });
        expect(far).toMatchObject({ limit: 1040, cut: true });
        const short = layoutOf(SHORT, 4).others.find((pose) => pose.k === 1);
        expect(short?.cut).toBe(false);
    });
});

/* 設計稿第 17 版「同一份歌詞，如果有時間標記」LONG；Functional Spec D22（第 17 版修訂） */
describe('timedLayout with a long current line', () => {
    const VERSE = `${PH(7)}${SP}${PH(6)}${SP}${PH(10)}`;
    const lines = [line(PH(6)), line(PH(8)), line(VERSE), line(PH(6)), line(PH(9))];

    it('should wrap the current line in the frame and make the frame taller', () => {
        const { long, focus, frameHeight } = layoutOf(lines, 2);
        expect(long).toBe(true);
        expect(focus?.rows).toEqual([PH(7), PH(6), PH(10)]);
        expect(focus).toMatchObject({ size: 32, pitch: 44, x: 940 - 556 + 24, y: 1196 - 44 });
        expect(frameHeight).toBe(3 * 44 + 34);
    });

    it('should stack the other lines from the frame edge, 50 apart, at 28', () => {
        const { others, frameHeight } = layoutOf(lines, 2);
        const below = others.find((pose) => pose.k === 2);
        const dy = frameHeight / 2 + 14 + 50 * 1.5;
        expect(below).toMatchObject({ index: 4, size: 28, y: 1196 + dy });
        expect(below?.x).toBeCloseTo(940 - Math.sqrt(556 ** 2 - dy ** 2), 5);
        expect(others.find((pose) => pose.k === -1)?.opacity).toBeCloseTo(0.74, 5);
        expect(others.find((pose) => pose.k === -2)?.opacity).toBeCloseTo(0.52, 5);
    });

    // review S-276：斷行嘅字級由幾何表 booklet.lyrics.long.size 嚟
    it('should take the size of the wrapped rows from the long layout', () => {
        const { lyrics } = PHONE_LAYOUT.booklet;
        const layout = {
            ...PHONE_LAYOUT,
            booklet: {
                ...PHONE_LAYOUT.booklet,
                lyrics: { ...lyrics, long: { ...lyrics.long, size: 30 } },
            },
        };
        expect(timedLayout(lines, 2, layout, MEASURES).focus?.size).toBe(30);
    });

    it('should leave the frame text width of the mockup (410)', () => {
        expect(frameTextWidth(PHONE_LAYOUT)).toBe(410);
    });
});

/* 空白 text = 間奏（Technical Spec API-072）：唔 highlight 任何一行 */
describe('timedLayout between lines', () => {
    const lines = [line('一一'), line('二二'), line(''), line('三三'), line('四四')];

    it('should keep the frame empty during an interlude and show the lines around it', () => {
        const { focus, frameHeight, others } = layoutOf(lines, 2);
        expect(focus).toBeNull();
        expect(frameHeight).toBe(92);
        const byK = Object.fromEntries(others.map((pose) => [pose.k, pose.text]));
        expect(byK).toMatchObject({ '-2': '一一', '-1': '二二', '1': '三三', '2': '四四' });
    });

    it('should show the first lines below the empty frame before the song starts singing', () => {
        const { focus, others } = layoutOf(lines, -1);
        expect(focus).toBeNull();
        expect(others.map((pose) => [pose.k, pose.index])).toEqual([
            [1, 0],
            [2, 1],
            [3, 3],
            [4, 4],
        ]);
    });

    it('should have nothing to show when every line is blank', () => {
        expect(layoutOf([line(''), line(' ')], 0)).toMatchObject({ focus: null, others: [] });
    });
});
