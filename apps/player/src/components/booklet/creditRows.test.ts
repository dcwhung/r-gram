import type { TrackCredits } from '@r-gram/catalog';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { creditRight, creditRows } from './creditRows';

const measure = (text: string, size: number) =>
    estimateTextWidth(text, { family: 'cjk', size, weight: 400, spacing: 0 });

const credits = (overrides: Partial<TrackCredits> = {}): TrackCredits => ({
    composer: 'RubberBand / 雷柏熹',
    lyricist: 'Tim Lui',
    arranger: 'RubberBand / 雷柏熹',
    producer: 'RubberBand / 雷柏熹',
    ...overrides,
});

const { credits: column, clearance } = { ...PHONE_LAYOUT.booklet, ...PHONE_LAYOUT };
const VALUE_X = column.x + column.valueDx;

describe('creditRows', () => {
    // 設計稿第 18 版 booklet()：曲、詞、編、監四行，第一行基線 446，行距 48，名用原文、字 26
    it('should list the four credits of the mockup in order', () => {
        const rows = creditRows(credits(), PHONE_LAYOUT, measure);
        expect(rows.map(({ field, y, size }) => [field, y, size])).toEqual([
            ['composer', 446, 26],
            ['lyricist', 494, 26],
            ['arranger', 542, 26],
            ['producer', 590, 26],
        ]);
        expect(rows[1]?.text).toBe('Tim Lui');
    });

    // Functional Spec CR-002「歌書」：冇資料嘅項目唔顯示（下面嘅行補位，唔留空行）
    it('should skip the missing credits and close the gaps', () => {
        const rows = creditRows(credits({ lyricist: null, arranger: null }), PHONE_LAYOUT, measure);
        expect(rows.map(({ field, y }) => [field, y])).toEqual([
            ['composer', 446],
            ['producer', 494],
        ]);
    });

    it('should have no rows when the track has no credits', () => {
        expect(creditRows(null, PHONE_LAYOUT, measure)).toEqual([]);
    });

    // 唔可以伸入轉盤嘅範圍（離轉盤邊 ≥ 40）：名太長先縮字，最細都放唔落先「…」
    it('should shrink a long name before cutting it, and keep it clear of the platter', () => {
        const long = '雷柏熹 / 李權哲 / 譚順誠 / 陳健朗 / 黎僑誠';
        const longer = `${long} / ${long} / ${long}`;
        const rows = creditRows(
            credits({ arranger: long, producer: longer }),
            PHONE_LAYOUT,
            measure,
        );
        const [composer, , arranger, producer] = rows;
        expect(composer?.size).toBe(column.value);
        expect(arranger?.size).toBeLessThan(column.value);
        expect(arranger?.text).toBe(long);
        expect(producer?.size).toBe(column.minSize);
        expect(producer?.text.endsWith('…')).toBe(true);
        rows.forEach(({ text, size, y }) => {
            const right = VALUE_X + measure(text, size);
            const { disc, platter } = PHONE_LAYOUT;
            expect(Math.hypot(right - disc.x, y - disc.y)).toBeGreaterThanOrEqual(
                platter.r + clearance.platter,
            );
        });
    });
});

describe('creditRight', () => {
    // 轉盤頂再出 40（1196 − 716 − 40 = 440）上面嘅高度冇轉盤：停喺同碟名一樣嘅右邊
    it('should stop at the title margin above the platter', () => {
        const { disc, platter } = PHONE_LAYOUT;
        const above = disc.y - platter.r - clearance.platter - 1;
        expect(creditRight(PHONE_LAYOUT, above)).toBe(column.maxRight);
    });

    it('should stop 40 short of the platter edge lower down', () => {
        const y = column.y + 3 * column.pitch;
        const { disc, platter } = PHONE_LAYOUT;
        const right = creditRight(PHONE_LAYOUT, y);
        expect(Math.hypot(right - disc.x, y - disc.y)).toBeCloseTo(
            platter.r + clearance.platter,
            0,
        );
    });
});
