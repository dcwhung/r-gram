import { leadInMs } from '../components/tonearm/armPose';
import { PREVIOUS_RESTART_S } from '../config/limits';
import { PLAY_MODE_STORAGE_KEY } from '../config/storageKeys';
import { createAudioEngine } from './audioEngine';
import { createPlaybackController, type PlaybackSource } from './playbackController';
import { asAudio, FakeAudioElement } from './testing/fakeAudioElement';

const LEAD_IN_MS = leadInMs(false);
const url = (no: number) => `https://media.example/room/0${no}.m4a`;

const SOURCE: PlaybackSource = {
    albumId: 'room',
    albumTitle: 'ROOM',
    tracks: [1, 2, 3].map((no) => ({ id: `room-0${no}`, title: `Room ${no}`, url: url(no) })),
    artwork: [],
};

interface SetupOptions {
    reduceMotion?: boolean;
    hidden?: boolean;
    stored?: string;
}

const setup = ({ reduceMotion = false, hidden = false, stored }: SetupOptions = {}) => {
    const element = new FakeAudioElement();
    const engine = createAudioEngine(asAudio(element), {
        isHidden: () => hidden,
        onVisible: () => {},
    });
    const items = new Map<string, string>(stored ? [[PLAY_MODE_STORAGE_KEY, stored]] : []);
    const storage = {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
    };
    const controller = createPlaybackController({
        engine,
        random: () => 0,
        reduceMotion: () => reduceMotion,
        isHidden: () => hidden,
        storage,
    });
    const state = () => controller.getSnapshot().playback;
    return { element, controller, state, items };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('playbackController start (lead-in, T-011 §2.4)', () => {
    it('should cue the track muted inside the call and make sound only when the needle lands', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'room-02');
        // 同一個 call stack 入面已經 play()（手勢解鎖）
        expect(element.plays).toEqual([{ src: url(2), muted: true }]);
        expect(state()).toMatchObject({ status: 'playing', albumId: 'room', trackId: 'room-02' });
        vi.advanceTimersByTime(LEAD_IN_MS - 1);
        expect(element.paused).toBe(true);
        vi.advanceTimersByTime(1);
        expect(element.paused).toBe(false);
        expect(element.muted).toBe(false);
    });

    it('should land at once with reduced motion', () => {
        const { element, controller } = setup({ reduceMotion: true });
        controller.start(SOURCE, 'room-01');
        expect(element.paused).toBe(false);
        expect(element.muted).toBe(false);
    });

    it('should play at once without a lead-in while the page is hidden', () => {
        const { element, controller } = setup({ hidden: true });
        controller.start(SOURCE, 'room-01');
        expect(element.plays).toEqual([{ src: url(1), muted: false }]);
    });

    it('should ignore a track that is not in the source', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'gone');
        expect(element.plays).toEqual([]);
        expect(state().status).toBe('idle');
    });

    it('should not make sound at the landing time when paused during the lead-in', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'room-01');
        controller.pause();
        vi.advanceTimersByTime(LEAD_IN_MS);
        expect(element.paused).toBe(true);
        expect(state()).toMatchObject({ status: 'paused', pauseReason: 'user' });
        controller.resume();
        expect(element.paused).toBe(false);
    });
});

