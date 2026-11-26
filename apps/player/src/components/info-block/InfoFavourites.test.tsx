import type { CatalogAlbum, CatalogTrack } from '@r-gram/catalog';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeAlbum } from '../../catalog/testing/catalogFixtures';
import { t } from '../../i18n/t';
import { hitSizeUnits } from '../../stage/geometry';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { InfoBlock } from './InfoBlock';

const album: CatalogAlbum = { ...makeAlbum('room', ['room/01.m4a']), year: 2026 };
const track = album.tracks[0] as CatalogTrack;
const GLOW = 'hsl(352 96% 60%)';

const renderInfo = (props: Partial<Parameters<typeof InfoBlock>[0]> = {}) => {
    const onFavourite = vi.fn();
    const { container } = render(
        <svg>
            <InfoBlock
                info={PHONE_LAYOUT.info}
                album={album}
                track={track}
                timeText="0:41"
                accent="#d7263d"
                glow={GLOW}
                measure={estimateTextWidth}
                hitSize={hitSizeUnits(PHONE_LAYOUT)}
                onFavourite={onFavourite}
                {...props}
            />
        </svg>,
    );
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    return { part, onFavourite, container };
};

/* Functional Spec US-010；設計稿 infoParts() 嘅心形掣（ACTIONS.heart、ui.fav） */
describe('InfoBlock heart', () => {
    it('should be a toggle button named from the language file, off when not a favourite', () => {
        renderInfo({ favourite: false });
        const heart = screen.getByRole('button', { name: t('favourites.add') });
        expect(heart).toHaveAttribute('aria-pressed', 'false');
        expect(heart).toHaveAttribute('tabindex', '0');
    });

    it('should draw an outline heart when off and a filled, glowing heart in the disc glow when on', () => {
        const off = renderInfo({ favourite: false });
        expect(off.part('heart-glow')).toBeNull();
        off.container.remove();
        const on = renderInfo({ favourite: true });
        expect(screen.getByRole('button', { name: t('favourites.add') })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(on.part('heart-glow')).not.toBeNull();
        expect(on.part('heart-fill')?.querySelector('[data-part="icon"]')).toHaveAttribute(
            'fill',
            GLOW,
        );
    });

    it('should toggle on click, Enter and Space', () => {
        const { onFavourite } = renderInfo();
        const heart = screen.getByRole('button', { name: t('favourites.add') });
        fireEvent.click(heart);
        fireEvent.keyDown(heart, { key: 'Enter' });
        fireEvent.keyDown(heart, { key: ' ' });
        expect(onFavourite).toHaveBeenCalledTimes(3);
    });

    it('should have a hit area of at least 44pt centred on the heart', () => {
        const { part } = renderInfo();
        const hit = part('heart-hit');
        const size = hitSizeUnits(PHONE_LAYOUT);
        const width = Number(hit?.getAttribute('width'));
        expect(width).toBeGreaterThanOrEqual(size);
        expect(Number(hit?.getAttribute('height'))).toBe(width);
        const heart = part('heart-outline')?.querySelector('[data-part="icon"]');
        const centre = /translate\(([\d.]+) ([\d.]+)\)/.exec(
            heart?.getAttribute('transform') ?? '',
        );
        expect(Number(hit?.getAttribute('x')) + width / 2).toBeCloseTo(Number(centre?.[1]), 0);
        expect(Number(hit?.getAttribute('y')) + width / 2).toBeCloseTo(Number(centre?.[2]), 0);
    });

    it('should not be a button while the song part is faded out', () => {
        renderInfo({ songHidden: true });
        expect(screen.queryByRole('button', { name: t('favourites.add') })).toBeNull();
    });

    it('should have no heart in the arc list (US-010)', () => {
        renderInfo({ listOpen: true, listTrack: track });
        expect(screen.queryByRole('button', { name: t('favourites.add') })).toBeNull();
    });
});

/* D19、設計稿「Favourites 歌單」：左上歌名下面係原本嗰隻碟；年份位置係「N 首」 */
describe('InfoBlock on the Favourites disc', () => {
    it('should show the original album under the framed song in the arc list', () => {
        const { part } = renderInfo({ listOpen: true, listTrack: track, origin: 'ROOM · 2026' });
        const origin = part('song-origin');
        expect(origin).toHaveTextContent('ROOM · 2026');
        expect(origin).toHaveAttribute('y', String(PHONE_LAYOUT.info.origin.y));
    });

    it('should show the original album under the song line while playing', () => {
        const { part } = renderInfo({ origin: 'ROOM · 2026' });
        const { origin, track: line } = PHONE_LAYOUT.info;
        expect(part('song-origin')).toHaveAttribute('y', String(line.y + origin.belowTrack));
        expect(part('track-line')).not.toBeNull();
    });

    it('should show no origin line for a song of a real album', () => {
        expect(renderInfo().part('song-origin')).toBeNull();
    });

    it('should write the given line in the year position (the count on the Favourites disc)', () => {
        const { part } = renderInfo({ sub: '3 首' });
        expect(part('album-year')).toHaveTextContent('3 首');
    });
});
