import type { CatalogAlbum, CatalogTrack } from '@r-gram/catalog';
import { render } from '@testing-library/react';
import { makeAlbum } from '../../catalog/testing/catalogFixtures';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { InfoBlock } from './InfoBlock';
import { VersionText } from './VersionText';

const album = (overrides: Partial<CatalogAlbum> = {}): CatalogAlbum => ({
    ...makeAlbum('komorebi', ['komorebi/01.m4a']),
    title: 'KOMOREBI',
    year: 2026,
    accent: '#2f8f57',
    ...overrides,
});
const track = (overrides: Partial<CatalogTrack> = {}): CatalogTrack => ({
    ...(album().tracks[0] as CatalogTrack),
    no: 7,
    title: '我永遠記得',
    ...overrides,
});

const renderInfo = (props: Partial<Parameters<typeof InfoBlock>[0]> = {}) => {
    const { container } = render(
        <svg>
            <InfoBlock
                info={PHONE_LAYOUT.info}
                album={album()}
                track={null}
                timeText="0:41"
                accent="#2f8f57"
                measure={estimateTextWidth}
                {...props}
            />
        </svg>,
    );
    return (name: string) => container.querySelector(`[data-part="${name}"]`);
};

describe('InfoBlock', () => {
    it('should set a Latin album title in the slab face at the mockup position', () => {
        const title = renderInfo()('album-title');
        expect(title).toHaveTextContent('KOMOREBI');
        expect(title).toHaveAttribute('class', 'info-title info-title--latin');
        expect(title).toHaveAttribute('x', '70');
        expect(title).toHaveAttribute('y', '192');
        expect(title).toHaveAttribute('font-size', '88');
    });

    it('should set a Chinese album title in heavy Noto Sans HK a little smaller', () => {
        const title = renderInfo({ album: album({ title: '小日子' }) })('album-title');
        expect(title).toHaveAttribute('class', 'info-title info-title--cjk');
        expect(title).toHaveAttribute('y', '188');
        expect(title).toHaveAttribute('font-size', '80');
    });

    // FR-036 / D23：左上放唔落就縮字
    it('should shrink a title that is too wide for the top-left block', () => {
        const title = renderInfo({ album: album({ title: 'A VERY LONG ALBUM TITLE INDEED' }) })(
            'album-title',
        );
        expect(Number(title?.getAttribute('font-size'))).toBeLessThan(88);
        expect(title).toHaveTextContent('A VERY LONG ALBUM TITLE INDEED');
    });

    it('should draw the year and the accent rule just after it', () => {
        const part = renderInfo();
        expect(part('album-year')).toHaveTextContent('2026');
        const yearWidth = estimateTextWidth('2026', {
            family: 'mixed',
            size: 29,
            weight: 400,
            spacing: 6,
        });
        const start = 74 + yearWidth + 22;
        expect(part('album-rule')).toHaveAttribute('stroke', '#2f8f57');
        expect(part('album-rule')?.getAttribute('d')).toBe(
            `M${Math.round(start * 10) / 10} 234H${Math.round((start + 98) * 10) / 10}`,
        );
    });

    it('should leave out the year when the catalog has none', () => {
        const part = renderInfo({ album: album({ year: null }) });
        expect(part('album-year')).toBeNull();
        expect(part('album-rule')?.getAttribute('d')).toBe('M96 234H194');
    });

    it('should show no song line before a song is loaded', () => {
        const part = renderInfo();
        expect(part('song-title')).toBeNull();
        expect(part('track-line')).toBeNull();
    });

    it('should show the song with the accent bars, the heart and the track number and time', () => {
        const part = renderInfo({ track: track() });
        expect(part('song-title')).toHaveTextContent('我永遠記得');
        expect(part('song-bars')?.querySelectorAll('rect')).toHaveLength(3);
        expect(part('song-heart')).toHaveAttribute('aria-hidden', 'true');
        expect(part('track-line')).toHaveTextContent('第 07 首 · 0:41');
    });

    it('should shrink a long song title so the heart stays clear of the tonearm base', () => {
        const part = renderInfo({ track: track({ title: '一首名字非常非常非常長的歌曲' }) });
        expect(Number(part('song-title')?.getAttribute('font-size'))).toBeLessThan(44);
    });

    it('should draw nothing without a disc', () => {
        expect(renderInfo({ album: null })('album-title')).toBeNull();
    });
});

