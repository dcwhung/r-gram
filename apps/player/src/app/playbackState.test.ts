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

    // S-180：㩒拎住嘅碟嘅一行：只喺載入嘅碟仍然係㩒嗰陣嗰隻先開始（同一個 tick 連㩒兩行，第二下過時）
    it('should start a held track only while the loaded disc is still the one pressed against', () => {
        const action = {
            type: 'startHeld',
            albumId: 'apollo-18',
            trackId: 'apollo-18-03',
            loadedAlbumId: 'room',
        } as const;
        const started = playbackReducer(playing, action);
        expect(started).toMatchObject({ albumId: 'apollo-18', trackId: 'apollo-18-03' });
        const again = { ...action, trackId: 'apollo-18-01' };
        expect(playbackReducer(started, again)).toBe(started);
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

    it('should return the same state when nothing is loaded', () => {
        expect(playbackReducer(IDLE_PLAYBACK, { type: 'toggle' })).toBe(IDLE_PLAYBACK);
        expect(playbackReducer(IDLE_PLAYBACK, { type: 'pauseFor', reason: 'mv' })).toBe(
            IDLE_PLAYBACK,
        );
    });
});