describe('playbackController pause and resume (FR-040)', () => {
    const playing = (options?: SetupOptions) => {
        const context = setup(options);
        context.controller.start(SOURCE, 'room-01');
        vi.advanceTimersByTime(LEAD_IN_MS);
        return context;
    };

    it('should pause and resume at once (needle lifts, no lead-in)', () => {
        const { element, controller, state } = playing();
        controller.toggle();
        expect(state()).toMatchObject({ status: 'paused', pauseReason: 'user' });
        expect(element.paused).toBe(true);
        controller.toggle();
        expect(state()).toMatchObject({ status: 'playing', pauseReason: null });
        expect(element.paused).toBe(false);
    });

    it('should follow a pause and a resume the system made (T-011 ③)', () => {
        const { element, state } = playing();
        element.systemPause();
        expect(state()).toMatchObject({ status: 'paused', pauseReason: 'user' });
        element.systemResume();
        expect(state()).toMatchObject({ status: 'playing', pauseReason: null });
    });

    it('should park for the MV and wait for the lead-in when played again (C8)', () => {
        const { element, controller, state } = playing();
        controller.pauseFor('mv');
        expect(state()).toMatchObject({ status: 'paused', pauseReason: 'mv' });
        expect(element.paused).toBe(true);
        controller.resume();
        expect(state().status).toBe('playing');
        expect(element.paused).toBe(true);
        vi.advanceTimersByTime(LEAD_IN_MS);
        expect(element.paused).toBe(false);
    });

    it('should show the real time', () => {
        const { element, state } = playing();
        element.loadMetadata(120);
        element.advance(3);
        expect(state()).toMatchObject({ positionSec: 3, durationSec: 120 });
    });

    it('should seek the engine', () => {
        const { element, controller } = playing();
        element.loadMetadata(120);
        controller.seek(42);
        expect(element.currentTime).toBe(42);
    });

    it('should keep the same snapshot until something changes and stop notifying after unsubscribe', () => {
        const { controller } = playing();
        const listener = vi.fn();
        const unsubscribe = controller.subscribe(listener);
        const before = controller.getSnapshot();
        controller.resume();
        expect(controller.getSnapshot()).toBe(before);
        controller.pause();
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
        controller.resume();
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('playbackController queue and end of the disc', () => {
    const playingLast = (stored?: string) => {
        const context = setup({ stored });
        context.controller.start(SOURCE, 'room-03');
        vi.advanceTimersByTime(LEAD_IN_MS);
        return context;
    };

    it('should advance synchronously when a track ends', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'room-01');
        vi.advanceTimersByTime(LEAD_IN_MS);
        element.finish();
        expect(state()).toMatchObject({ status: 'playing', trackId: 'room-02' });
        expect(element.src).toBe(url(2));
        expect(element.paused).toBe(false);
    });

    it('should stop after the last track in order mode and start from the first on play (D99)', () => {
        const { element, controller, state } = playingLast();
        element.finish();
        expect(state()).toMatchObject({ status: 'ended', trackId: 'room-03' });
        controller.toggle();
        expect(state()).toMatchObject({ status: 'playing', trackId: 'room-01' });
        expect(element.plays.at(-1)).toEqual({ src: url(1), muted: true });
    });

    it('should wrap in repeat all and replay in repeat one', () => {
        const all = playingLast(JSON.stringify({ shuffle: false, repeat: 'all' }));
        all.element.finish();
        expect(all.state().trackId).toBe('room-01');
        const one = playingLast(JSON.stringify({ shuffle: false, repeat: 'one' }));
        one.element.finish();
        expect(one.state()).toMatchObject({ status: 'playing', trackId: 'room-03' });
    });

    it('should cycle the mode, store it and use it for the next track', () => {
        const { element, controller, state, items } = playingLast();
        expect(controller.getSnapshot().mode).toBe('order');
        controller.cycleMode();
        expect(controller.getSnapshot().mode).toBe('all');
        expect(JSON.parse(items.get(PLAY_MODE_STORAGE_KEY) ?? '')).toEqual({
            shuffle: false,
            repeat: 'all',
        });
        element.finish();
        expect(state().trackId).toBe('room-01');
    });

    it('should keep playing in shuffle after a round', () => {
        const { element, controller, state } = playingLast(
            JSON.stringify({ shuffle: true, repeat: 'off' }),
        );
        const seen = new Set([state().trackId]);
        for (let step = 0; step < SOURCE.tracks.length; step += 1) {
            element.finish();
            seen.add(state().trackId);
        }
        expect(state().status).toBe('playing');
        expect(seen.size).toBe(SOURCE.tracks.length);
        expect(controller.getSnapshot().mode).toBe('shuffle');
    });

    it('should go to the next and previous track at once (lock screen)', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'room-02');
        vi.advanceTimersByTime(LEAD_IN_MS);
        controller.next();
        expect(state().trackId).toBe('room-03');
        expect(element.plays.at(-1)).toEqual({ src: url(3), muted: false });
        controller.next();
        expect(state().trackId).toBe('room-03');
        controller.previous();
        controller.previous();
        expect(state().trackId).toBe('room-01');
        controller.previous();
        expect(state().trackId).toBe('room-01');
    });

    // Functional Spec D110（Plan P6）：播咗超過 PREVIOUS_RESTART_S = 由頭播；否則上一首；冇上一首都由頭
    it.each([
        [PREVIOUS_RESTART_S + 0.5, 'room-02', 0],
        [PREVIOUS_RESTART_S, 'room-01', 0],
        [PREVIOUS_RESTART_S - 1, 'room-01', 0],
    ])('should handle previous at %d s by restarting or going back (D110)', (at, trackId, time) => {
        const { element, controller, state } = setup({ reduceMotion: true });
        controller.start(SOURCE, 'room-02');
        element.loadMetadata(120);
        element.advance(at);
        controller.previous();
        expect(state().trackId).toBe(trackId);
        expect(element.currentTime).toBe(time);
        expect(element.paused).toBe(false);
    });

    it('should restart the first track on previous when there is no track before it (D110)', () => {
        const { element, controller, state } = setup({ reduceMotion: true });
        controller.start(SOURCE, 'room-01');
        element.loadMetadata(120);
        element.advance(1);
        controller.previous();
        expect(state().trackId).toBe('room-01');
        expect(element.currentTime).toBe(0);
        expect(element.seeks.at(-1)).toBe(0);
    });

    it('should put the disc down and release the audio on release', () => {
        const { element, controller, state } = playingLast();
        element.finish();
        controller.release();
        expect(state().status).toBe('idle');
        expect(element.src).toBe('');
        controller.resume();
        expect(state().status).toBe('idle');
    });
});

