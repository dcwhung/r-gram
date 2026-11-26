import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import { memoryStorage, sampleDocument } from '../catalog/testing/catalogFixtures';
import { MOTION } from '../config/motion';
import { createFavouritesStore, type FavouritesStore } from '../favourites/store';
import { createTestMv } from '../mv/testing/testMv';
import { createTestPlayback } from '../playback/testing/testPlayback';
import { useHome } from './useHome';

const MV_URL = 'https://media.example/apollo-18/01.mp4';
const { tvCloseMs } = MOTION.scene;

/** `apollo-18` 第 1 首有 MV；第 3 首冇 */
const catalogWithMv = (): CatalogDocument => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

const mount = (favourites?: FavouritesStore) => {
    const playback = createTestPlayback({ reduceMotion: true });
    const tv = createTestMv({ reduceMotion: false });
    const hook = renderHook(() =>
        useHome(catalogWithMv(), playback.controller, undefined, favourites, tv.mv),
    );
    const handlers = () => hook.result.current.handlers;
    const home = () => hook.result.current;
    return { playback, tv, handlers, home };
};

type Mounted = ReturnType<typeof mount>;

/** 叫 handler，記低佢返嚟嗰刻 <video> 已經 play() 咗幾多次（= 同一個 call stack） */
const videoPlaysDuring = ({ tv }: Mounted, call: () => void) => {
    let count = -1;
    act(() => {
        call();
        count = tv.element.plays.length;
    });
    return count;
};

/* T-060：MV 掣 → 電視（Functional Spec US-007、C8；Technical Spec「CR-010 → MV 音訊」） */
describe('useHome MV TV', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should stop the record and ready the MV in the same call stack as the MV button', () => {
        const mounted = mount();
        act(() => mounted.handlers()?.onSpindle());
        expect(videoPlaysDuring(mounted, () => mounted.handlers()?.onMv())).toBe(1);
        expect(mounted.tv.element.plays[0]?.src).toBe(MV_URL);
        expect(mounted.home().playback).toMatchObject({ status: 'paused', pauseReason: 'mv' });
        expect(mounted.home().view).toMatchObject({ mvOpen: true, armPose: 'parked' });
        expect(mounted.home().tv).toMatchObject({ phase: 'open', title: 'apollo-18 1' });
    });

    it('should do nothing for a track without an MV', () => {
        const mounted = mount();
        act(() => mounted.handlers()?.onOpenList());
        act(() => mounted.handlers()?.onPlayListTrack('apollo-18-03'));
        act(() => mounted.handlers()?.onMv());
        expect(mounted.tv.element.plays).toEqual([]);
        expect(mounted.home().tv).toBeNull();
        expect(mounted.home().view?.mvOpen).toBe(false);
        expect(mounted.home().playback.status).toBe('playing');
    });

    it('should send the TV buttons to the MV', () => {
        const mounted = mount();
        act(() => mounted.handlers()?.onSpindle());
        act(() => mounted.handlers()?.onMv());
        act(() => mounted.home().tvHandlers?.onPause());
        expect(mounted.home().tv?.active).toBe('pause');
        act(() => mounted.home().tvHandlers?.onPlay());
        expect(mounted.home().tv?.active).toBe('play');
    });

    // T-061：兩粒旋鈕直接去電視（音量、靜音、快轉／倒轉）
    it('should send the knobs to the MV', () => {
        const mounted = mount();
        act(() => mounted.handlers()?.onSpindle());
        act(() => mounted.handlers()?.onMv());
        act(() => vi.advanceTimersByTime(MOTION.scene.crtOnDelayMs + MOTION.scene.crtOnMs));
        act(() => mounted.tv.element.loadMetadata(120));
        act(() => mounted.home().tvHandlers?.onVolume(0.3));
        act(() => mounted.home().tvHandlers?.onToggleMute());
        act(() => mounted.home().tvHandlers?.onSeekBy(10));
        expect(mounted.home().tv).toMatchObject({ volume: 0.3, muted: true, positionSec: 10 });
        act(() => mounted.home().tvHandlers?.onSeekTo(60));
        expect(mounted.tv.element.currentTime).toBe(60);
    });

    // C8：收埋之後唔自動續播；唱臂喺泊位，唱片夾係 play
    it('should put the TV away on stop and leave the record stopped with the arm parked', () => {
        const mounted = mount();
        act(() => mounted.handlers()?.onSpindle());
        act(() => mounted.handlers()?.onMv());
        act(() => mounted.home().tvHandlers?.onStop());
        expect(mounted.home().tv?.phase).toBe('closing');
        expect(mounted.home().view?.mvOpen).toBe(true);
        act(() => vi.advanceTimersByTime(tvCloseMs));
        expect(mounted.home().tv).toBeNull();
        expect(mounted.home().view).toMatchObject({
            mvOpen: false,
            armPose: 'parked',
            spindle: 'paused',
        });
        expect(mounted.home().playback).toMatchObject({ status: 'paused', pauseReason: 'mv' });
        expect(mounted.playback.element.paused).toBe(true);
    });

    // T-070：收藏嘅歌嘅 MV 屬於首歌，喺 Favourites 碟一樣睇得
    it('should play the MV of a favourite on the Favourites disc', () => {
        const store = createFavouritesStore({ storage: memoryStorage(), now: () => 1 });
        store.add('apollo-18-01');
        const mounted = mount(store);
        act(() => mounted.handlers()?.onFavourites());
        act(() => mounted.handlers()?.onSpindle());
        expect(mounted.home().view?.hasMv).toBe(true);
        expect(videoPlaysDuring(mounted, () => mounted.handlers()?.onMv())).toBe(1);
        expect(mounted.tv.element.plays[0]?.src).toBe(MV_URL);
        expect(mounted.home().tv?.title).toBe('apollo-18 1');
    });
});
