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
