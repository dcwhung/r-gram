import { MOTION } from '../config/motion';
import { createMediaSession } from '../playback/mediaSession';
import { createSessionTargets } from '../playback/sessionTargets';
import {
    asMetadata,
    asSession,
    FakeMediaSession,
    FakeMetadata,
} from '../playback/testing/fakeMediaSession';
import { createMvAudio } from './mvAudio';
import { createMvController, type MvTrack } from './mvController';
import { asContextClass, FakeAudioContext } from './testing/fakeAudioContext';
import { asVideo, FakeVideoElement } from './testing/fakeVideo';
import { createVideoEngine } from './videoEngine';

const ART: MediaImage[] = [{ src: 'https://img.example/room.webp', sizes: '320x320' }];
const TRACK: MvTrack = {
    id: 'room-01',
    title: 'Room 1',
    url: 'https://media.example/room/01%20Room%201.mp4',
    nowPlaying: { title: 'Room 1（MV）', album: 'ROOM', artwork: ART },
};
const { crtOnDelayMs, crtOnMs, tvCloseMs } = MOTION.scene;
const REVEAL_MS = crtOnDelayMs + crtOnMs;

const setup = ({ reduceMotion = false } = {}) => {
    FakeAudioContext.reset();
    const element = new FakeVideoElement();
    const engine = createVideoEngine(
        asVideo(element),
        createMvAudio({ AudioContext: asContextClass(FakeAudioContext) }),
    );
    const session = new FakeMediaSession();
    const targets = createSessionTargets(
        createMediaSession(asSession(session), asMetadata(FakeMetadata)),
    );
    targets.record?.setNowPlaying({ title: 'Room 1', album: 'ROOM', artwork: ART });
    targets.record?.setState('paused');
    const mv = createMvController({ engine, sessions: targets, reduceMotion: () => reduceMotion });
    const snapshot = () => mv.getSnapshot();
    return { element, mv, session, snapshot };
};

