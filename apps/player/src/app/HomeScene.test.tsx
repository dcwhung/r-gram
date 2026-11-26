import { act, fireEvent, render, screen } from '@testing-library/react';
import { MOTION } from '../config/motion';
import { useState } from 'react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { estimateTextWidth } from '../utils/textMeasure';
import { HomeScene } from './HomeScene';
import { type HomeView, homeView } from './homeView';
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
    onReturnToLoaded: vi.fn(),
    onOpenList: vi.fn(),
    onFocusListTrack: vi.fn(),
    onPlayListTrack: vi.fn(),
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

/**
 * 動作真係改到畫面嘅場景（S-180）：㩒細唱片機之後換成 `to`（同一次 flushSync 入面 render），
 * 好似 useHome 咁；其餘 handler 照用上面嘅 mock
 */
const Live = ({ from, to }: { from: HomeView; to: HomeView }) => {
    const [view, setView] = useState(from);
    const live = { ...handlers, onReturnToLoaded: () => setView(to) };
    return <HomeScene view={view} handlers={live} measure={estimateTextWidth} />;
};

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

    // T-037：暗層、框同歌名喺貼頂組（設計稿 scene()：listLayer() 喺螺絲同唱片機上面、左上資訊下面）；
    // 暗層中間留返唱片夾個窿，唱片夾（play）照㩒得
    it('should lay the arc list over the machine and the screws, under the top-left info', () => {
        const { container } = render(scene(viewOf('room', null, { scene: 'list' })));
        const list = part(container, 'arc-list');
        expect(list?.closest('[data-anchor="top"]')).not.toBeNull();
        expect(list?.previousElementSibling).toHaveAttribute('data-part', 'screws');
        expect(list?.nextElementSibling).toHaveAttribute('data-part', 'info');
        expect(screen.getByRole('button', { name: '播放' })).toHaveAttribute('tabindex', '0');
    });

    it('should turn the top-left info white and show the focused track while the list is open', () => {
        const stage = { scene: 'list' as const, selectedTrackId: 'apollo-18-03' };
        const { container } = render(scene(viewOf('apollo-18', null, stage)));
        expect(part(container, 'info')).toHaveClass('info--dark');
        expect(part(container, 'list-number')).toHaveTextContent('03');
        expect(part(container, 'version')).toHaveClass('info-version--dark');
    });
});

