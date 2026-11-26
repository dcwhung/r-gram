import { STALL_MAX_RETRIES, STALL_NOTICE_MS, STALL_RETRY_MS } from '../config/limits';
import { createAudioEngine, type EngineEvent, type EngineTrack } from './audioEngine';
import { asAudio, FakeAudioElement } from './testing/fakeAudioElement';

const ONE: EngineTrack = { id: 'one', url: 'https://media.example/a/01.m4a' };
const TWO: EngineTrack = { id: 'two', url: 'https://media.example/a/02.m4a' };
const DURATION_SEC = 200;

const setup = () => {
    const element = new FakeAudioElement();
    let hidden = false;
    let onVisible: (() => void) | null = null;
    const engine = createAudioEngine(asAudio(element), {
        isHidden: () => hidden,
        onVisible: (callback) => {
            onVisible = callback;
        },
    });
    const events: EngineEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const types = () => events.map((event) => event.type);
    const hide = (value: boolean) => {
        hidden = value;
        if (!value) onVisible?.();
    };
    return { element, engine, events, types, hide };
};

/** 等 promise 嘅 then／catch 行完 */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('audioEngine element', () => {
    it('should load metadata only and not use CORS (records do not go through Web Audio)', () => {
        const { element } = setup();
        expect(element.preload).toBe('metadata');
        expect(element.crossOrigin).toBeNull();
    });

    it('should report nothing loaded before the first track', () => {
        const { engine } = setup();
        expect(engine.currentTrackId).toBeNull();
        expect(engine.positionSec).toBe(0);
        expect(engine.durationSec).toBeNull();
    });
});

describe('audioEngine cue and land (T-011 §2.4)', () => {
    it('should start a muted play() in the same call stack and hold silently at 0', () => {
        const { element, engine, types } = setup();
        engine.cue(ONE);
        expect(element.plays).toEqual([{ src: ONE.url, muted: true }]);
        // 一出 playing 就 pause、返 0、取消靜音，等落針；唔發 playing／time
        expect(element.paused).toBe(true);
        expect(element.currentTime).toBe(0);
        expect(element.muted).toBe(false);
        element.advance(0);
        expect(types()).toEqual([]);
        expect(engine.currentTrackId).toBe('one');
    });

    it('should make sound from 0 when the needle lands after the prime', () => {
        const { element, engine, events } = setup();
        engine.cue(ONE);
        engine.land();
        expect(element.paused).toBe(false);
        expect(element.muted).toBe(false);
        expect(element.plays.at(-1)).toEqual({ src: ONE.url, muted: false });
        expect(events).toEqual([{ type: 'playing', trackId: 'one' }]);
    });

    it('should keep playing from 0 when the needle lands before the data arrives', () => {
        const { element, engine, events } = setup();
        element.playMode = 'hold';
        engine.cue(ONE);
        engine.land();
        expect(events).toEqual([]);
        element.advance(0.3);
        element.resolvePlay();
        expect(element.paused).toBe(false);
        expect(element.muted).toBe(false);
        expect(element.currentTime).toBe(0);
        expect(events).toEqual([{ type: 'playing', trackId: 'one' }]);
    });

    it('should report a blocked play() so the next tap can try again', async () => {
        const { element, engine, events } = setup();
        element.playMode = 'blocked';
        engine.cue(ONE);
        await flush();
        expect(events).toEqual([{ type: 'error', trackId: 'one', reason: 'blocked' }]);
    });

    it('should cancel a pending landing when paused during the lead-in', () => {
        const { element, engine, events } = setup();
        element.playMode = 'hold';
        engine.cue(ONE);
        engine.land();
        engine.pause();
        expect(events).toEqual([{ type: 'paused', trackId: 'one', requested: true }]);
        element.resolvePlay();
        expect(events).toHaveLength(1);
        // 數據已經到咗：再 play() 即刻出聲
        element.playMode = 'auto';
        engine.play();
        expect(events.at(-1)).toEqual({ type: 'playing', trackId: 'one' });
    });

    it('should do nothing on land() without a cue', () => {
        const { element, engine } = setup();
        engine.land();
        expect(element.plays).toEqual([]);
    });

    it('should stop the old track at once without reporting it ended', () => {
        const { element, engine, types } = setup();
        engine.playNow(ONE);
        engine.cue(TWO);
        expect(element.src).toBe(TWO.url);
        expect(types()).toEqual(['playing']);
    });

    it('should ignore a late AbortError from the previous source', async () => {
        const { element, engine, types } = setup();
        element.playMode = 'blocked';
        engine.cue(ONE);
        element.playMode = 'auto';
        engine.cue(TWO);
        await flush();
        expect(types()).toEqual([]);
    });
});

