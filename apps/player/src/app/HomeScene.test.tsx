import { render } from '@testing-library/react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { estimateTextWidth } from '../utils/textMeasure';
import { HomeScene } from './HomeScene';
import { homeView } from './homeView';
import { IDLE_PLAYBACK } from './playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const handlers = {
    onSpindle: vi.fn(),
    onBooklet: vi.fn(),
    onMv: vi.fn(),
    onMode: vi.fn(),
    onCloseList: vi.fn(),
};

const viewOf = (albumId: string, cover: string | null = null) => {
    const document = sampleDocument();
    document.albums.forEach((album) => {
        album.cover = cover;
    });
    const stage: StageState = { ...INITIAL_STAGE, scene: 'home', viewAlbumId: albumId };
    return homeView(document, stage, IDLE_PLAYBACK);
};

const scene = (view: ReturnType<typeof viewOf>) => (
    <HomeScene view={view} handlers={handlers} measure={estimateTextWidth} />
);

describe('HomeScene', () => {
    it('should show the cover of the disc when the catalog has one', () => {
        const { container } = render(scene(viewOf('room', 'room.jpg')));
        expect(container.querySelector('[data-part="cover"] image')).toHaveAttribute(
            'href',
            'https://api.example/catalog/v1/img/room.jpg',
        );
    });

    it('should fill the disc with the album colour when there is no cover', () => {
        const { container } = render(scene(viewOf('room')));
        expect(container.querySelector('[data-part="cover-fill"]')).toHaveAttribute(
            'fill',
            '#c8442b',
        );
    });

    // B-033：以專輯 id 做 key，換碟時新封面由 0° 開始（唔會停喺上一隻碟嘅角度）
    it('should mount a new disc when the disc on screen changes', () => {
        const { container, rerender } = render(scene(viewOf('apollo-18')));
        const before = container.querySelector('[data-part="cover"]');
        rerender(scene(viewOf('apollo-18')));
        expect(container.querySelector('[data-part="cover"]')).toBe(before);
        rerender(scene(viewOf('room')));
        expect(container.querySelector('[data-part="cover"]')).not.toBe(before);
    });
});
