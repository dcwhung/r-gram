import { loadedAlbumOf } from './holding';
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
