import { DEFAULT_MV_VOLUME } from './mvConfig';
import { createMvAudio } from './mvAudio';
import { asContextClass, FakeAudioContext } from './testing/fakeAudioContext';
import { asVideo, FakeVideoElement } from './testing/fakeVideo';

const setup = () => {
    FakeAudioContext.reset();
    const audio = createMvAudio({ AudioContext: asContextClass(FakeAudioContext) });
    const video = new FakeVideoElement();
    return { audio, video };
};

/* Technical Spec「CR-010 → MV 音訊」：<video> → MediaElementSource → GainNode → 喇叭 */
describe('mvAudio (T-060)', () => {
    it('should say it is not supported without an AudioContext and do nothing', () => {
        const audio = createMvAudio({});
        const video = new FakeVideoElement();
        expect(audio.supported).toBe(false);
        expect(() => {
            audio.attach(asVideo(video));
            audio.hold(true);
            audio.detach();
        }).not.toThrow();
    });

    it('should build one graph for the one video however many times the TV opens', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.detach();
        audio.attach(asVideo(video));
        expect(audio.supported).toBe(true);
        expect(FakeAudioContext.created).toHaveLength(1);
        expect(FakeAudioContext.created[0]?.sources).toEqual([video]);
        // 每次開電視都喺手勢入面 resume；收埋 suspend（唔 close，下次再用）
        expect(FakeAudioContext.created[0]?.resumes).toBe(2);
        expect(FakeAudioContext.created[0]?.suspends).toBe(1);
    });

    it('should hold the gain at 0 while the MV is being readied and open it to the volume after', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.hold(true);
        expect(FakeAudioContext.lastGain()?.value).toBe(0);
        audio.hold(false);
        expect(FakeAudioContext.lastGain()?.value).toBe(DEFAULT_MV_VOLUME);
    });

    // iPhone 真機量度（T-011 spike 報告 §1.1 4f）：接咗 Web Audio 之後 video.muted、video.volume 冇效，所以一律唔掂
    it('should never touch video.muted or video.volume', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.hold(true);
        audio.hold(false);
        audio.detach();
        expect(video.muted).toBe(false);
        expect(video.volumeWrites).toEqual([]);
    });
});

/* T-061：音量同靜音只經 gain（D104）；MV 路徑設 audioSession = playback */
describe('mvAudio volume (T-061)', () => {
    it('should turn the gain to the volume and remember it through mute', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.setVolume(0.4);
        expect(audio.volume).toBe(0.4);
        expect(FakeAudioContext.lastGain()?.value).toBe(0.4);
        audio.setMuted(true);
        expect(audio.muted).toBe(true);
        expect(FakeAudioContext.lastGain()?.value).toBe(0);
        audio.setMuted(false);
        expect(FakeAudioContext.lastGain()?.value).toBe(0.4);
        expect(video.muted).toBe(false);
        expect(video.volumeWrites).toEqual([]);
    });

    // S-259：靜音同預備要即刻 0（唔可以 ramp，否則會漏一下聲）；開聲先用 ramp
    it('should silence at once and only ramp when the sound comes back', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.hold(true);
        expect(FakeAudioContext.lastGain()?.calls.at(-1)).toEqual(['setValueAtTime', 0]);
        audio.hold(false);
        expect(FakeAudioContext.lastGain()?.calls.at(-1)?.[0]).toBe('setTargetAtTime');
        audio.setMuted(true);
        expect(FakeAudioContext.lastGain()?.calls.at(-1)).toEqual(['setValueAtTime', 0]);
    });

    it('should keep the volume between 0 and 1', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.setVolume(1.7);
        expect(audio.volume).toBe(1);
        audio.setVolume(-0.2);
        expect(audio.volume).toBe(0);
    });

    it('should stay silent while readied whatever the volume, and open to it after', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.hold(true);
        audio.setVolume(0.7);
        expect(FakeAudioContext.lastGain()?.value).toBe(0);
        audio.hold(false);
        expect(FakeAudioContext.lastGain()?.value).toBe(0.7);
    });

    it('should open to silence when muted before the switch-on', () => {
        const { audio, video } = setup();
        audio.attach(asVideo(video));
        audio.hold(true);
        audio.setMuted(true);
        audio.hold(false);
        expect(FakeAudioContext.lastGain()?.value).toBe(0);
    });

    // D104 🅰️（Q2）：側邊靜音撥掣開咗 MV 照有聲：只喺開電視嘅手勢入面設
    it('should ask iOS to treat the MV as playback when it opens', () => {
        FakeAudioContext.reset();
        const audioSession = { type: 'auto' };
        const audio = createMvAudio({
            AudioContext: asContextClass(FakeAudioContext),
            audioSession,
        });
        expect(audioSession.type).toBe('auto');
        audio.attach(asVideo(new FakeVideoElement()));
        expect(audioSession.type).toBe('playback');
    });

    it('should remember the volume without Web Audio but change nothing', () => {
        const audio = createMvAudio({});
        audio.setVolume(0.3);
        audio.setMuted(true);
        expect(audio.volume).toBe(0.3);
        expect(audio.muted).toBe(true);
    });
});
