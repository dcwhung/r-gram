import { IDLE_PLAYBACK, type PlaybackStatus } from '../app/playbackState';
import { blocksUpdate } from './playbackActivity';

const withStatus = (status: PlaybackStatus) => ({ ...IDLE_PLAYBACK, status });

describe('blocksUpdate (Technical Spec note 12, Functional Spec D14)', () => {
    it('should let the update through when stopped or paused', () => {
        expect(blocksUpdate(withStatus('idle'), false)).toBe(false);
        expect(blocksUpdate(withStatus('paused'), false)).toBe(false);
    });

    it('should hold the update while a song is playing', () => {
        expect(blocksUpdate(withStatus('playing'), false)).toBe(true);
    });

    it('should hold the update while the MV television is open', () => {
        expect(blocksUpdate(withStatus('paused'), true)).toBe(true);
    });
});