/*
 * Functional Spec D51（CR-005，修訂 D23）；設計稿第 18 版 fitSong()、三格「歌名較長（縮字）」「歌名好長（斷兩行）」
 *「歌名好長 + 唱臂喺泊位」。estimateTextWidth = 設計稿 textWidth()，所以位置同設計稿一樣。
 */
describe('InfoBlock long song titles', () => {
    const LONG = '歌名好長好長嘅示範一行點都放唔落 (Live 2021)';
    const rows = (part: ReturnType<typeof renderInfo>) =>
        [...(part('song-title')?.querySelectorAll('tspan') ?? [])].map((row) => ({
            text: row.textContent,
            x: row.getAttribute('x'),
            y: row.getAttribute('y'),
        }));

    it('should only shrink a title that fits on one line at a smaller size', () => {
        const part = renderInfo({ track: track({ title: '歌名較長嘅示範要縮細啲字先放得落' }) });
        expect(part('song-title')).toHaveAttribute('font-size', '34');
        expect(rows(part)).toEqual([
            { text: '歌名較長嘅示範要縮細啲字先放得落', x: '128', y: '318' },
        ]);
    });

    it('should break a title onto two lines at the minimum size, raising the first line', () => {
        const part = renderInfo({ track: track({ title: LONG }) });
        expect(part('song-title')).toHaveAttribute('font-size', '32');
        expect(rows(part)).toEqual([
            { text: '歌名好長好長嘅示範一行點都放唔落', x: '128', y: '296' },
            { text: '(Live 2021)', x: '128', y: '334' },
        ]);
    });

    it('should keep the track line in place and raise the accent bars with the first line', () => {
        const part = renderInfo({ track: track({ title: LONG }) });
        expect(part('track-line')).toHaveAttribute('y', '368');
        const tallest = part('song-bars')?.querySelectorAll('rect')[1];
        expect(tallest).toHaveAttribute('y', '264');
    });

    it('should put the heart after the end of the last line', () => {
        const part = renderInfo({ track: track({ title: LONG }) });
        const transform = part('song-heart')
            ?.querySelector('[data-part="icon"]')
            ?.getAttribute('transform');
        const [, cx, cy] = /translate\(([\d.]+) ([\d.]+)\)/.exec(transform ?? '') ?? [];
        // 128 + 「(Live 2021)」11 × 0.56 × 32 + 46；中心比第二行基線高 32 × 0.364
        expect(Number(cx)).toBeCloseTo(371.12, 1);
        expect(Number(cy)).toBeCloseTo(322.35, 1);
    });

    it('should end the second line with an ellipsis only when two lines are not enough', () => {
        const part = renderInfo({ track: track({ title: `${LONG}${'加長'.repeat(8)}` }) });
        const [, second] = rows(part);
        expect(second?.text?.endsWith('…')).toBe(true);
        expect(rows(part)).toHaveLength(2);
    });

    // B-072 ①：兩行之間冇空格、「…」截走咗嘅字讀屏都要讀到：成個歌名做標籤
    it('should label the title with the full song title when it is broken or cut short', () => {
        const full = `${LONG}${'加長'.repeat(8)}`;
        const part = renderInfo({ track: track({ title: full }) });
        expect(part('song-title')).toHaveAttribute('aria-label', full);
    });

    // W-017：字體載入完換新嘅量字函數，要用真字體重新 fit（真字體闊啲就由一行變兩行）
    it('should fit again with the new measure after the web fonts load', () => {
        const title = '歌名較長嘅示範要縮細啲字先放得落';
        const { container, rerender } = render(
            <svg>
                <InfoBlock
                    info={PHONE_LAYOUT.info}
                    album={album()}
                    track={track({ title })}
                    timeText="0:41"
                    accent="#2f8f57"
                    measure={estimateTextWidth}
                />
            </svg>,
        );
        const wider: typeof estimateTextWidth = (text, font) => estimateTextWidth(text, font) * 1.2;
        rerender(
            <svg>
                <InfoBlock
                    info={PHONE_LAYOUT.info}
                    album={album()}
                    track={track({ title })}
                    timeText="0:41"
                    accent="#2f8f57"
                    measure={wider}
                />
            </svg>,
        );
        expect(container.querySelectorAll('[data-part="song-title"] tspan')).toHaveLength(2);
    });
});

describe('VersionText', () => {
    it('should show the build version at the top right', () => {
        const { container } = render(
            <svg>
                <VersionText version={PHONE_LAYOUT.info.version} />
            </svg>,
        );
        const text = container.querySelector('[data-part="version"]');
        expect(text).toHaveTextContent(/^v\d+\.\d+\.\d+$/);
        expect(text).toHaveAttribute('text-anchor', 'end');
        expect(text).toHaveAttribute('x', '1008');
    });
});