describe('audioEngine play, pause, seek, stop', () => {
    it('should play a track at once with sound (lock screen, hidden page)', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        expect(element.plays).toEqual([{ src: ONE.url, muted: false }]);
        expect(events).toEqual([{ type: 'playing', trackId: 'one' }]);
    });

    it('should report our pause as requested and a system pause as not requested', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        engine.pause();
        expect(events.at(-1)).toEqual({ type: 'paused', trackId: 'one', requested: true });
        engine.play();
        element.systemPause();
        expect(events.at(-1)).toEqual({ type: 'paused', trackId: 'one', requested: false });
    });

    // 903-player S-643：本身已經停咗，element 唔會再發 pause，照報一次
    it('should still report a pause when the element is already paused', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        element.paused = true;
        engine.pause();
        expect(events.at(-1)).toEqual({ type: 'paused', trackId: 'one', requested: true });
    });

    it('should report a resume the system did by itself (T-011 ③ H1)', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        element.systemPause();
        element.systemResume();
        expect(events.at(-1)).toEqual({ type: 'playing', trackId: 'one' });
    });

    it('should report time with the duration once known', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        element.advance(1);
        expect(events.at(-1)).toEqual({
            type: 'time',
            trackId: 'one',
            positionSec: 1,
            durationSec: null,
        });
        element.loadMetadata(DURATION_SEC);
        element.advance(1);
        expect(events.at(-1)).toMatchObject({ positionSec: 2, durationSec: DURATION_SEC });
        expect(engine.positionSec).toBe(2);
        expect(engine.durationSec).toBe(DURATION_SEC);
    });

    it('should clamp a seek and keep it until the metadata arrives', () => {
        const { element, engine } = setup();
        engine.playNow(ONE);
        engine.seek(50);
        expect(element.seeks).toEqual([]);
        element.loadMetadata(DURATION_SEC);
        expect(element.currentTime).toBe(50);
        engine.seek(DURATION_SEC * 2);
        expect(element.currentTime).toBe(DURATION_SEC);
        engine.seek(-3);
        expect(element.currentTime).toBe(0);
    });

    it('should release the source on stop without reporting anything afterwards', () => {
        const { element, engine, types } = setup();
        engine.playNow(ONE);
        engine.stop();
        expect(element.paused).toBe(true);
        expect(element.src).toBe('');
        expect(element.loads).toBe(1);
        element.fail('unsupported');
        element.finish();
        expect(types()).toEqual(['playing']);
        expect(engine.currentTrackId).toBeNull();
    });
});

describe('audioEngine ended (T-011 ②)', () => {
    it('should switch to the next track inside the ended handler, without awaiting', () => {
        const { element, engine, events } = setup();
        const seen: string[] = [];
        engine.setNext((current) => {
            seen.push(current);
            return TWO;
        });
        engine.playNow(ONE);
        element.finish();
        expect(seen).toEqual(['one']);
        expect(element.plays.at(-1)).toEqual({ src: TWO.url, muted: false });
        expect(events.slice(1)).toEqual([
            { type: 'advanced', trackId: 'two', previousTrackId: 'one' },
            { type: 'playing', trackId: 'two' },
        ]);
        expect(engine.currentTrackId).toBe('two');
    });

    it('should replay the same file from 0 for repeat one', () => {
        const { element, engine, types } = setup();
        engine.setNext(() => ONE);
        engine.playNow(ONE);
        const loads = element.loads;
        element.finish();
        expect(element.currentTime).toBe(0);
        expect(element.paused).toBe(false);
        expect(element.loads).toBe(loads);
        expect(types()).toEqual(['playing', 'advanced', 'playing']);
    });

    it('should report the end of the queue and not treat the end as a pause', () => {
        const { element, engine, events } = setup();
        engine.setNext(() => null);
        engine.playNow(ONE);
        element.finish();
        expect(events.slice(1)).toEqual([{ type: 'ended', trackId: 'one' }]);
    });
});

