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

    // spike 4f：接咗 Web Audio 之後 video.muted、video.volume 冇效，所以一律唔掂
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