/* T-036：揀碟時左上歌名嗰部分淡出，只留碟名同年份（Functional Spec D52、第 18 版確認） */
describe('InfoBlock while choosing a disc', () => {
    it('should fade out the song part but keep the album title and year', () => {
        const part = renderInfo({ track: track(), songHidden: true });
        expect(part('song-fade')).toHaveAttribute('data-hidden', 'true');
        expect(part('song-fade')).toHaveAttribute('aria-hidden', 'true');
        expect(part('album-title')).toHaveTextContent('KOMOREBI');
        expect(part('song-fade')?.contains(part('album-title') ?? null)).toBe(false);
    });

    it('should show the song part normally', () => {
        const part = renderInfo({ track: track() });
        expect(part('song-fade')).toHaveAttribute('data-hidden', 'false');
        expect(part('song-fade')).not.toHaveAttribute('aria-hidden');
    });
});

/* T-048：拎住另一隻碟時碟名闊度收窄到細唱片機左邊（Technical Spec「碟名闊度上限」；同一個 fit，只換闊度） */
describe('InfoBlock while holding another disc', () => {
    const sizeOf = (title: string, held: boolean) =>
        Number(
            renderInfo({ album: album({ title }), held })('album-title')?.getAttribute('font-size'),
        );
    const widthAt = (title: string, size: number, spacing: number) =>
        estimateTextWidth(title, { family: 'slab', size, weight: 400, spacing });

    it('should shrink a title that only fits the full width', () => {
        const title = 'WE ARE RUBBERBAND';
        expect(sizeOf(title, false)).toBe(88);
        const held = sizeOf(title, true);
        expect(held).toBeLessThan(88);
        expect(widthAt(title, held, 1)).toBeLessThanOrEqual(790 - 70);
    });

    it('should keep a short title at full size', () => {
        expect(sizeOf('ROOM', true)).toBe(88);
    });
});

/*
 * T-037：歌單開住時左上資訊轉白字（設計稿第 18 版 infoParts()：st.list → PAPER），歌名嗰部分顯示框入面嗰首：
 * 歌號（slab 32、專輯色，喺歌名第一行基線上面 2）+ 歌名（冇心形，所以可用闊度多返心形嗰段）；冇時間、冇三條棒
 */
describe('InfoBlock while the list is open', () => {
    const FOURTEEN = '一二三四五六七八九十一二三四';

    it('should turn white and show the focused track with its number in the album colour', () => {
        const part = renderInfo({ listOpen: true, listTrack: track() });
        expect(part('info')).toHaveClass('info--dark');
        expect(part('list-number')).toHaveTextContent('07');
        expect(part('list-number')).toHaveAttribute('fill', '#2f8f57');
        expect(part('list-number')).toHaveAttribute('x', '74');
        expect(part('list-number')).toHaveAttribute('y', '316');
        expect(part('list-number')).toHaveAttribute('font-size', '32');
        expect(part('song-title')).toHaveTextContent('我永遠記得');
        expect(part('song-heart')).toBeNull();
        expect(part('song-bars')).toBeNull();
        expect(part('track-line')).toBeNull();
    });

    it('should give the title the room of the missing heart', () => {
        const title = renderInfo({ listOpen: true, listTrack: track({ title: FOURTEEN }) })(
            'song-title',
        );
        expect(title).toHaveAttribute('font-size', '44');
        const playing = renderInfo({ track: track({ title: FOURTEEN }) })('song-title');
        expect(Number(playing?.getAttribute('font-size'))).toBeLessThan(44);
    });

    it('should show the playing track instead of the list track once the list is closed', () => {
        const part = renderInfo({ track: track(), listTrack: null });
        expect(part('info')).not.toHaveClass('info--dark');
        expect(part('list-number')).toBeNull();
        expect(part('track-line')).toBeInTheDocument();
    });

    it('should show only the album part for an empty album', () => {
        const part = renderInfo({ listOpen: true, listTrack: null, track: track() });
        expect(part('song-title')).toBeNull();
        expect(part('album-title')).toBeInTheDocument();
    });

    it('should dim the version text on the dark list', () => {
        const { container } = render(
            <svg>
                <VersionText version={PHONE_LAYOUT.info.version} dark />
            </svg>,
        );
        expect(container.querySelector('[data-part="version"]')).toHaveClass('info-version--dark');
    });
});