/* T-060：電視（Functional Spec US-007、C8；Technical Spec「CR-010 → MV 音訊」「MV 電視過場」） */
describe('mvController', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should start with the TV put away', () => {
        const { snapshot } = setup();
        expect(snapshot()).toMatchObject({ phase: 'closed', track: null });
    });

    it('should ready the MV in the tap and show the TV', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        expect(element.plays).toEqual([{ src: TRACK.url, muted: false }]);
        expect(snapshot()).toMatchObject({ phase: 'open', status: 'loading', track: TRACK });
    });

    it('should start the MV when the screen has switched on (after the rise)', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS - 1);
        expect(element.paused).toBe(true);
        vi.advanceTimersByTime(1);
        expect(element.paused).toBe(false);
        expect(snapshot().status).toBe('playing');
    });

    it('should start the MV at once with reduced motion', () => {
        const { element, mv, snapshot } = setup({ reduceMotion: true });
        mv.open(TRACK);
        expect(element.paused).toBe(false);
        expect(snapshot().status).toBe('playing');
    });

    it('should not open a second time while the TV is out', () => {
        const { element, mv } = setup();
        mv.open(TRACK);
        mv.open({ ...TRACK, id: 'room-02', url: 'https://media.example/room/02.mp4' });
        expect(element.plays).toHaveLength(1);
    });

    it('should pause and play from the TV buttons', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS);
        mv.pause();
        expect(element.paused).toBe(true);
        expect(snapshot().status).toBe('paused');
        mv.play();
        expect(element.paused).toBe(false);
        expect(snapshot().status).toBe('playing');
    });

    it('should stay paused at the switch-on when paused during the rise', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        mv.pause();
        vi.advanceTimersByTime(REVEAL_MS);
        expect(element.paused).toBe(true);
        expect(snapshot().status).toBe('paused');
    });

    it('should go quiet at once on stop, then put the TV away after the switch-off and drop', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS);
        mv.stop();
        expect(element.paused).toBe(true);
        expect(snapshot().phase).toBe('closing');
        vi.advanceTimersByTime(tvCloseMs - 1);
        expect(snapshot().phase).toBe('closing');
        vi.advanceTimersByTime(1);
        expect(snapshot()).toMatchObject({ phase: 'closed', track: null });
        expect(element.src).toBe('');
    });

    it('should put the TV away at once with reduced motion', () => {
        const { mv, snapshot } = setup({ reduceMotion: true });
        mv.open(TRACK);
        mv.stop();
        expect(snapshot().phase).toBe('closed');
    });

    it('should lock the TV buttons while it switches off', () => {
        const { element, mv } = setup();
        mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS);
        mv.stop();
        mv.play();
        expect(element.paused).toBe(true);
    });

    it('should not start the MV when stopped during the rise', () => {
        const { element, mv } = setup();
        mv.open(TRACK);
        mv.stop();
        vi.advanceTimersByTime(REVEAL_MS);
        expect(element.paused).toBe(true);
    });

    // C8：MV 播完 = 熄機 → 收埋，同㩒 ■ 一樣
    it('should switch off and put the TV away when the MV ends', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS);
        element.finish();
        expect(snapshot().phase).toBe('closing');
        vi.advanceTimersByTime(tvCloseMs);
        expect(snapshot().phase).toBe('closed');
    });

    it('should follow the time and length of the MV', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS);
        element.loadMetadata(240);
        element.advance(12.5);
        expect(snapshot()).toMatchObject({ positionSec: 12.5, durationSec: 240 });
    });

    it('should show a load failure and try again from the start on play', () => {
        const { element, mv, snapshot } = setup();
        mv.open(TRACK);
        element.fail('unsupported');
        expect(snapshot()).toMatchObject({ phase: 'open', status: 'error', failed: true });
        mv.play();
        expect(element.plays.length).toBeGreaterThan(1);
        expect(element.plays.at(-1)?.src).toBe(TRACK.url);
        expect(element.paused).toBe(false);
        expect(snapshot()).toMatchObject({ status: 'playing', failed: false });
    });

    // 自動播被拒（例如冇 Web Audio 嘅舊瀏覽器喺開機時 play()）：停喺度等聽眾㩒 ▶，唔當載入失敗
    it('should wait for play when the browser refuses to start the MV', async () => {
        FakeAudioContext.reset();
        const element = new FakeVideoElement();
        const mv = createMvController({
            engine: createVideoEngine(asVideo(element), createMvAudio({})),
            sessions: null,
            reduceMotion: () => true,
        });
        element.playMode = 'blocked';
        mv.open(TRACK);
        await vi.advanceTimersByTimeAsync(0);
        expect(mv.getSnapshot()).toMatchObject({ status: 'paused', failed: false });
        element.playMode = 'auto';
        mv.play();
        expect(mv.getSnapshot().status).toBe('playing');
    });

    // W-068：有 Web Audio 都一樣：手勢入面嘅 play() 被拒 → ▶ 或者鎖屏 play 照播得
    it('should play on play after the tap-time play was refused with Web Audio', async () => {
        const { element, mv, session } = setup();
        element.playMode = 'blocked';
        mv.open(TRACK);
        await vi.advanceTimersByTimeAsync(REVEAL_MS);
        expect(mv.getSnapshot()).toMatchObject({ status: 'paused', failed: false });
        element.playMode = 'auto';
        session.trigger('play');
        expect(element.paused).toBe(false);
        expect(mv.getSnapshot().status).toBe('playing');
        expect(FakeAudioContext.lastGain()?.value).toBe(1);
    });

    it('should hand the lock screen to the MV and back to the record', () => {
        const { session, mv } = setup();
        mv.open(TRACK);
        expect(session.metadata?.title).toBe('Room 1（MV）');
        vi.advanceTimersByTime(REVEAL_MS);
        expect(session.playbackState).toBe('playing');
        session.trigger('pause');
        expect(mv.getSnapshot().status).toBe('paused');
        session.trigger('play');
        expect(mv.getSnapshot().status).toBe('playing');
        mv.stop();
        vi.advanceTimersByTime(tvCloseMs);
        expect(session.metadata?.title).toBe('Room 1');
        expect(session.playbackState).toBe('paused');
    });

    it('should tell its listeners when something changes', () => {
        const { mv } = setup();
        const listener = vi.fn();
        const unsubscribe = mv.subscribe(listener);
        mv.open(TRACK);
        expect(listener).toHaveBeenCalled();
        unsubscribe();
        listener.mockClear();
        mv.pause();
        expect(listener).not.toHaveBeenCalled();
    });
});