describe('playbackController errors (US-004, T-011 §2.3)', () => {
    it('should park on a failed load and start the same track again on the next tap', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'room-02');
        vi.advanceTimersByTime(LEAD_IN_MS);
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'error', trackId: 'room-02' });
        controller.toggle();
        expect(state().status).toBe('playing');
        expect(element.plays.at(-1)).toEqual({ src: url(2), muted: true });
    });

    it('should treat a blocked play as a restore pause and cue again in the next tap', async () => {
        const { element, controller, state } = setup();
        element.playMode = 'blocked';
        controller.start(SOURCE, 'room-01');
        await vi.advanceTimersByTimeAsync(0);
        expect(state()).toMatchObject({ status: 'paused', pauseReason: 'restore' });
        element.playMode = 'auto';
        controller.resume();
        expect(element.plays.at(-1)).toEqual({ src: url(1), muted: true });
    });

    // D109：前景照 US-004 停 + 提示
    it('should stop on an error during auto-next in the foreground', () => {
        const { element, controller, state } = setup();
        controller.start(SOURCE, 'room-01');
        vi.advanceTimersByTime(LEAD_IN_MS);
        element.playMode = 'hold';
        element.finish();
        element.fail('decode');
        expect(state()).toMatchObject({ status: 'error', trackId: 'room-02' });
    });
});

/* Functional Spec D109（CR-010；Plan T-038 P5）：畫面隱藏時自動下一首載入失敗 = 跳去再下一首試一次 */
describe('playbackController hidden auto-next failure (D109)', () => {
    /** 隱藏、播緊 startId；佢播完之後嘅下一首未有數據（hold） */
    const hiddenAfterEnd = (startId: string, stored?: string) => {
        const context = setup({ hidden: true, stored });
        context.controller.start(SOURCE, startId);
        context.element.playMode = 'hold';
        context.element.finish();
        return context;
    };

    it('should skip once to the following playable track, synchronously', () => {
        const { element, state } = hiddenAfterEnd('room-01');
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'playing', trackId: 'room-03' });
        expect(element.src).toBe(url(3));
        expect(element.plays.at(-1)).toEqual({ src: url(3), muted: false });
    });

    it('should skip a network failure of a track that has not played yet too (W-062)', () => {
        const { element, state } = hiddenAfterEnd('room-01');
        element.fail('network');
        expect(state()).toMatchObject({ status: 'playing', trackId: 'room-03' });
    });

    it('should stop when the skipped-to track fails as well', () => {
        const { element, state } = hiddenAfterEnd(
            'room-01',
            JSON.stringify({ shuffle: false, repeat: 'all' }),
        );
        element.fail('unsupported');
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'error', trackId: 'room-03' });
        expect(element.src).toBe(url(3));
    });

    it('should stop when there is no following track in order mode', () => {
        const { element, state } = hiddenAfterEnd('room-02');
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'error', trackId: 'room-03' });
    });

    it('should not skip back to the same track in repeat one', () => {
        const { element, state } = hiddenAfterEnd(
            'room-01',
            JSON.stringify({ shuffle: false, repeat: 'one' }),
        );
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'error', trackId: 'room-01' });
    });

    it('should not skip a track the listener chose (only auto-next)', () => {
        const { element, controller, state } = setup({ hidden: true });
        element.playMode = 'hold';
        controller.start(SOURCE, 'room-01');
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'error', trackId: 'room-01' });
    });

    it('should allow another skip once the skipped-to track has played', () => {
        const { element, state } = hiddenAfterEnd(
            'room-01',
            JSON.stringify({ shuffle: false, repeat: 'all' }),
        );
        element.fail('unsupported');
        element.resolvePlay();
        element.finish();
        element.fail('unsupported');
        expect(state()).toMatchObject({ status: 'playing', trackId: 'room-02' });
    });
});
