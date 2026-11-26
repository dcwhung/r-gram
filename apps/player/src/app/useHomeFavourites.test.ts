import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import { memoryStorage, sampleDocument } from '../catalog/testing/catalogFixtures';
import { FAVOURITES_STORAGE_KEY } from '../config/storageKeys';
import { createFavouritesStore } from '../favourites/store';
import { t } from '../i18n/t';
import { createTestPlayback } from '../playback/testing/testPlayback';
import { useHome } from './useHome';

const clock = () => {
    let time = 0;
    return () => {
        time += 1;
        return time;
    };
};

const mount = (favourited: readonly string[] = []) => {
    const storage = memoryStorage();
    const store = createFavouritesStore({ storage, now: clock() });
    favourited.forEach((trackId) => store.add(trackId));
    const playback = createTestPlayback({ reduceMotion: true });
    const hook = renderHook(() => useHome(sampleDocument(), playback.controller, undefined, store));
    const handlers = () => hook.result.current.handlers;
    const view = () => hook.result.current.view;
    return { ...playback, store, storage, result: hook.result, handlers, view };
};

const toFavourites = (home: ReturnType<typeof mount>) => act(() => home.handlers()?.onFavourites());

const ids = (rows: readonly { id: string }[] | undefined) => rows?.map((row) => row.id);

const listRows = (home: ReturnType<typeof mount>) => {
    act(() => home.handlers()?.onOpenList());
    const rows = ids(home.view()?.list?.rows);
    act(() => home.handlers()?.onCloseList());
    return rows;
};

/* Functional Spec US-010：心形掣收藏播緊嘅歌（本機，重開 app 仍然喺度） */
describe('useHome heart', () => {
    it('should favourite the song in the info and remember it on the device', () => {
        const home = mount();
        act(() => home.handlers()?.onSpindle());
        expect(home.view()?.favourite).toBe(false);
        act(() => home.handlers()?.onFavourite());
        expect(home.view()?.favourite).toBe(true);
        expect(home.store.has('apollo-18-01')).toBe(true);
        expect(home.storage.getItem(FAVOURITES_STORAGE_KEY)).toContain('apollo-18-01');
        act(() => home.handlers()?.onFavourite());
        expect(home.view()?.favourite).toBe(false);
    });

    it('should do nothing when no song is shown', () => {
        const home = mount();
        act(() => home.handlers()?.onFavourite());
        expect(home.store.getSnapshot()).toEqual([]);
    });

    it('should follow a change made outside the screen (another tab)', () => {
        const home = mount();
        act(() => home.handlers()?.onSpindle());
        act(() => home.store.add('apollo-18-01'));
        expect(home.view()?.favourite).toBe(true);
    });
});