describe('audioEngine errors and stalls', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it.each([
        ['decode', 'decode'],
        ['unsupported', 'unsupported'],
    ] as const)('should report a %s error without retrying', (kind, reason) => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        element.fail(kind);
        expect(events.at(-1)).toEqual({ type: 'error', trackId: 'one', reason });
        expect(element.plays).toHaveLength(1);
    });

    // S-243：MEDIA_ERR_ABORTED = 下載被中止（換 src、stop）；唔係檔案問題，唔報錯、唔重試
    it('should ignore an aborted fetch', () => {
        const { element, engine, types } = setup();
        engine.playNow(ONE);
        element.fail('aborted');
        expect(types()).toEqual(['playing']);
        expect(element.plays).toHaveLength(1);
    });

    it('should retry a network error at the same position, then give up', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        element.loadMetadata(DURATION_SEC);
        element.advance(30);
        for (let attempt = 1; attempt <= STALL_MAX_RETRIES; attempt += 1) {
            element.fail('network');
            expect(element.plays).toHaveLength(attempt + 1);
            element.loadMetadata(DURATION_SEC);
            expect(element.currentTime).toBe(30);
        }
        element.fail('network');
        expect(events.at(-1)).toEqual({ type: 'error', trackId: 'one', reason: 'network' });
    });

    it('should report a stall, reload after the retry time, and give up after the retries', () => {
        const { element, engine, events, types } = setup();
        element.playMode = 'hold';
        engine.playNow(ONE);
        vi.advanceTimersByTime(STALL_NOTICE_MS);
        expect(types()).toEqual(['stalled']);
        vi.advanceTimersByTime(STALL_RETRY_MS - STALL_NOTICE_MS);
        expect(element.plays).toHaveLength(2);
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);
        expect(events.at(-1)).toEqual({ type: 'error', trackId: 'one', reason: 'network' });
        expect(element.plays).toHaveLength(STALL_MAX_RETRIES + 1);
    });

    it('should not watch for stalls once sound starts or after a pause', () => {
        const { element, engine, types } = setup();
        element.playMode = 'hold';
        engine.playNow(ONE);
        element.resolvePlay();
        vi.advanceTimersByTime(STALL_RETRY_MS);
        element.fire('waiting');
        engine.pause();
        vi.advanceTimersByTime(STALL_RETRY_MS);
        expect(types()).toEqual(['playing', 'paused']);
    });

    it('should watch again when the element waits for data mid-song', () => {
        const { element, engine, types } = setup();
        engine.playNow(ONE);
        element.fire('waiting');
        vi.advanceTimersByTime(STALL_NOTICE_MS);
        expect(types()).toEqual(['playing', 'stalled']);
        element.advance(1);
        vi.advanceTimersByTime(STALL_RETRY_MS);
        expect(element.plays).toHaveLength(1);
    });

    // 903-player v1.20.8：畫面隱藏時唔重載，等返前景或者 play() 先試
    it('should not reload while hidden and retry when the page is shown again', () => {
        const { element, engine, hide } = setup();
        element.playMode = 'hold';
        engine.playNow(ONE);
        hide(true);
        vi.advanceTimersByTime(STALL_RETRY_MS);
        expect(element.plays).toHaveLength(1);
        hide(false);
        expect(element.plays).toHaveLength(2);
    });

    it('should retry an overdue stall at once on play()', () => {
        const { element, engine, hide } = setup();
        element.playMode = 'hold';
        engine.playNow(ONE);
        hide(true);
        vi.advanceTimersByTime(STALL_RETRY_MS);
        engine.play();
        expect(element.plays).toHaveLength(2);
    });

    // W-062（spike §2.3：畫面隱藏時唔重載）：歌中途斷網 = 等返前景先喺同一個位置重試
    it('should wait for the page to be shown before retrying a mid-track network error', () => {
        const { element, engine, events, hide } = setup();
        engine.playNow(ONE);
        element.loadMetadata(DURATION_SEC);
        element.advance(30);
        hide(true);
        element.fail('network');
        expect(element.plays).toHaveLength(1);
        expect(events.at(-1)?.type).toBe('time');
        hide(false);
        expect(element.plays).toHaveLength(2);
        element.loadMetadata(DURATION_SEC);
        expect(element.currentTime).toBe(30);
    });

    // W-062 × D109：未出過聲嘅歌網絡錯誤（隱藏）= 即刻報錯，由 controller 決定跳一次
    it('should report a network error of a track that has not played yet while hidden', () => {
        const { element, engine, events, hide } = setup();
        element.playMode = 'hold';
        engine.playNow(ONE);
        hide(true);
        element.fail('network');
        expect(element.plays).toHaveLength(1);
        expect(events.at(-1)).toEqual({ type: 'error', trackId: 'one', reason: 'network' });
    });

    // W-064：暫停緊（用戶或者系統）時網絡錯誤：唔可以自己再播、唔可以報載入失敗；下一次 play() 先喺同一個位置重載
    it.each([
        ['in the foreground', false],
        ['while hidden', true],
    ])(
        'should keep a paused track paused on a network error %s and reload on the next play()',
        (_, hidden) => {
            const { element, engine, events, hide } = setup();
            engine.playNow(ONE);
            element.loadMetadata(DURATION_SEC);
            element.advance(20);
            engine.pause();
            hide(hidden);
            element.fail('network');
            vi.advanceTimersByTime(STALL_RETRY_MS * (STALL_MAX_RETRIES + 1));
            expect(element.plays).toHaveLength(1);
            expect(element.paused).toBe(true);
            expect(events.at(-1)).toEqual({ type: 'paused', trackId: 'one', requested: true });
            hide(false);
            expect(element.plays).toHaveLength(1);
            engine.play();
            expect(element.plays).toHaveLength(2);
            expect(element.src).toBe(ONE.url);
            element.loadMetadata(DURATION_SEC);
            expect(element.currentTime).toBe(20);
            const states = events.filter(({ type }) => type === 'playing' || type === 'paused');
            expect(states.at(-1)).toEqual({ type: 'playing', trackId: 'one' });
        },
    );

    it('should report the error when the reload on play() fails for good', () => {
        const { element, engine, events } = setup();
        engine.playNow(ONE);
        element.advance(5);
        engine.pause();
        element.fail('network');
        engine.play();
        element.fail('decode');
        expect(events.at(-1)).toEqual({ type: 'error', trackId: 'one', reason: 'decode' });
    });
});
