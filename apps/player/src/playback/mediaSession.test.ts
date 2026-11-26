import { createMediaSession, RECORD_ARTIST } from './mediaSession';
import { asMetadata, asSession, FakeMediaSession, FakeMetadata } from './testing/fakeMediaSession';

const ART: MediaImage[] = [{ src: 'https://img.example/t.webp', sizes: '320x320' }];

const setup = () => {
    const fake = new FakeMediaSession();
    const port = createMediaSession(asSession(fake), asMetadata(FakeMetadata));
    const handlers = {
        play: vi.fn(),
        pause: vi.fn(),
        previous: vi.fn(),
        next: vi.fn(),
        seekTo: vi.fn(),
    };
    return { fake, port, handlers };
};

describe('mediaSession (T-011 §2.6)', () => {
    it('should be null without a Media Session', () => {
        expect(createMediaSession(undefined, asMetadata(FakeMetadata))).toBeNull();
    });

    it('should register play, pause, previous, next and seek, and clear the skip buttons', () => {
        const { fake, port, handlers } = setup();
        port?.bind(handlers);
        fake.trigger('play');
        fake.trigger('pause');
        fake.trigger('previoustrack');
        fake.trigger('nexttrack');
        fake.trigger('seekto', { seekTime: 42 });
        fake.trigger('seekto', {});
        expect(handlers.play).toHaveBeenCalledTimes(1);
        expect(handlers.pause).toHaveBeenCalledTimes(1);
        expect(handlers.previous).toHaveBeenCalledTimes(1);
        expect(handlers.next).toHaveBeenCalledTimes(1);
        expect(handlers.seekTo).toHaveBeenCalledExactlyOnceWith(42);
        expect(fake.handlers.get('seekbackward')).toBeNull();
        expect(fake.handlers.get('seekforward')).toBeNull();
        expect(fake.handlers.get('stop')).toBeNull();
    });

    it('should skip actions an old browser does not know', () => {
        const { fake, port, handlers } = setup();
        fake.unsupported.add('seekto');
        fake.unsupported.add('stop');
        expect(() => port?.bind(handlers)).not.toThrow();
        expect(fake.handlers.has('nexttrack')).toBe(true);
    });

    it('should show the title, RubberBand, the album and the artwork', () => {
        const { fake, port } = setup();
        port?.setNowPlaying({ title: 'Apollo', album: 'APOLLO 18', artwork: ART });
        expect(fake.metadata).toMatchObject({
            title: 'Apollo',
            artist: RECORD_ARTIST,
            album: 'APOLLO 18',
            artwork: ART,
        });
        port?.setNowPlaying(null);
        expect(fake.metadata).toBeNull();
    });

    it('should set the playback state', () => {
        const { fake, port } = setup();
        port?.setState('playing');
        expect(fake.playbackState).toBe('playing');
    });

    it('should report a clamped position only when the duration is known', () => {
        const { fake, port } = setup();
        port?.setPosition(10, null);
        expect(fake.positions).toEqual([]);
        port?.setPosition(250, 200);
        expect(fake.lastPosition).toEqual({ duration: 200, position: 200, playbackRate: 1 });
        port?.setPosition(-1, 200);
        expect(fake.lastPosition).toMatchObject({ position: 0 });
    });

    it('should not report a position without setPositionState (old Safari)', () => {
        const fake = new FakeMediaSession();
        Object.defineProperty(fake, 'setPositionState', { value: undefined });
        const port = createMediaSession(asSession(fake), asMetadata(FakeMetadata));
        expect(() => port?.setPosition(1, 10)).not.toThrow();
    });
});
