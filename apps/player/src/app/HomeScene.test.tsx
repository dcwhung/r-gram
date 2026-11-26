import { fireEvent, render, screen } from '@testing-library/react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { estimateTextWidth } from '../utils/textMeasure';
import { HomeScene } from './HomeScene';
import { homeView } from './homeView';
import { IDLE_PLAYBACK, type PlaybackState } from './playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const handlers = {
    onSpindle: vi.fn(),
    onBooklet: vi.fn(),
    onMv: vi.fn(),
    onMode: vi.fn(),
    onCloseList: vi.fn(),
    onTurnStart: vi.fn(),
    onTurn: vi.fn(),
    onTurnEnd: vi.fn(),
    onTurnCancel: vi.fn(),
    onFavourites: vi.fn(),
};

const viewOf = (
    albumId: string,
    cover: string | null = null,
    stageOverrides: Partial<StageState> = {},
    playback: PlaybackState = IDLE_PLAYBACK,
) => {
    const document = sampleDocument();
    document.albums.forEach((album) => {
        album.cover = cover;
    });
    const stage: StageState = {
        ...INITIAL_STAGE,
        scene: 'home',
        viewAlbumId: albumId,
        ...stageOverrides,
    };
    return homeView(document, stage, playback);
};
const CURRENT_COVER = '[data-current="true"] [data-part="cover"]';

const scene = (view: ReturnType<typeof viewOf>) => (
    <HomeScene view={view} handlers={handlers} measure={estimateTextWidth} />
);

describe('HomeScene', () => {
    it('should show the cover of the disc when the catalog has one', () => {
        const { container } = render(scene(viewOf('room', 'room.jpg')));
        expect(container.querySelector(`${CURRENT_COVER} image`)).toHaveAttribute(
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
        const before = container.querySelector(CURRENT_COVER);
        rerender(scene(viewOf('apollo-18')));
        expect(container.querySelector(CURRENT_COVER)).toBe(before);
        rerender(scene(viewOf('room')));
        expect(container.querySelector(CURRENT_COVER)).not.toBe(before);
    });
});

/* T-036：轉碟（旋鈕、刻度、♥、字母盤、其他碟）；Functional Spec US-003、D52 */
describe('HomeScene choosing a disc', () => {
    const PLAYING: PlaybackState = {
        ...IDLE_PLAYBACK,
        status: 'playing',
        albumId: 'apollo-18',
        trackId: 'apollo-18-01',
    };
    const part = (container: HTMLElement, name: string) =>
        container.querySelector(`[data-part="${name}"]`);

    it('should show the knob pointing at the disc on screen', () => {
        render(scene(viewOf('room')));
        const knob = screen.getByRole('slider', { name: '選擇唱片' });
        expect(knob).toHaveAttribute('aria-valuenow', '1');
        expect(knob).toHaveAttribute('aria-valuetext', 'ROOM');
        expect(knob).toHaveAttribute('aria-valuemax', '2');
    });

    it('should offer the ♥ button for the Favourites disc', () => {
        render(scene(viewOf('room')));
        fireEvent.click(screen.getByRole('button', { name: '前往「我的收藏」' }));
        expect(handlers.onFavourites).toHaveBeenCalled();
    });

    it('should open the letter dial and fade the tonearm and small buttons while choosing', () => {
        const { container } = render(scene(viewOf('room', null, { scene: 'discChange' })));
        expect(part(container, 'dial-plate')).toHaveAttribute('data-open', 'true');
        expect(part(container, 'chrome-arm')).toHaveAttribute('data-hidden', 'true');
        expect(part(container, 'chrome-buttons')).toHaveAttribute('data-hidden', 'true');
        // 淡出咗嘅細掣 Tab 唔到、讀屏唔讀
        expect(part(container, 'small-buttons')).toHaveAttribute('aria-hidden', 'true');
    });

    it('should keep the tonearm and small buttons at home', () => {
        const { container } = render(scene(viewOf('room')));
        expect(part(container, 'dial-plate')).toHaveAttribute('data-open', 'false');
        expect(part(container, 'chrome-arm')).toHaveAttribute('data-hidden', 'false');
    });

    // 淡出期間唱臂姿勢變就即時到位（淡入返嗰陣已經喺新位）
    it('should move the tonearm without a transition only while it is faded out', () => {
        const choosing = render(scene(viewOf('room', null, { scene: 'discChange' })));
        expect(part(choosing.container, 'arm')).toHaveAttribute('data-instant', 'true');
        choosing.unmount();
        const { container } = render(scene(viewOf('room')));
        expect(part(container, 'arm')).not.toHaveAttribute('data-instant');
    });

    it('should fade out the song part while choosing with a song loaded', () => {
        const view = viewOf('apollo-18', null, { scene: 'discChange' }, PLAYING);
        const { container } = render(scene(view));
        expect(part(container, 'song-fade')).toHaveAttribute('data-hidden', 'true');
        expect(part(container, 'album-title')).toHaveTextContent('APOLLO-18');
    });

    it('should stop the playing disc from turning while choosing', () => {
        const { container, rerender } = render(scene(viewOf('apollo-18', null, {}, PLAYING)));
        const cover = () => container.querySelector(CURRENT_COVER);
        expect(cover()).toHaveAttribute('data-spinning', 'true');
        rerender(scene(viewOf('apollo-18', null, { scene: 'discChange' }, PLAYING)));
        expect(cover()).toHaveAttribute('data-spinning', 'false');
    });

    // 設計稿 discs()：唱片夾緊接喺而家隻碟後面，之後嘅碟滑入時蓋過佢
    it('should draw the spindle right after the current disc', () => {
        const { container } = render(scene(viewOf('apollo-18', null, { scene: 'discChange' })));
        const current = container.querySelector('[data-part="stack-disc"][data-current="true"]');
        expect(current?.nextElementSibling).toHaveClass('spindle');
        expect(container.querySelector('[data-album="room"]')?.previousElementSibling).toHaveClass(
            'spindle',
        );
    });

    it('should keep the spindle above the list veil while the list is open', () => {
        const { container } = render(scene(viewOf('room', null, { scene: 'list' })));
        expect(part(container, 'list-veil')?.nextElementSibling).toHaveClass('spindle');
    });
});
