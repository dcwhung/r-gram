import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { t } from '../i18n/t';
import { createTestPlayback } from '../playback/testing/testPlayback';
import { useHome } from './useHome';

const APOLLO = (no: string) => `https://media.example/apollo-18/${no}.m4a`;

const mount = (document: CatalogDocument = sampleDocument(), reduceMotion = true) => {
    const playback = createTestPlayback({ reduceMotion });
    const { result } = renderHook(() => useHome(document, playback.controller));
    return { ...playback, result };
};

type Mounted = ReturnType<typeof mount>;

/** 叫 handler，記低佢返嚟嗰刻 element 已經 play() 咗幾多次（= 同一個 call stack） */
const playsDuring = ({ element }: Mounted, call: () => void) => {
    let count = -1;
    act(() => {
        call();
        count = element.plays.length;
    });
    return count;
};

/* T-011 報告 §2.5「手勢路徑」：所有開始播嘅路由手勢 handler 同步行到引擎，中間冇 timer、await、effect */
describe('useHome gesture paths reach the engine synchronously', () => {
    it('should cue the first playable track from the clamp when nothing is chosen (D85)', () => {
        const home = mount(sampleDocument(), false);
        expect(playsDuring(home, () => home.result.current.handlers?.onSpindle())).toBe(1);
        expect(home.element.plays[0]).toEqual({ src: APOLLO('01'), muted: true });
        expect(home.result.current.playback).toMatchObject({
            status: 'playing',
            trackId: 'apollo-18-01',
        });
    });

    it('should cue the framed track on Enter in the arc list', () => {
        const home = mount(sampleDocument(), false);
        act(() => home.result.current.handlers?.onOpenList());
        const call = () => home.result.current.handlers?.onPlayListTrack('apollo-18-03');
        expect(playsDuring(home, call)).toBe(1);
        expect(home.element.plays[0]?.src).toBe(APOLLO('03'));
    });

    it('should cue the framed track from the clamp in the arc list', () => {
        const home = mount(sampleDocument(), false);
        act(() => home.result.current.handlers?.onOpenList());
        act(() => home.result.current.handlers?.onFocusListTrack('apollo-18-03'));
        expect(playsDuring(home, () => home.result.current.handlers?.onSpindle())).toBe(1);
        expect(home.element.plays[0]?.src).toBe(APOLLO('03'));
    });

    it('should put the held disc on and cue its first track from the clamp', () => {
        const home = mount(sampleDocument(), false);
        act(() => home.result.current.handlers?.onSpindle());
        act(() => home.result.current.handlers?.onTurnStart());
        act(() => home.result.current.handlers?.onTurn(1));
        act(() => home.result.current.handlers?.onTurnEnd());
        expect(home.result.current.view?.holding).toBe(true);
        const before = home.element.plays.length;
        expect(playsDuring(home, () => home.result.current.handlers?.onSpindle())).toBe(before + 1);
        expect(home.element.plays.at(-1)?.src).toBe('https://media.example/room/01.m4a');
        expect(home.result.current.playback).toMatchObject({ albumId: 'room' });
        expect(home.result.current.view?.holding).toBe(false);
    });
});

describe('useHome real playback', () => {
    it('should pause and resume with the clamp', () => {
        const home = mount();
        act(() => home.result.current.handlers?.onSpindle());
        expect(home.element.paused).toBe(false);
        act(() => home.result.current.handlers?.onSpindle());
        expect(home.result.current.playback).toMatchObject({
            status: 'paused',
            pauseReason: 'user',
        });
        expect(home.result.current.view?.armPose).toBe('lifted');
        expect(home.element.paused).toBe(true);
        act(() => home.result.current.handlers?.onSpindle());
        expect(home.element.paused).toBe(false);
    });

    it('should drive the progress ring and the time from the audio', () => {
        const home = mount();
        act(() => home.result.current.handlers?.onSpindle());
        act(() => {
            home.element.loadMetadata(100);
            home.element.advance(25);
        });
        expect(home.result.current.view).toMatchObject({ progress: 0.25, timeText: '0:25' });
    });

    it('should show the next track after auto-next', () => {
        const home = mount();
        act(() => home.result.current.handlers?.onSpindle());
        act(() => home.element.finish());
        // apollo-18 第 2 首冇音檔：跳過
        expect(home.result.current.view?.track?.id).toBe('apollo-18-03');
    });

    it('should park with a one-line notice when the track fails to load (US-004)', () => {
        const home = mount();
        act(() => home.result.current.handlers?.onSpindle());
        act(() => home.element.fail('unsupported'));
        expect(home.result.current.view).toMatchObject({
            armPose: 'parked',
            spindle: 'paused',
            failed: true,
            timeText: t('track.failed'),
        });
        act(() => home.result.current.handlers?.onSpindle());
        expect(home.result.current.playback.status).toBe('playing');
        expect(home.result.current.view?.failed).toBe(false);
    });

    // S-242：拎住另一隻碟時載入嘅歌載入失敗，細唱片機講「未能播放」，唔係「已暫停」
    it('should tell the mini turntable that the loaded track failed', () => {
        const home = mount();
        act(() => home.result.current.handlers?.onSpindle());
        act(() => home.result.current.handlers?.onTurnStart());
        act(() => home.result.current.handlers?.onTurn(1));
        act(() => home.result.current.handlers?.onTurnEnd());
        act(() => home.element.fail('unsupported'));
        expect(home.result.current.view?.mini).toMatchObject({
            shown: true,
            failed: true,
            ended: false,
            armPose: 'parked',
        });
    });

    it('should pause for the MV with the arm parked', () => {
        const document = sampleDocument();
        const first = document.albums[0]?.tracks[0];
        if (first) first.mv = 'apollo-18/01.mp4';
        const home = mount(document);
        act(() => home.result.current.handlers?.onSpindle());
        act(() => home.result.current.handlers?.onMv());
        expect(home.result.current.playback).toMatchObject({ status: 'paused', pauseReason: 'mv' });
        expect(home.element.paused).toBe(true);
    });

    it('should cycle the play mode from the mode button', () => {
        const home = mount();
        expect(home.result.current.view?.mode).toBe('order');
        act(() => home.result.current.handlers?.onMode());
        expect(home.result.current.view?.mode).toBe('all');
    });

    // 碟只喺真係出緊聲先轉：等數據、卡住時停（唱臂照落針）
    it('should spin the disc only while the record is audible', () => {
        const home = mount();
        home.element.playMode = 'hold';
        act(() => home.result.current.handlers?.onSpindle());
        expect(home.result.current.view).toMatchObject({ armPose: 'playing', spinning: false });
        act(() => home.element.resolvePlay());
        expect(home.result.current.view?.spinning).toBe(true);
        act(() => home.result.current.handlers?.onSpindle());
        expect(home.result.current.view?.spinning).toBe(false);
    });
});
