import type { EngineEvent } from '../playback/audioEngine';
import { createMvAudio } from './mvAudio';
import { DEFAULT_MV_VOLUME } from './mvConfig';
import { asContextClass, FakeAudioContext } from './testing/fakeAudioContext';
import { asVideo, FakeVideoElement } from './testing/fakeVideo';
import { createVideoEngine } from './videoEngine';

const MV = { id: 'room-01', url: 'https://media.example/room/01%20Room.mp4' };

const setup = ({ webAudio = true } = {}) => {
    FakeAudioContext.reset();
    const element = new FakeVideoElement();
    const audio = createMvAudio(webAudio ? { AudioContext: asContextClass(FakeAudioContext) } : {});
    const engine = createVideoEngine(asVideo(element), audio);
    const events: EngineEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const gain = () => FakeAudioContext.lastGain()?.value;
    const types = () => events.map((event) => event.type);
    return { element, engine, events, gain, types };
};

/* Technical Spec「CR-010 → MV 音訊」VideoEngine：成個 app 一個 <video>；手勢入面 cue、開機 reveal */
describe('videoEngine (T-060)', () => {
    it('should own one video that plays inline with CORS so Web Audio can read it', () => {
        const { element, engine } = setup();
        expect(engine.element).toBe(element);
        expect(element.crossOrigin).toBe('anonymous');
        expect(element.playsInline).toBe(true);
        expect(element.preload).toBe('metadata');
    });

    it('should play silently through the gain in the same call stack as the tap (cue)', () => {
        const { element, engine, gain } = setup();
        element.playMode = 'hold';
        engine.cue(MV);
        expect(element.plays).toEqual([{ src: MV.url, muted: false }]);
        expect(gain()).toBe(0);
    });

    it('should stop at 0 once readied and say nothing until the screen is switched on', () => {
        const { element, engine, types } = setup();
        engine.cue(MV);
        expect(element.paused).toBe(true);
        expect(element.currentTime).toBe(0);
        expect(types()).toEqual([]);
        engine.reveal();
        expect(element.paused).toBe(false);
        expect(types()).toEqual(['playing']);
    });

    it('should open the gain only when the screen is switched on', () => {
        const { engine, gain } = setup();
        engine.cue(MV);
        expect(gain()).toBe(0);
        engine.reveal();
        expect(gain()).toBe(DEFAULT_MV_VOLUME);
    });

    it('should go straight on from 0 when the screen comes on before the MV is ready', () => {
        const { element, engine, gain, types } = setup();
        element.playMode = 'hold';
        engine.cue(MV);
        engine.reveal();
        element.advance(0.4);
        element.resolvePlay();
        expect(element.paused).toBe(false);
        expect(element.currentTime).toBe(0);
        expect(gain()).toBe(DEFAULT_MV_VOLUME);
        expect(types()).toEqual(['playing']);
    });

    // 冇 Web Audio：預備唔到靜音，所以唔預先播，開機先 play()（用系統音量；唔用 video.muted）
    it('should only load in the tap and play at the switch-on without Web Audio', () => {
        const { element, engine, types } = setup({ webAudio: false });
        engine.cue(MV);
        expect(element.plays).toEqual([]);
        expect(element.loads).toBe(1);
        engine.reveal();
        expect(element.plays).toEqual([{ src: MV.url, muted: false }]);
        expect(types()).toEqual(['playing']);
    });

    it('should never touch video.muted or video.volume', () => {
        const { element, engine } = setup();
        engine.cue(MV);
        engine.reveal();
        engine.pause();
        engine.play();
        engine.stop();
        expect(element.plays.every((play) => !play.muted)).toBe(true);
        expect(element.muted).toBe(false);
        expect(element.volumeWrites).toEqual([]);
    });

    it('should report a blocked play as blocked', async () => {
        const { element, engine, events } = setup({ webAudio: false });
        engine.cue(MV);
        element.playMode = 'blocked';
        engine.reveal();
        await Promise.resolve();
        expect(events).toContainEqual({ type: 'error', trackId: MV.id, reason: 'blocked' });
    });

    // W-068：有 Web Audio，cue 嘅 play() 被拒：停喺 0（gain 0），之後 ▶（手勢）開機照播得
    it('should play from the start on reveal after the tap-time play was refused', async () => {
        const { element, engine, events, gain } = setup();
        element.playMode = 'blocked';
        engine.cue(MV);
        await Promise.resolve();
        expect(events).toEqual([{ type: 'error', trackId: MV.id, reason: 'blocked' }]);
        expect(gain()).toBe(0);
        element.playMode = 'auto';
        engine.reveal();
        expect(element.plays).toHaveLength(2);
        expect(element.paused).toBe(false);
        expect(gain()).toBe(DEFAULT_MV_VOLUME);
        expect(events.at(-1)).toEqual({ type: 'playing', trackId: MV.id });
    });

    it('should pause and play again on request', () => {
        const { element, engine, events } = setup();
        engine.cue(MV);
        engine.reveal();
        engine.pause();
        expect(element.paused).toBe(true);
        expect(events.at(-1)).toEqual({ type: 'paused', trackId: MV.id, requested: true });
        engine.play();
        expect(element.paused).toBe(false);
        expect(events.at(-1)).toEqual({ type: 'playing', trackId: MV.id });
    });

    it('should report a pause the page did not ask for (call, Siri) as not requested', () => {
        const { element, engine, events } = setup();
        engine.cue(MV);
        engine.reveal();
        element.systemPause();
        expect(events.at(-1)).toEqual({ type: 'paused', trackId: MV.id, requested: false });
    });

    it('should not play when paused before the screen comes on', () => {
        const { element, engine, types } = setup();
        engine.cue(MV);
        engine.pause();
        expect(types()).toEqual(['paused']);
        engine.play();
        expect(element.paused).toBe(false);
        expect(types()).toEqual(['paused', 'playing']);
    });

    it('should report the time only once the MV is showing', () => {
        const { element, engine, events } = setup();
        element.playMode = 'hold';
        engine.cue(MV);
        element.loadMetadata(200);
        element.advance(0.2);
        expect(events).toEqual([]);
        element.resolvePlay();
        engine.reveal();
        element.advance(3);
        expect(events.at(-1)).toEqual({
            type: 'time',
            trackId: MV.id,
            positionSec: 3,
            durationSec: 200,
        });
        expect(engine.positionSec).toBe(3);
        expect(engine.durationSec).toBe(200);
    });

    it('should report the end of the MV', () => {
        const { element, engine, events } = setup();
        engine.cue(MV);
        engine.reveal();
        element.finish();
        expect(events.at(-1)).toEqual({ type: 'ended', trackId: MV.id });
        expect(events.filter((event) => event.type === 'paused')).toEqual([]);
    });

    it.each([
        ['network', 'network'],
        ['decode', 'decode'],
        ['unsupported', 'unsupported'],
    ] as const)('should report a %s error', (kind, reason) => {
        const { element, engine, events } = setup();
        engine.cue(MV);
        element.fail(kind);
        expect(events.at(-1)).toEqual({ type: 'error', trackId: MV.id, reason });
    });

    it('should ignore an aborted download', () => {
        const { element, engine, events } = setup();
        engine.cue(MV);
        element.fail('aborted');
        expect(events).toEqual([]);
    });

    it('should clamp a seek to the length of the MV', () => {
        const { element, engine } = setup();
        engine.cue(MV);
        engine.reveal();
        element.loadMetadata(100);
        engine.seek(130);
        expect(element.currentTime).toBe(100);
        engine.seek(-5);
        expect(element.currentTime).toBe(0);
    });

    it('should stop, let go of the file and the audio, and say nothing more', () => {
        const { element, engine, events } = setup();
        engine.cue(MV);
        engine.reveal();
        const before = events.length;
        engine.stop();
        element.fail('unsupported');
        element.fire('playing');
        expect(element.src).toBe('');
        expect(element.paused).toBe(true);
        expect(element.loads).toBe(1);
        expect(FakeAudioContext.created[0]?.suspends).toBe(1);
        expect(events).toHaveLength(before);
    });
});
