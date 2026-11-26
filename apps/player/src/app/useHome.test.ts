import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import {
    makeAlbum,
    makeDocument,
    sampleDocument,
    withSecondCover,
} from '../catalog/testing/catalogFixtures';
import { testPlayback } from '../playback/testing/testPlayback';
import { createTestMv } from '../mv/testing/testMv';
import { useHome } from './useHome';

/** `apollo-18` 第 1 首有 MV */
const catalogWithMv = (): CatalogDocument => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

const press = (home: { current: ReturnType<typeof useHome> }, name: 'onSpindle' | 'onMv') =>
    act(() => home.current.handlers?.[name]());

describe('useHome', () => {
    // S-073：電視開住時唱片夾喺電視後面（T-060）：就算有人叫到 onSpindle 都唔反應
    it('should ignore the clamp while the MV is open', () => {
        const { mv } = createTestMv({ reduceMotion: true });
        const { result } = renderHook(() =>
            useHome(catalogWithMv(), testPlayback(), undefined, undefined, mv),
        );
        press(result, 'onSpindle');
        press(result, 'onMv');
        const before = { stage: result.current.stage, playback: result.current.playback };
        press(result, 'onSpindle');
        expect(result.current.stage).toBe(before.stage);
        expect(result.current.playback).toBe(before.playback);
        expect(result.current.view?.mvOpen).toBe(true);
    });
});

/* Review S-078：catalog 遲過 Preload 開始先到，都要離開得 Preload（T-034） */
describe('useHome finishPreload', () => {
    it('should open the first disc when Preload finishes after a late catalog', () => {
        const { result, rerender } = renderHook(({ catalog }) => useHome(catalog, testPlayback()), {
            initialProps: { catalog: null as CatalogDocument | null },
        });
        expect(result.current.stage.scene).toBe('preload');
        rerender({ catalog: sampleDocument() });
        expect(result.current.stage.scene).toBe('preload');
        act(() => result.current.finishPreload());
        expect(result.current.stage.scene).toBe('home');
        expect(result.current.stage.viewAlbumId).toBe('apollo-18');
    });

    it('should stay on Preload when there is still no catalog', () => {
        const { result } = renderHook(() => useHome(null, testPlayback()));
        act(() => result.current.finishPreload());
        expect(result.current.stage.scene).toBe('preload');
    });
});

/* CR-005 D56：主頁用開 app 時揀中嘅封面；catalog 更新都唔變 */
describe('useHome cover pick', () => {
    const catalogWithTwoCovers = (): CatalogDocument => {
        const document = sampleDocument();
        document.albums = document.albums.map(withSecondCover);
        return document;
    };

    it('should show the cover picked when the app started, even after a catalog refresh', () => {
        let random = () => 0.9;
        const { result, rerender } = renderHook(
            ({ catalog }) => useHome(catalog, testPlayback(), () => random()),
            {
                initialProps: { catalog: catalogWithTwoCovers() },
            },
        );
        random = () => 0;
        rerender({ catalog: catalogWithTwoCovers() });
        expect(result.current.view?.coverUrl).toBe(
            'https://api.example/catalog/v1/img/apollo-18-cover2.webp',
        );
    });
});

/* T-036：擰旋鈕揀碟、♥（Functional Spec US-003、US-013；D27：留喺揀咗嗰隻碟） */
describe('useHome turning the knob', () => {
    const turn = (home: { current: ReturnType<typeof useHome> }, position?: number) => ({
        start: () => act(() => home.current.handlers?.onTurnStart()),
        to: () => act(() => home.current.handlers?.onTurn(position ?? 0)),
        end: () => act(() => home.current.handlers?.onTurnEnd()),
        cancel: () => act(() => home.current.handlers?.onTurnCancel()),
    });

    it('should open the dial, follow the knob and stay on the chosen disc when released', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        turn(result).start();
        expect(result.current.stage.scene).toBe('discChange');
        turn(result, 1).to();
        expect(result.current.stage.viewAlbumId).toBe('room');
        expect(result.current.view?.dial.current).toBe(1);
        turn(result).end();
        expect(result.current.stage).toMatchObject({ scene: 'home', viewAlbumId: 'room' });
    });

    // S-154：Esc 取消：收埋字母盤，返去開始揀碟嗰陣嘅碟
    it('should go back to the disc shown when the turn started on cancel', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        turn(result).start();
        turn(result, 1).to();
        turn(result).cancel();
        expect(result.current.stage).toMatchObject({ scene: 'home', viewAlbumId: 'apollo-18' });
    });

    it('should go to the Favourites disc at the ♥ position', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        turn(result).start();
        turn(result, 2).to();
        expect(result.current.stage.viewAlbumId).toBe('favourites');
    });

    it('should ignore a position outside the dial', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        turn(result).start();
        const before = result.current.stage;
        turn(result, 9).to();
        expect(result.current.stage).toBe(before);
    });

    it('should go to the Favourites disc and back with ♥', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        act(() => result.current.handlers?.onFavourites());
        expect(result.current.stage.viewAlbumId).toBe('favourites');
        act(() => result.current.handlers?.onFavourites());
        expect(result.current.stage.viewAlbumId).toBe('apollo-18');
    });
});