/* T-048：播緊時拎住另一隻碟（Functional Spec FR-043、D52；設計稿第 18 版「播緊時，手上拎住另一隻碟」） */
describe('HomeScene holding another disc', () => {
    const PLAYING: PlaybackState = {
        ...IDLE_PLAYBACK,
        status: 'playing',
        albumId: 'apollo-18',
        trackId: 'apollo-18-01',
    };
    const PAUSED: PlaybackState = { ...PLAYING, status: 'paused', pauseReason: 'user' };
    const holding = (playback: PlaybackState = PLAYING) => viewOf('room', null, {}, playback);
    /** 大唱片機嘅唱臂入面（細唱片機都有自己支唱臂） */
    const bigArm = (container: HTMLElement, name: string) =>
        container.querySelector(`[data-part="chrome-arm"] [data-part="${name}"]`);
    const part = (container: HTMLElement, name: string) =>
        container.querySelector(`[data-part="${name}"]`);

    // B-086 ⑤：拎住另一隻碟（鬆咗手）有細掣（歌書、MV 灰色，播放模式照用）；有細唱片機所以冇唱臂
    it('should hide the big platter and tonearm, keep the small buttons and show the mini turntable', () => {
        const { container } = render(scene(holding()));
        expect(part(container, 'platter-fade')).toHaveAttribute('data-hidden', 'true');
        expect(part(container, 'chrome-arm')).toHaveAttribute('data-hidden', 'true');
        expect(part(container, 'chrome-buttons')).toHaveAttribute('data-hidden', 'false');
        expect(screen.getByRole('button', { name: '歌書：歌詞及創作人員' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        expect(screen.getByRole('button', { name: '觀看 MV' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        expect(screen.getByRole('button', { name: '播放模式：順序播放' })).toHaveAttribute(
            'aria-disabled',
            'false',
        );
        expect(part(container, 'mini-turntable')).toHaveAttribute('data-hidden', 'false');
        expect(part(container, 'mini-label')).toHaveTextContent('播放中');
        expect(part(container, 'mini-title')).toHaveTextContent('apollo-18 1');
    });

    it('should go back to the loaded disc when the mini turntable is pressed', () => {
        render(scene(holding()));
        fireEvent.click(screen.getByRole('button', { name: '返回播放中的唱片：apollo-18 1' }));
        expect(handlers.onReturnToLoaded).toHaveBeenCalled();
    });

    // 瀏覽器實測（T-048）：㩒完細唱片機佢就淡出、離開 Tab 次序：focus 交畀唱片夾（同 S-074 一樣），唔好留喺睇唔到嘅掣
    it('should hand the focus to the clamp after the mini turntable is pressed', () => {
        const back = viewOf('apollo-18', null, {}, PLAYING);
        const { container } = render(<Live from={holding()} to={back} />);
        const mini = screen.getByRole('button', { name: '返回播放中的唱片：apollo-18 1' });
        mini.focus();
        fireEvent.keyDown(mini, { key: 'Enter' });
        expect(document.activeElement).toBe(container.querySelector('.spindle'));
    });

    // S-180：動作冇生效（仍然拎住碟）：唱片夾仍然唔係掣（aria-hidden），focus 唔好落去佢度，留喺原位
    it('should leave the focus where it is when the press changes nothing', () => {
        render(scene(holding()));
        const mini = screen.getByRole('button', { name: '返回播放中的唱片：apollo-18 1' });
        mini.focus();
        fireEvent.keyDown(mini, { key: 'Enter' });
        expect(handlers.onReturnToLoaded).toHaveBeenCalled();
        expect(document.activeElement).toBe(mini);
    });

    it('should say paused on the mini turntable while the song is paused', () => {
        const { container } = render(scene(holding(PAUSED)));
        expect(part(container, 'mini-label')).toHaveTextContent('已暫停');
    });

    // B-086 ③：拎住另一隻碟時唱片夾係真嘅 play 掣（㩒 = 隻碟入機播第一首）
    it('should keep the clamp of the held disc a play button in the Tab order', () => {
        const { container } = render(scene(holding()));
        const spindle = container.querySelector('.spindle');
        expect(spindle).toHaveAttribute('tabindex', '0');
        expect(spindle).not.toHaveAttribute('aria-hidden');
        expect(spindle).toHaveAccessibleName('播放');
    });

    it('should disable the clamp while the dial is open', () => {
        const { container } = render(scene(viewOf('room', null, { scene: 'discChange' })));
        expect(container.querySelector('.spindle')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should keep the platter and hide the mini turntable on the loaded disc', () => {
        const { container } = render(scene(viewOf('apollo-18', null, {}, PLAYING)));
        expect(part(container, 'platter-fade')).toHaveAttribute('data-hidden', 'false');
        expect(part(container, 'mini-turntable')).toHaveAttribute('data-hidden', 'true');
        expect(container.querySelector('.spindle')).toHaveAttribute('tabindex', '0');
    });

    it('should have no mini turntable when no song is loaded', () => {
        const { container } = render(scene(viewOf('room')));
        expect(part(container, 'mini-turntable')).toBeNull();
        expect(part(container, 'platter-fade')).toHaveAttribute('data-hidden', 'false');
    });

    it('should narrow the album title to the left of the mini turntable', () => {
        const long = (view: ReturnType<typeof viewOf>) =>
            view.album ? { ...view, album: { ...view.album, title: 'WE ARE RUBBERBAND' } } : view;
        const sizeOf = (view: ReturnType<typeof viewOf>) => {
            const { container, unmount } = render(scene(long(view)));
            const size = Number(part(container, 'album-title')?.getAttribute('font-size'));
            unmount();
            return size;
        };
        expect(sizeOf(viewOf('room'))).toBe(88);
        expect(sizeOf(holding())).toBeLessThan(88);
    });

    // FR-040：返去載入嘅碟唔行開場：唱臂即時喺落針位（小燈著），之後淡入
    it('should put the tonearm straight on the loaded disc when going back, with no lead-in', () => {
        const { container, rerender } = render(scene(holding()));
        rerender(scene(viewOf('apollo-18', null, {}, PLAYING)));
        expect(part(container, 'chrome-arm')).toHaveAttribute('data-hidden', 'false');
        expect(part(container, 'arm')).toHaveAttribute('data-instant', 'true');
        expect(bigArm(container, 'led-glow')).not.toBeNull();
    });

    // T-049 會行呢條路：拎住嘅碟放入唱片機（載入嘅碟變咗）= 由泊位行完整開場
    it('should still run the full lead-in when the held disc becomes the loaded one', () => {
        const { container, rerender } = render(scene(holding()));
        const started: PlaybackState = { ...PLAYING, albumId: 'room', trackId: 'room-01' };
        rerender(scene(viewOf('room', null, {}, started)));
        expect(part(container, 'arm')).not.toHaveAttribute('data-instant');
        expect(bigArm(container, 'led-glow')).toBeNull();
    });

    /* T-049：碟名下面即刻列出拎住嘅碟嘅歌單；碟上面蓋一層半透明嘅舞台底色 */
    it('should list the held disc under its title and lay the scrim over the discs', () => {
        const { container } = render(scene(holding()));
        expect(screen.getByRole('list', { name: 'ROOM 的歌曲' })).toBeInTheDocument();
        expect(part(container, 'held-scrim')).toHaveAttribute('data-hidden', 'false');
    });

    // B-086：開 app 冇歌（未揀歌）都有歌單欄同半透明層
    it('should list the disc on screen under its title when nothing is loaded', () => {
        const { container } = render(scene(viewOf('room')));
        expect(screen.getByRole('list', { name: 'ROOM 的歌曲' })).toBeInTheDocument();
        expect(part(container, 'held-scrim')).toHaveAttribute('data-hidden', 'false');
    });

    it('should have no track column and a hidden scrim on the loaded disc', () => {
        const { container } = render(scene(viewOf('apollo-18', null, {}, PLAYING)));
        expect(screen.queryByRole('list')).toBeNull();
        expect(part(container, 'held-scrim')).toHaveAttribute('data-hidden', 'true');
    });

    // 設計稿 scene()：碟 → 半透明層（連螺絲再畫一次）→ 字母盤 → 旋鈕；欄喺左上資訊下面、細唱片機上面
    it('should draw the scrim above the discs and below the dial, with the screw above it', () => {
        const { container } = render(scene(holding()));
        const scrim = part(container, 'held-scrim');
        const stack = [...container.querySelectorAll('[data-part="stack-disc"]')].at(-1);
        const plate = part(container, 'dial-plate');
        const follows = Node.DOCUMENT_POSITION_FOLLOWING;
        expect(stack && scrim && stack.compareDocumentPosition(scrim) & follows).toBeTruthy();
        expect(scrim && plate && scrim.compareDocumentPosition(plate) & follows).toBeTruthy();
        expect(scrim?.querySelector('[data-part="scrim-screws"]')).not.toBeNull();
        const list = part(container, 'held-tracks');
        const info = part(container, 'album-title');
        expect(list && info && list.compareDocumentPosition(info) & follows).toBeTruthy();
    });

    // W-044：設計稿 scene()：細唱片機喺下、歌單欄喺上（兩者感應範圍重疊嗰條屬歌單行，S-173）
    it('should draw the track column above the mini turntable', () => {
        const { container } = render(scene(holding()));
        const mini = part(container, 'mini-turntable');
        const list = part(container, 'held-tracks');
        const follows = Node.DOCUMENT_POSITION_FOLLOWING;
        expect(mini && list && mini.compareDocumentPosition(list) & follows).toBeTruthy();
    });

    // B-086 ①：歌單欄純睇：㩒一行、Enter 都冇反應，亦唔會㩒到下面嘅碟面
    it('should do nothing when a row of the track column is pressed', () => {
        Object.values(handlers).forEach((handler) => handler.mockClear());
        const { container } = render(scene(holding()));
        const item = screen.getByRole('listitem', { name: '第 1 首：room 1' });
        fireEvent.click(item);
        fireEvent.keyDown(item, { key: 'Enter' });
        const hit = item.querySelector('[data-part="held-hit"]');
        if (hit) fireEvent.click(hit);
        Object.values(handlers).forEach((handler) => expect(handler).not.toHaveBeenCalled());
        expect(container.querySelector('[data-part="held-tracks"] .pressable')).toBeNull();
    });
});

/* T-037：主頁㩒碟面打開弧線歌單（Functional Spec FR-005（第 18 版）、US-004；設計稿「碟面：打開歌單」） */
/* B-086 ④：快擰途中唔顯示歌單欄；停定 settle 毫秒先出 */
describe('HomeScene track column while turning', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should hide the column while turning and show it once the dial rests', () => {
        const turning = (albumId: string) => viewOf(albumId, null, { scene: 'discChange' });
        const { rerender } = render(scene(turning('apollo-18')));
        expect(screen.getByRole('list')).toBeInTheDocument();
        rerender(scene(turning('room')));
        expect(screen.queryByRole('list')).toBeNull();
        act(() => vi.advanceTimersByTime(MOTION.input.columnSettleMs));
        expect(screen.getByRole('list', { name: 'ROOM 的歌曲' })).toBeInTheDocument();
    });
});

/* 設計稿第 19 版：由歌單欄開弧線歌單時左上資訊交叉淡入（黑字留喺暗層下面，白字淡入） */
describe('HomeScene arc list opened from the column', () => {
    it('should cross-fade the top-left info while the rows float in', () => {
        const { container, rerender } = render(scene(viewOf('room')));
        rerender(scene(viewOf('room', null, { scene: 'list' })));
        const ghost = container.querySelector('[data-part="list-info-ghost"]');
        expect(ghost).toHaveAttribute('aria-hidden', 'true');
        expect(container.querySelector('.list-info-in')).not.toBeNull();
        const veil = container.querySelector('[data-part="arc-veil"]');
        const follows = Node.DOCUMENT_POSITION_FOLLOWING;
        expect(ghost && veil && ghost.compareDocumentPosition(veil) & follows).toBeTruthy();
    });
});

describe('HomeScene disc face', () => {
    const PLAYING: PlaybackState = {
        ...IDLE_PLAYBACK,
        status: 'playing',
        albumId: 'apollo-18',
        trackId: 'apollo-18-01',
    };
    const part = (container: HTMLElement, name: string) =>
        container.querySelector<SVGElement>(`[data-part="${name}"]`);

    it('should open the list from the face of the loaded disc, in the Tab order', () => {
        handlers.onOpenList.mockClear();
        const { container } = render(scene(viewOf('apollo-18', null, {}, PLAYING)));
        const disc = part(container, 'disc-face');
        expect(disc).toHaveAttribute('tabindex', '0');
        expect(disc).toHaveAccessibleName('開啟歌單');
        if (disc) fireEvent.click(disc);
        expect(handlers.onOpenList).toHaveBeenCalledTimes(1);
        // 唱片夾喺碟面上面：碟面嘅感應範圍中間留返唱片夾嘅位
        expect(disc?.previousElementSibling).toHaveClass('spindle');
        expect(disc).toHaveAttribute('fill-rule', 'evenodd');
    });

    // B-086 ③：唱片夾一定係 play，開弧線歌單一律經碟面：冇歌載入時碟面都入 Tab 次序
    it('should keep the face a button when nothing is loaded', () => {
        const { container } = render(scene(viewOf('apollo-18')));
        const disc = part(container, 'disc-face');
        expect(disc).toHaveAttribute('tabindex', '0');
        expect(disc).not.toHaveAttribute('aria-hidden');
        expect(container.querySelector('.spindle')).toHaveAccessibleName('播放');
    });

    // B-086 ②：拎住另一隻碟都可以㩒碟面開弧線歌單；字母盤開住就冇碟面
    it('should have a disc face while another disc is held, but not while the dial is open', () => {
        const held = render(scene(viewOf('room', null, {}, PLAYING)));
        expect(part(held.container, 'disc-face')).not.toBeNull();
        held.unmount();
        const turning = render(scene(viewOf('room', null, { scene: 'discChange' }, PLAYING)));
        expect(part(turning.container, 'disc-face')).toBeNull();
    });

    it('should hand the focus back to the disc face when the list it opened closes', () => {
        const home = viewOf('apollo-18', null, {}, PLAYING);
        const list = viewOf('apollo-18', null, { scene: 'list' }, PLAYING);
        const Toggle = () => {
            const [view, setView] = useState(home);
            const live = {
                ...handlers,
                onOpenList: () => setView(list),
                onCloseList: () => setView(home),
            };
            return <HomeScene view={view} handlers={live} measure={estimateTextWidth} />;
        };
        const { container } = render(<Toggle />);
        const disc = part(container, 'disc-face');
        if (disc) fireEvent.click(disc);
        expect(screen.getByRole('listbox')).toHaveFocus();
        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(part(container, 'disc-face')).toHaveFocus();
    });
});
