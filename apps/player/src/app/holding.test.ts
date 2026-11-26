import { isHolding, loadedAlbumOf } from './holding';
import { IDLE_PLAYBACK, type PlaybackState } from './playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const stage = (overrides: Partial<StageState> = {}): StageState => ({
    ...INITIAL_STAGE,
    scene: 'home',
    viewAlbumId: 'room',
    ...overrides,
});
const playing: PlaybackState = {
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId: 'apollo-18',
    trackId: 'apollo-18-01',
};

/* Technical Spec「補充：第 18 版」：載入嘅碟 = 播放狀態嘅 albumId；holding 係衍生值，唔另外存 */
describe('loadedAlbumOf', () => {
    it('should be the album of the loaded song, playing or paused', () => {
        expect(loadedAlbumOf(playing)).toBe('apollo-18');
        expect(loadedAlbumOf({ ...playing, status: 'paused', pauseReason: 'user' })).toBe(
            'apollo-18',
        );
    });

    it('should be null when nothing is loaded', () => {
        expect(loadedAlbumOf(IDLE_PLAYBACK)).toBeNull();
        expect(loadedAlbumOf({ ...IDLE_PLAYBACK, albumId: 'apollo-18' })).toBeNull();
    });
});

describe('isHolding', () => {
    it.each([
        ['released on another disc', stage(), 'apollo-18', true],
        ['the dial points at another disc', stage({ scene: 'discChange' }), 'apollo-18', true],
        ['the loaded disc is on screen', stage({ viewAlbumId: 'apollo-18' }), 'apollo-18', false],
        ['no song is loaded', stage(), null, false],
        ['the list is open', stage({ scene: 'list' }), 'apollo-18', false],
        ['still on Preload', stage({ scene: 'preload' }), 'apollo-18', false],
    ])('should tell whether another disc is held when %s', (_case, state, loaded, expected) => {
        expect(isHolding(state, loaded)).toBe(expected);
    });
});