/* T-048：播緊時拎住另一隻碟（Functional Spec FR-043、D52）：聲照播；㩒細唱片機返去載入嘅碟 */
describe('useHome holding another disc', () => {
    /** 㩒唱片夾播第一首（apollo-18-01），再擰去 room 鬆手 */
    const holdRoom = (document: CatalogDocument = sampleDocument()) => {
        const { result } = renderHook(() => useHome(document, testPlayback()));
        press(result, 'onSpindle');
        act(() => result.current.handlers?.onTurnStart());
        act(() => result.current.handlers?.onTurn(1));
        act(() => result.current.handlers?.onTurnEnd());
        return result;
    };

    it('should hold the other disc while the song keeps playing', () => {
        const result = holdRoom();
        expect(result.current.view).toMatchObject({ holding: true, loadedAlbumId: 'apollo-18' });
        expect(result.current.playback).toMatchObject({ status: 'playing', albumId: 'apollo-18' });
    });

    // B-086 ③：拎住另一隻碟㩒 play = 隻碟入機播第一首有音檔嘅歌
    it('should put the held disc on and play its first playable track from the clamp', () => {
        const result = holdRoom();
        press(result, 'onSpindle');
        expect(result.current.playback).toMatchObject({
            status: 'playing',
            albumId: 'room',
            trackId: 'room-01',
        });
        expect(result.current.view).toMatchObject({ holding: false, armPose: 'playing' });
    });

    it('should ignore the clamp while the dial is open', () => {
        const result = holdRoom();
        act(() => result.current.handlers?.onTurnStart());
        const before = { stage: result.current.stage, playback: result.current.playback };
        press(result, 'onSpindle');
        expect(result.current.stage).toBe(before.stage);
        expect(result.current.playback).toBe(before.playback);
    });

    // B-086 ②：拎住另一隻碟都係㩒碟面開弧線歌單；框入面係第一首有音檔嘅歌
    it('should open the arc list of the held disc from its face', () => {
        const result = holdRoom();
        expect(result.current.view?.canOpenList).toBe(true);
        act(() => result.current.handlers?.onOpenList());
        expect(result.current.stage).toMatchObject({ scene: 'list', viewAlbumId: 'room' });
        expect(result.current.view?.list?.focusIndex).toBe(0);
    });

    // B-086 ②：弧線歌單入面播框入面嗰首 = 拎住嘅碟入機（載入嘅碟停、細唱片機冇咗、唱臂由泊位開場）
    it('should put the held disc on when a track of its arc list is played', () => {
        const result = holdRoom();
        act(() => result.current.handlers?.onOpenList());
        press(result, 'onSpindle');
        expect(result.current.playback).toMatchObject({
            status: 'playing',
            albumId: 'room',
            trackId: 'room-01',
        });
        expect(result.current.view).toMatchObject({ holding: false, armPose: 'playing' });
        expect(result.current.view?.mini?.shown).toBe(false);
    });

    it('should do nothing on the disc face while the dial is open', () => {
        const result = holdRoom();
        act(() => result.current.handlers?.onTurnStart());
        const before = result.current.stage;
        act(() => result.current.handlers?.onOpenList());
        expect(result.current.stage).toBe(before);
        expect(result.current.view?.canOpenList).toBe(false);
    });

    it('should put the held disc back and show the loaded one without touching playback', () => {
        const result = holdRoom();
        const playback = result.current.playback;
        act(() => result.current.handlers?.onReturnToLoaded());
        expect(result.current.stage).toMatchObject({ scene: 'home', viewAlbumId: 'apollo-18' });
        expect(result.current.view?.holding).toBe(false);
        expect(result.current.playback).toBe(playback);
    });

    it('should list the held disc under its title, longer while the dial is open', () => {
        const result = holdRoom();
        expect(result.current.view?.trackColumn).toMatchObject({
            albumId: 'room',
            dialOpen: false,
        });
        expect(result.current.handlers).not.toHaveProperty('onPlayHeldTrack');
        act(() => result.current.handlers?.onTurnStart());
        expect(result.current.view?.trackColumn).toMatchObject({ dialOpen: true });
    });
});

