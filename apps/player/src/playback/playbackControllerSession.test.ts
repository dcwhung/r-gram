import { createAudioEngine } from './audioEngine';
import { createMediaSession } from './mediaSession';
import { createPlaybackController, type PlaybackSource } from './playbackController';
import { asAudio, FakeAudioElement } from './testing/fakeAudioElement';
import { asMetadata, asSession, FakeMediaSession, FakeMetadata } from './testing/fakeMediaSession';

const ART: MediaImage[] = [{ src: 'https://img.example/room-thumb.webp', sizes: '320x320' }];
const url = (no: number) => `https://media.example/room/0${no}.m4a`;
const SOURCE: PlaybackSource = {
    albumId: 'room',
    albumTitle: 'ROOM',
    tracks: [1, 2, 3].map((no) => ({ id: `room-0${no}`, title: `Room ${no}`, url: url(no) })),
    artwork: ART,
};

const setup = ({ hidden = false } = {}) => {
    const element = new FakeAudioElement();
    const engine = createAudioEngine(asAudio(element), {
        isHidden: () => hidden,
        onVisible: () => {},
    });
    const session = new FakeMediaSession();
    const controller = createPlaybackController({
        engine,
        random: () => 0,
        reduceMotion: () => true,
        isHidden: () => hidden,
        storage: null,
        session: createMediaSession(asSession(session), asMetadata(FakeMetadata)),
    });
    const state = () => controller.getSnapshot().playback;
    return { element, session, controller, state };
};

/* T-011 報告 §2.6、③：狀態跟 element 事件；metadata 換歌嗰下同步設；鎖屏掣叫 controller */
describe('playbackController with Media Session', () => {
    it('should set the metadata when a track starts and the state from the element', () => {
        const { session, controller } = setup();
        controller.start(SOURCE, 'room-01');
        expect(session.metadata).toMatchObject({
            title: 'Room 1',
            artist: 'RubberBand',
            album: 'ROOM',
            artwork: ART,
        });
        expect(session.playbackState).toBe('playing');
        controller.pause();
        expect(session.playbackState).toBe('paused');
    });

    it('should update the metadata inside the ended handler on auto-next', () => {
        const { element, session, controller } = setup();
        controller.start(SOURCE, 'room-01');
        element.finish();
        expect(session.metadata?.title).toBe('Room 2');
        expect(session.playbackState).toBe('playing');
    });

    it('should report the position when the duration is known, on pause and on a seek', () => {
        const { element, session, controller } = setup();
        controller.start(SOURCE, 'room-01');
        expect(session.positions).toEqual([]);
        element.loadMetadata(180);
        expect(session.lastPosition).toEqual({ duration: 180, position: 0, playbackRate: 1 });
        element.advance(5);
        const reports = session.positions.length;
        element.advance(1);
        expect(session.positions).toHaveLength(reports);
        controller.pause();
        expect(session.lastPosition).toMatchObject({ position: 6 });
        session.trigger('seekto', { seekTime: 90 });
        expect(element.currentTime).toBe(90);
        expect(session.lastPosition).toMatchObject({ position: 90 });
    });

    it('should follow the lock-screen buttons', () => {
        const { element, session, controller, state } = setup();
        controller.start(SOURCE, 'room-02');
        session.trigger('pause');
        expect(state()).toMatchObject({ status: 'paused', pauseReason: 'user' });
        session.trigger('play');
        expect(state().status).toBe('playing');
        session.trigger('nexttrack');
        expect(state().trackId).toBe('room-03');
        expect(session.metadata?.title).toBe('Room 3');
        session.trigger('previoustrack');
        expect(state().trackId).toBe('room-02');
        expect(element.paused).toBe(false);
    });

    it('should play the first track without a lead-in on lock-screen play after the end', () => {
        const { element, session, controller, state } = setup({ hidden: true });
        controller.start(SOURCE, 'room-03');
        element.finish();
        expect(state().status).toBe('ended');
        expect(session.playbackState).toBe('paused');
        session.trigger('play');
        expect(state()).toMatchObject({ status: 'playing', trackId: 'room-01' });
        expect(element.plays.at(-1)).toEqual({ src: url(1), muted: false });
    });

    it('should clear the lock screen when the disc is put down', () => {
        const { session, controller } = setup();
        controller.start(SOURCE, 'room-01');
        controller.release();
        expect(session.metadata).toBeNull();
        expect(session.playbackState).toBe('none');
    });

    it('should show paused after a failed load', () => {
        const { element, session, controller } = setup();
        controller.start(SOURCE, 'room-01');
        element.fail('decode');
        expect(session.playbackState).toBe('paused');
    });
});
