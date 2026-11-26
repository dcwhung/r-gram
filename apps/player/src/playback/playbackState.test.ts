import { loadedAlbumOf } from '../app/holding';
import { IDLE_PLAYBACK, playbackReducer, type PlaybackState } from './playbackState';

const playing: PlaybackState = {
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId: 'room',
    trackId: 'room-01',
};

describe('playbackReducer (state only until T-038)', () => {
    it('should start a track from the beginning', () => {
        const state = playbackReducer(
            { ...playing, status: 'paused', pauseReason: 'user', positionSec: 30 },
            { type: 'start', albumId: 'apollo-18', trackId: 'apollo-18-03' },
        );
        expect(state).toEqual({
            ...IDLE_PLAYBACK,
            status: 'playing',
            albumId: 'apollo-18',
            trackId: 'apollo-18-03',
        });
    });

    it('should pause on the user’s request and resume from there', () => {
        const paused = playbackReducer(playing, { type: 'toggle' });
        expect(paused).toMatchObject({ status: 'paused', pauseReason: 'user' });
        expect(playbackReducer(paused, { type: 'toggle' })).toEqual(playing);
    });

    it('should record why playback was paused for the MV', () => {
        expect(playbackReducer(playing, { type: 'pauseFor', reason: 'mv' })).toMatchObject({
            status: 'paused',
            pauseReason: 'mv',
        });
    });

    // B-086 ⑥：播完（status ended，觸發係 T-038）：載入嘅碟仍然喺唱片機；暫停、MV 唔改佢
    it('should keep an ended song loaded and ignore pauses', () => {
        const ended: PlaybackState = { ...playing, status: 'ended' };
        expect(loadedAlbumOf(ended)).toBe('room');
        expect(playbackReducer(ended, { type: 'pauseFor', reason: 'mv' })).toBe(ended);
        expect(playbackReducer(ended, { type: 'toggle' })).toBe(ended);
    });

    it('should return the same state when nothing is loaded', () => {
        expect(playbackReducer(IDLE_PLAYBACK, { type: 'toggle' })).toBe(IDLE_PLAYBACK);
        expect(playbackReducer(IDLE_PLAYBACK, { type: 'pauseFor', reason: 'mv' })).toBe(
            IDLE_PLAYBACK,
        );
    });
});

/* T-038（T-011 報告 §2.5）：由引擎事件推動嘅 action */
describe('playbackReducer engine actions', () => {
    it('should move to the next track without a lead-in and reset the time', () => {
        const state = playbackReducer(
            { ...playing, positionSec: 200, durationSec: 210 },
            { type: 'advanced', trackId: 'room-02' },
        );
        expect(state).toEqual({ ...playing, trackId: 'room-02' });
    });

    it('should play again after a lock-screen next while paused', () => {
        const paused: PlaybackState = { ...playing, status: 'paused', pauseReason: 'user' };
        expect(playbackReducer(paused, { type: 'advanced', trackId: 'room-02' })).toMatchObject({
            status: 'playing',
            pauseReason: null,
        });
    });

    it('should keep the disc loaded when the queue ends (D99, D88)', () => {
        const ended = playbackReducer(playing, { type: 'ended' });
        expect(ended).toMatchObject({ status: 'ended', albumId: 'room', trackId: 'room-01' });
        expect(playbackReducer(ended, { type: 'resumed' })).toBe(ended);
    });

    it('should put the disc down on release', () => {
        expect(playbackReducer(playing, { type: 'release' })).toBe(IDLE_PLAYBACK);
    });

    it('should resume after a pause, including one the system made', () => {
        const paused = playbackReducer(playing, { type: 'pauseFor', reason: 'user' });
        expect(playbackReducer(paused, { type: 'resumed' })).toEqual(playing);
        expect(playbackReducer(IDLE_PLAYBACK, { type: 'resumed' })).toBe(IDLE_PLAYBACK);
    });

    it('should update the time only when the second or the duration changes', () => {
        const first = playbackReducer(playing, { type: 'time', positionSec: 1.2, durationSec: 90 });
        expect(first).toMatchObject({ positionSec: 1.2, durationSec: 90 });
        expect(playbackReducer(first, { type: 'time', positionSec: 1.7, durationSec: 90 })).toBe(
            first,
        );
        expect(
            playbackReducer(first, { type: 'time', positionSec: 2.1, durationSec: 90 }),
        ).toMatchObject({ positionSec: 2.1 });
        expect(
            playbackReducer(IDLE_PLAYBACK, { type: 'time', positionSec: 3, durationSec: 9 }),
        ).toBe(IDLE_PLAYBACK);
    });

    // US-004、D36 ③：載入失敗 = 泊位、一行提示；被拒（blocked）= 當重開 app 回復（下一下行完整開場）
    it('should record a failed load, and a blocked play as a restore pause', () => {
        expect(playbackReducer(playing, { type: 'failed', reason: 'network' })).toMatchObject({
            status: 'error',
            pauseReason: null,
        });
        expect(playbackReducer(playing, { type: 'failed', reason: 'blocked' })).toMatchObject({
            status: 'paused',
            pauseReason: 'restore',
        });
        expect(playbackReducer(IDLE_PLAYBACK, { type: 'failed', reason: 'decode' })).toBe(
            IDLE_PLAYBACK,
        );
    });

    it('should not pause a failed track', () => {
        const failed: PlaybackState = { ...playing, status: 'error' };
        expect(playbackReducer(failed, { type: 'pauseFor', reason: 'mv' })).toBe(failed);
    });
});