/* 設計稿第 19 版 showsColumn()（B-086）：未揀歌就有歌單欄；揀咗歌就冇；弧線歌單開住時收起，收返就出返 */
describe('useHome track column', () => {
    it('should show the column of the first disc right after Preload', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        expect(result.current.view?.trackColumn).toMatchObject({ albumId: 'apollo-18' });
    });

    it('should hide the column in the arc list and bring it back when closed without choosing', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        act(() => result.current.handlers?.onOpenList());
        expect(result.current.view?.trackColumn).toBeNull();
        act(() => result.current.handlers?.onCloseList());
        expect(result.current.view?.trackColumn).toMatchObject({ albumId: 'apollo-18' });
    });

    it('should hide the column once a track of the disc is chosen', () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        act(() => result.current.handlers?.onOpenList());
        act(() => result.current.handlers?.onPlayListTrack('apollo-18-01'));
        expect(result.current.view?.trackColumn).toBeNull();
        act(() => result.current.handlers?.onTurnStart());
        expect(result.current.view?.trackColumn).toMatchObject({ dialOpen: true });
    });
});

/* T-037：弧線歌單（Functional Spec US-004、D25、D52；設計稿第 18 版「歌單（㩒碟面）」） */
describe('useHome arc list', () => {
    const open = () => {
        const { result } = renderHook(() => useHome(sampleDocument(), testPlayback()));
        act(() => result.current.handlers?.onOpenList());
        return result;
    };

    it('should open the list from the disc face with the first playable track in the frame', () => {
        const result = open();
        expect(result.current.stage).toMatchObject({
            scene: 'list',
            selectedTrackId: 'apollo-18-01',
        });
        expect(result.current.view?.list?.focusIndex).toBe(0);
    });

    it('should move the frame to the track scrolled into it', () => {
        const result = open();
        act(() => result.current.handlers?.onFocusListTrack('apollo-18-03'));
        expect(result.current.view?.listTrack?.id).toBe('apollo-18-03');
        expect(result.current.playback.status).toBe('idle');
    });

    // 㩒一行（或者 Enter）= 揀嗰首播：同㩒唱片夾播框入面嗰首一樣（返主頁、播放狀態 start）
    it('should play a chosen row and go back home', () => {
        const result = open();
        act(() => result.current.handlers?.onPlayListTrack('apollo-18-03'));
        expect(result.current.stage).toMatchObject({
            scene: 'home',
            selectedTrackId: 'apollo-18-03',
        });
        expect(result.current.playback).toMatchObject({
            status: 'playing',
            albumId: 'apollo-18',
            trackId: 'apollo-18-03',
        });
    });

    it('should ignore a grey row or a track that is not on the disc', () => {
        const result = open();
        const before = { stage: result.current.stage, playback: result.current.playback };
        act(() => result.current.handlers?.onPlayListTrack('apollo-18-02'));
        act(() => result.current.handlers?.onPlayListTrack('room-01'));
        expect(result.current.stage).toBe(before.stage);
        expect(result.current.playback).toBe(before.playback);
    });

    // 載入嘅碟：主頁㩒碟面照開弧線歌單，框入面係播緊嗰首
    it('should open the list of the loaded disc on the playing track', () => {
        const result = open();
        act(() => result.current.handlers?.onPlayListTrack('apollo-18-03'));
        act(() => result.current.handlers?.onOpenList());
        expect(result.current.stage).toMatchObject({ scene: 'list' });
        expect(result.current.view?.list?.focusIndex).toBe(2);
        expect(result.current.playback.status).toBe('playing');
    });
});

/* 設計稿第 19 版 ACTIONS.playpause（B-086 ③）：未揀歌㩒 play = 播呢隻碟第一首有音檔嘅歌 */
describe('useHome clamp with no chosen track', () => {
    it('should play the first track with audio of the disc on screen', () => {
        const document = makeDocument([makeAlbum('room', [null, 'room/02.m4a'])]);
        const { result } = renderHook(() => useHome(document, testPlayback()));
        expect(result.current.view?.spindle).toBe('idle');
        press(result, 'onSpindle');
        expect(result.current.stage.scene).toBe('home');
        expect(result.current.playback).toMatchObject({ status: 'playing', trackId: 'room-02' });
        expect(result.current.view?.track?.id).toBe('room-02');
    });

    it('should do nothing when the disc has no playable track', () => {
        const document = makeDocument([makeAlbum('room', [null])]);
        const { result } = renderHook(() => useHome(document, testPlayback()));
        const before = { stage: result.current.stage, playback: result.current.playback };
        press(result, 'onSpindle');
        expect(result.current.stage).toBe(before.stage);
        expect(result.current.playback).toBe(before.playback);
    });
});

/* T-037：設計稿 ACTIONS.playpause：冇歌嘅碟（D39）歌單入面㩒唱片夾 = 收返歌單 */
describe('useHome empty list', () => {
    it('should close the list of an album without tracks when the clamp is pressed', () => {
        const document = makeDocument([makeAlbum('room', [])]);
        const { result } = renderHook(() => useHome(document, testPlayback()));
        act(() => result.current.handlers?.onOpenList());
        expect(result.current.stage.scene).toBe('list');
        press(result, 'onSpindle');
        expect(result.current.stage.scene).toBe('home');
        expect(result.current.playback.status).toBe('idle');
    });
});