/* T-061：電視旋鈕（Functional Spec US-007、C9、D104）：音量（gain）、靜音（gain 0，記住音量）、快轉／倒轉 */
describe('mvController knobs', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const playing = () => {
        const tv = setup();
        tv.mv.open(TRACK);
        vi.advanceTimersByTime(REVEAL_MS);
        tv.element.loadMetadata(200);
        tv.element.advance(30);
        return tv;
    };
    const gain = () => FakeAudioContext.lastGain()?.value;

    it('should say whether the volume knob works (Web Audio)', () => {
        expect(setup().snapshot().volumeSupported).toBe(true);
        const element = new FakeVideoElement();
        const engine = createVideoEngine(asVideo(element), createMvAudio({}));
        expect(createMvController({ engine }).getSnapshot().volumeSupported).toBe(false);
    });

    it('should turn the volume through the gain', () => {
        const { mv, snapshot } = playing();
        mv.setVolume(0.4);
        expect(snapshot().volume).toBe(0.4);
        expect(gain()).toBe(0.4);
    });

    it('should mute to gain 0 and come back to the same volume', () => {
        const { mv, snapshot, element } = playing();
        mv.setVolume(0.4);
        mv.toggleMute();
        expect(snapshot().muted).toBe(true);
        expect(gain()).toBe(0);
        mv.toggleMute();
        expect(snapshot().muted).toBe(false);
        expect(gain()).toBe(0.4);
        expect(element.muted).toBe(false);
        expect(element.volumeWrites).toEqual([]);
    });

    it('should un-mute when the volume is turned', () => {
        const { mv, snapshot } = playing();
        mv.toggleMute();
        mv.setVolume(0.6);
        expect(snapshot()).toMatchObject({ muted: false, volume: 0.6 });
        expect(gain()).toBe(0.6);
    });

    it('should keep the volume and mute for the next MV', () => {
        const { mv, snapshot } = playing();
        mv.setVolume(0.3);
        mv.toggleMute();
        mv.stop();
        vi.advanceTimersByTime(tvCloseMs);
        mv.open(TRACK);
        expect(snapshot()).toMatchObject({ volume: 0.3, muted: true });
        vi.advanceTimersByTime(REVEAL_MS);
        expect(gain()).toBe(0);
    });

    it('should ignore the volume knob without Web Audio', () => {
        const element = new FakeVideoElement();
        const engine = createVideoEngine(asVideo(element), createMvAudio({}));
        const mv = createMvController({ engine, reduceMotion: () => true });
        mv.open(TRACK);
        mv.setVolume(0.2);
        mv.toggleMute();
        expect(mv.getSnapshot()).toMatchObject({ volume: 1, muted: false });
    });

    it('should jump forward and back and keep inside the MV', () => {
        const { mv, snapshot, element } = playing();
        mv.seekBy(10);
        expect(element.currentTime).toBe(40);
        expect(snapshot().positionSec).toBe(40);
        mv.seekBy(-60);
        expect(element.currentTime).toBe(0);
        mv.seekTo(195);
        expect(element.currentTime).toBe(195);
        mv.seekBy(30);
        expect(element.currentTime).toBe(200);
    });

    it('should not jump before the MV is showing or while switching off', () => {
        const { element, mv } = setup();
        mv.open(TRACK);
        element.loadMetadata(200);
        mv.seekBy(10);
        expect(element.seeks.filter((at) => at > 0)).toEqual([]);
        vi.advanceTimersByTime(REVEAL_MS);
        mv.stop();
        mv.seekBy(10);
        mv.setVolume(0.1);
        expect(element.seeks.filter((at) => at > 0)).toEqual([]);
        expect(mv.getSnapshot().volume).toBe(1);
    });

    it('should seek from the lock screen', () => {
        const { session, element } = playing();
        session.trigger('seekto', { seekTime: 90 });
        expect(element.currentTime).toBe(90);
    });
});
