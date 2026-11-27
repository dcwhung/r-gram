import type { LyricLine } from '@r-gram/catalog';
import { render } from '@testing-library/react';
import { PlaybackClock } from '../../lyrics/PlaybackClock';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import { TimedLyrics } from './TimedLyrics';

/** 佔位文字（設計稿 PH()），唔係真歌詞 */
const PH = (count: number) => '歌詞佔位文字'.repeat(40).slice(0, count);
const SP = '　';
const at = (seconds: number, text: string): LyricLine => ({ t: seconds * 1000, text });

const renderTimed = (lines: LyricLine[], now: number, notice: string | null = null) =>
    render(
        <PlaybackClock.Provider value={() => now}>
            <svg>
                <TimedLyrics
                    layout={PHONE_LAYOUT}
                    lines={lines}
                    notice={notice}
                    measure={estimateTextWidth}
                    playing={false}
                />
            </svg>
        </PlaybackClock.Provider>,
    );

const VERSE = `${PH(7)}${SP}${PH(6)}${SP}${PH(10)}`;
const LINES = [at(1, PH(6)), at(4, PH(8)), at(7, VERSE), at(10, PH(40)), at(13, PH(6))];

/* T-082：設計稿第 17 版 longLyrics()、第 18 版 booklet()；Functional Spec D22 */
describe('TimedLyrics', () => {
    it('should put a short current line in the 92-high frame at 44 and the others at 32', () => {
        const { container } = renderTimed(LINES, 1.5);
        const focus = container.querySelector('[aria-current="true"] text');
        expect(focus).toHaveClass('lyric-text--focus');
        expect(focus).toHaveStyle({ fontSize: '44px' });
        expect(container.querySelector('[data-part="booklet-frame"]')?.getAttribute('d')).toContain(
            'a46 46 0 0 0 0 92',
        );
        const other = container.querySelector('[data-index="1"] text');
        expect(other).toHaveStyle({ fontSize: '32px' });
    });

    // 縮到 32 都放唔落：框入面斷三列、框高 3 × 44 + 34
    it('should wrap a long current line in a taller frame', () => {
        const { container } = renderTimed(LINES, 7.5);
        const rows = container.querySelectorAll('[aria-current="true"] text');
        expect([...rows].map((row) => row.textContent)).toEqual([PH(7), PH(6), PH(10)]);
        expect([...rows].map((row) => row.getAttribute('y'))).toEqual(['0', '44', '88']);
        const height = 3 * 44 + 34;
        expect(container.querySelector('[data-part="booklet-frame"]')?.getAttribute('d')).toContain(
            `a${px(height / 2)} ${px(height / 2)} 0 0 0 0 ${height}`,
        );
    });

    // 其他行放唔落：右邊淡出（mask），唔用「…」
    it('should fade out the end of another line that does not fit', () => {
        const { container } = renderTimed(LINES, 7.5);
        const cut = container.querySelector('[data-index="3"] text');
        expect(cut?.textContent).toBe(PH(40));
        expect(cut?.getAttribute('mask')).toMatch(/^url\(#lyric-cut-/);
        expect(container.querySelector('[data-index="1"] text')).not.toHaveAttribute('mask');
    });

    // 開場過場：每行由而家嗰行嘅位置沿弧線轉出嚟（--spread = k × 9.2°）
    it('should give each line its spread for the opening transition', () => {
        const { container } = renderTimed(LINES, 1.5);
        const below = container.querySelector('[data-index="2"]')?.closest('.booklet-line');
        expect((below as SVGElement | null)?.style.getPropertyValue('--spread')).toBe('18.4deg');
    });

    it('should show a notice in the frame instead of lyrics', () => {
        const { container, getByText } = renderTimed([], 0, '尚未有歌詞');
        expect(getByText('尚未有歌詞')).toHaveAttribute('x', String(940 - 556));
        expect(container.querySelector('.lyric-text')).toBeNull();
    });
});
