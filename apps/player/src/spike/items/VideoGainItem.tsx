import { type RefObject, useRef, useState } from 'react';
import type { SpikeMedia } from '../media/useMedia';
import { useSpike } from '../results/store';
import { TEXT } from '../text';
import { useVideoTest } from '../video/useVideoTest';
import { hasAudioSession, setPlaybackSession, toggleMuted } from '../video/videoGraph';
import { OwnerCheck, Section } from './Section';

const PERCENT = 100;
/** 訊號條：RMS 0.3 已經好大聲，當滿格 */
const FULL_LEVEL = 0.3;
const GAIN_STEP = 0.01;

interface GainControlProps {
    gain: number;
    level: number;
    onGain: (value: number) => void;
}

/** 音量滑桿（GainNode）同訊號條（AnalyserNode） */
const GainControl = ({ gain, level, onGain }: GainControlProps) => (
    <>
        <label className="spike-field">
            <span>
                {TEXT.video.gain} {Math.round(gain * PERCENT)}%
            </span>
            <input
                type="range"
                min={0}
                max={1}
                step={GAIN_STEP}
                value={gain}
                data-testid="gain"
                onChange={(event) => onGain(Number(event.target.value))}
            />
        </label>
        <div className="spike-meter" aria-label={TEXT.video.level}>
            <div style={{ width: `${Math.min(PERCENT, (level / FULL_LEVEL) * PERCENT)}%` }} />
        </div>
    </>
);

/** 後備二（靜音掣）同 iOS 嘅 audioSession 開關 */
const Fallbacks = ({ video }: { video: RefObject<HTMLVideoElement | null> }) => {
    const { record } = useSpike();
    const toggleMute = () => toggleMuted(video.current);
    const toggleSession = (on: boolean) => {
        setPlaybackSession(on);
        record('4g', TEXT.video.sessionLabel, 'value', on ? 'playback' : 'auto');
    };
    return (
        <>
            <button type="button" className="spike-button" onClick={toggleMute}>
                {TEXT.video.mute}
            </button>
            <OwnerCheck id="4f" label={TEXT.video.muteLabel} />
            {hasAudioSession() ? (
                <label className="spike-toggle">
                    <input
                        type="checkbox"
                        onChange={(event) => toggleSession(event.target.checked)}
                    />
                    {TEXT.video.playbackSession}
                </label>
            ) : null}
        </>
    );
};

/** ④ MV 音量經 Web Audio；後備：video.volume、靜音掣 */
export const VideoGainItem = ({ media }: { media: SpikeMedia }) => {
    const video = useRef<HTMLVideoElement>(null);
    const [gain, setGainValue] = useState(1);
    const { level, play, setGain } = useVideoTest(video, media.mvUrl);
    const changeGain = (value: number) => {
        setGainValue(value);
        setGain(value);
    };
    return (
        <Section item="4" title={TEXT.video.title} how={TEXT.video.how}>
            {media.mvUrl ? (
                <video
                    ref={video}
                    className="spike-video"
                    src={media.mvUrl}
                    crossOrigin="anonymous"
                    playsInline
                    preload="metadata"
                />
            ) : (
                <p>{TEXT.video.noMv}</p>
            )}
            <div className="spike-row">
                <button
                    type="button"
                    className="spike-button spike-button--main"
                    onClick={play}
                    disabled={!media.mvUrl}
                >
                    {TEXT.video.play}
                </button>
                <button
                    type="button"
                    className="spike-button"
                    onClick={() => video.current?.pause()}
                >
                    {TEXT.stop}
                </button>
            </div>
            <GainControl gain={gain} level={level} onGain={changeGain} />
            <OwnerCheck id="4d" label={TEXT.video.sliderLabel} />
            <Fallbacks video={video} />
        </Section>
    );
};
