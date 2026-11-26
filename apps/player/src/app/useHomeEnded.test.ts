import { act, renderHook } from '@testing-library/react';
import { makeAlbum, makeDocument } from '../catalog/testing/catalogFixtures';
import { MOTION } from '../config/motion';
import { createTestPlayback } from '../playback/testing/testPlayback';
import { useHome } from './useHome';

const RELEASE_MS = MOTION.input.endedReleaseMs;

/** 兩隻碟：apollo 兩首（播完 apollo-02 = 隊列完）；room 一首 */
const document = () =>
    makeDocument([
        makeAlbum('apollo', ['apollo/01.m4a', 'apollo/02.m4a']),
        makeAlbum('room', ['room/01.m4a']),
    ]);

/** 播 apollo 最後一首，播完 */
const endLastTrack = () => {
    const playback = createTestPlayback({ reduceMotion: true });
    const { result } = renderHook(() => useHome(document(), playback.controller));
    act(() => result.current.handlers?.onOpenList());
    act(() => result.current.handlers?.onPlayListTrack('apollo-02'));
    act(() => playback.element.finish());
    return { ...playback, result };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/* D99（Functional Spec「播完最後一首」；Implementation Plan T-038 E1–E5） */
describe('useHome end of the last track (D99)', () => {
    it('should stop, park the arm and show play, keeping the song for 3 seconds (E1)', () => {
        const { result, element } = endLastTrack();
        expect(result.current.playback.status).toBe('ended');
        expect(result.current.view).toMatchObject({
            armPose: 'parked',
            spindle: 'paused',
            spinning: false,
            trackColumn: null,
        });
        expect(element.paused).toBe(true);
        act(() => vi.advanceTimersByTime(RELEASE_MS - 1));
        expect(result.current.view?.track?.id).toBe('apollo-02');
    });

    it('should go back to no chosen track after 3 seconds (E2)', () => {
        const { result, element } = endLastTrack();
        act(() => vi.advanceTimersByTime(RELEASE_MS));
        expect(result.current.playback.status).toBe('idle');
        expect(result.current.view).toMatchObject({ track: null, spindle: 'idle' });
        expect(result.current.view?.trackColumn).toMatchObject({ albumId: 'apollo' });
        expect(element.src).toBe('');
    });

    it.each([0, RELEASE_MS])(
        'should play the first track from the clamp %i ms after the end (E3)',
        (wait) => {
            const { result, element } = endLastTrack();
            act(() => vi.advanceTimersByTime(wait));
            act(() => result.current.handlers?.onSpindle());
            expect(result.current.playback).toMatchObject({
                status: 'playing',
                trackId: 'apollo-01',
            });
            expect(element.src).toBe('https://media.example/apollo/01.m4a');
        },
    );

    it('should end the wait at once when the knob turns or the list opens (E4 ①)', () => {
        const turned = endLastTrack();
        act(() => turned.result.current.handlers?.onTurnStart());
        expect(turned.result.current.playback.status).toBe('idle');
        expect(turned.result.current.stage.scene).toBe('discChange');
        const listed = endLastTrack();
        act(() => listed.result.current.handlers?.onOpenList());
        expect(listed.result.current.playback.status).toBe('idle');
        expect(listed.result.current.stage).toMatchObject({
            scene: 'list',
            selectedTrackId: 'apollo-01',
        });
    });

    it('should end the wait at once on the booklet and MV buttons, which then have nothing to open', () => {
        const { result } = endLastTrack();
        act(() => result.current.handlers?.onBooklet());
        expect(result.current.playback.status).toBe('idle');
        expect(result.current.stage.overlay).toBeNull();
    });

    it('should wait for the booklet to close before counting (E4 ②)', () => {
        const playback = createTestPlayback({ reduceMotion: true });
        const { result } = renderHook(() => useHome(document(), playback.controller));
        act(() => result.current.handlers?.onOpenList());
        act(() => result.current.handlers?.onPlayListTrack('apollo-02'));
        act(() => result.current.handlers?.onBooklet());
        act(() => playback.element.finish());
        act(() => vi.advanceTimersByTime(RELEASE_MS * 2));
        expect(result.current.playback.status).toBe('ended');
        act(() => result.current.handlers?.onBooklet());
        act(() => vi.advanceTimersByTime(RELEASE_MS - 1));
        expect(result.current.playback.status).toBe('ended');
        act(() => vi.advanceTimersByTime(1));
        expect(result.current.playback.status).toBe('idle');
    });

    it('should keep 「已播完」 while holding another disc and release on the way back (E5, D88)', () => {
        const playback = createTestPlayback({ reduceMotion: true });
        const { result } = renderHook(() => useHome(document(), playback.controller));
        act(() => result.current.handlers?.onOpenList());
        act(() => result.current.handlers?.onPlayListTrack('apollo-02'));
        act(() => result.current.handlers?.onTurnStart());
        act(() => result.current.handlers?.onTurn(1));
        act(() => result.current.handlers?.onTurnEnd());
        act(() => playback.element.finish());
        act(() => vi.advanceTimersByTime(RELEASE_MS * 2));
        expect(result.current.view?.mini).toMatchObject({ ended: true, armPose: 'parked' });
        expect(result.current.view?.trackColumn).toMatchObject({ albumId: 'room' });
        act(() => result.current.handlers?.onReturnToLoaded());
        expect(result.current.playback.status).toBe('idle');
        expect(result.current.stage.viewAlbumId).toBe('apollo');
        expect(result.current.view).toMatchObject({ track: null, spindle: 'idle' });
    });

    it('should put the held disc on from the clamp while the loaded one has ended', () => {
        const playback = createTestPlayback({ reduceMotion: true });
        const { result } = renderHook(() => useHome(document(), playback.controller));
        act(() => result.current.handlers?.onSpindle());
        act(() => result.current.handlers?.onTurnStart());
        act(() => result.current.handlers?.onTurn(1));
        act(() => result.current.handlers?.onTurnEnd());
        act(() => playback.element.finish());
        act(() => playback.element.finish());
        expect(result.current.playback.status).toBe('ended');
        act(() => result.current.handlers?.onSpindle());
        expect(result.current.playback).toMatchObject({ status: 'playing', albumId: 'room' });
    });
});