/* US-013、D19：Favourites 碟係一隻普通嘅碟 */
describe('useHome Favourites disc', () => {
    it('should show the disc with its title, count and the favourites in favourite order', () => {
        const home = mount(['room-01', 'apollo-18-03', 'apollo-18-02']);
        toFavourites(home);
        const view = home.view();
        expect(view?.album?.id).toBe(FAVOURITES_ALBUM_ID);
        expect(view?.album?.title).toBe(t('favourites.title'));
        expect(view?.albumSub).toBe(t('album.trackCount', { count: 3 }));
        expect(view?.trackColumn?.rows.map((row) => [row.id, row.number, row.playable])).toEqual([
            ['room-01', '01', true],
            ['apollo-18-03', '02', true],
            ['apollo-18-02', '03', false],
        ]);
    });

    it('should play the first playable favourite from the clamp, as the Favourites disc', () => {
        const home = mount(['apollo-18-02', 'room-01', 'apollo-18-01']);
        toFavourites(home);
        act(() => home.handlers()?.onSpindle());
        expect(home.result.current.playback).toMatchObject({
            status: 'playing',
            albumId: FAVOURITES_ALBUM_ID,
            trackId: 'room-01',
        });
        expect(home.element.src).toBe('https://media.example/room/01.m4a');
        expect(home.view()?.origin).toBe('ROOM');
        expect(home.view()?.track?.no).toBe(2);
    });

    it('should play the framed favourite from the arc list as the Favourites disc', () => {
        const home = mount(['room-01', 'apollo-18-03']);
        toFavourites(home);
        act(() => home.handlers()?.onOpenList());
        act(() => home.handlers()?.onFocusListTrack('apollo-18-03'));
        expect(home.view()?.origin).toBe('APOLLO-18');
        act(() => home.handlers()?.onSpindle());
        expect(home.result.current.playback).toMatchObject({
            albumId: FAVOURITES_ALBUM_ID,
            trackId: 'apollo-18-03',
        });
    });

    it('should hold the Favourites disc while a song of its own album plays (two different discs)', () => {
        const home = mount(['apollo-18-01']);
        act(() => home.handlers()?.onSpindle());
        toFavourites(home);
        expect(home.view()?.holding).toBe(true);
        expect(home.view()?.mini?.shown).toBe(true);
        expect(home.view()?.trackColumn?.albumId).toBe(FAVOURITES_ALBUM_ID);
    });

    it('should do nothing harmful with no favourites: the disc stays, the clamp does nothing', () => {
        const home = mount();
        toFavourites(home);
        expect(home.view()?.album?.id).toBe(FAVOURITES_ALBUM_ID);
        expect(home.view()?.trackColumn?.emptyText).toBe(t('favourites.empty'));
        act(() => home.handlers()?.onSpindle());
        expect(home.result.current.playback.status).toBe('idle');
        act(() => home.handlers()?.onOpenList());
        expect(home.view()?.list?.emptyText).toBe(t('favourites.empty'));
        act(() => home.handlers()?.onSpindle());
        expect(home.view()?.listOpen).toBe(false);
    });
});

/* US-013：喺 Favourites 碟取消收藏播緊嘅歌：首歌播完先由歌單消失，唔會即刻停 */
describe('useHome un-favouriting the song playing from the Favourites disc', () => {
    const playingFavourites = () => {
        const home = mount(['apollo-18-01', 'room-01', 'apollo-18-03']);
        toFavourites(home);
        act(() => home.handlers()?.onSpindle());
        act(() => home.handlers()?.onFavourite());
        return home;
    };

    it('should keep playing and keep the song in its place until it is over', () => {
        const home = playingFavourites();
        expect(home.view()?.favourite).toBe(false);
        expect(home.result.current.playback).toMatchObject({
            status: 'playing',
            trackId: 'apollo-18-01',
        });
        expect(listRows(home)).toEqual(['apollo-18-01', 'room-01', 'apollo-18-03']);
        expect(home.store.has('apollo-18-01')).toBe(false);
    });

    it('should drop the song once another one plays', () => {
        const home = playingFavourites();
        act(() => home.controller.next());
        expect(home.result.current.playback.trackId).toBe('room-01');
        expect(listRows(home)).toEqual(['room-01', 'apollo-18-03']);
    });

    it('should put the song back in its place when favourited again while it plays', () => {
        const home = playingFavourites();
        act(() => home.handlers()?.onFavourite());
        expect(home.store.getSnapshot().map((entry) => entry.trackId)).toEqual([
            'apollo-18-01',
            'room-01',
            'apollo-18-03',
        ]);
    });
});

/* T-070：Favourites 碟播緊時收藏有變：隊列跟住（自動下一首跨碟） */
describe('useHome queue of the Favourites disc', () => {
    it('should go on across albums and into a song favourited while the disc plays', () => {
        const home = mount(['room-01']);
        toFavourites(home);
        act(() => home.handlers()?.onSpindle());
        act(() => home.store.add('apollo-18-03'));
        act(() => home.element.finish());
        expect(home.result.current.playback).toMatchObject({
            albumId: FAVOURITES_ALBUM_ID,
            trackId: 'apollo-18-03',
        });
        expect(home.element.src).toBe('https://media.example/apollo-18/03.m4a');
    });

    it('should not touch the queue of a real album when the favourites change', () => {
        const home = mount();
        act(() => home.handlers()?.onSpindle());
        act(() => home.store.add('room-01'));
        act(() => home.element.finish());
        expect(home.result.current.playback.trackId).toBe('apollo-18-03');
    });
});
