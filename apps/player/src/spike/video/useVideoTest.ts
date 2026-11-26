import { type RefObject, useEffect, useRef, useState } from 'react';
import { SILENCE_RMS } from '../env';
import type { SpikeStore } from '../results/store';
import { useSpike } from '../results/store';
import { TEXT } from '../text';
import {
    checkCors,
    connectVideo,
    hasAudioSession,
    levelOf,
    type VideoGraph,
    volumeWritable,
} from './videoGraph';

/** 開始播之後等幾耐先判斷畫面同訊號 */
const VERDICT_AFTER_MS = 2500;
/** 畫面起碼行咗幾多秒 */
const MIN_PICTURE_S = 0.5;
const LEVEL_DIGITS = 3;

/** 播緊時每格畫面讀一次訊號，同時記最高 */
const useLevelMeter = (
    graph: RefObject<VideoGraph | null>,
    video: RefObject<HTMLVideoElement | null>,
) => {
    const [level, setLevel] = useState(0);
    const peak = useRef(0);
    useEffect(() => {
        let frame = 0;
        const tick = () => {
            const current = graph.current;
            if (current && video.current && !video.current.paused) {
                const value = levelOf(current.analyser);
                peak.current = Math.max(peak.current, value);
                setLevel(value);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [graph, video]);
    return { level, peak };
};

interface VideoRun {
    graph: RefObject<VideoGraph | null>;
    peak: RefObject<number>;
    record: SpikeStore['record'];
    log: SpikeStore['log'];
}

const reportVerdict = (element: HTMLVideoElement, startedAt: number, run: VideoRun) => {
    const moved = element.currentTime - startedAt;
    const picture = element.videoWidth > 0 && moved >= MIN_PICTURE_S;
    const size = TEXT.video.picture(element.videoWidth, element.videoHeight, moved.toFixed(2));
    run.record('4a', TEXT.video.pictureLabel, picture ? 'pass' : 'fail', size);
    const sound = run.peak.current > SILENCE_RMS;
    const level = `${TEXT.video.level} ${run.peak.current.toFixed(LEVEL_DIGITS)}`;
    const detail = sound ? level : `${level}${TEXT.comma}${TEXT.video.silent}`;
    run.record('4b', TEXT.video.graphLabel, sound ? 'pass' : 'fail', detail);
};

/** 要喺 click handler 入面叫（AudioContext 要喺手勢入面 resume） */
const startVideo = (element: HTMLVideoElement, mvUrl: string, run: VideoRun) => {
    run.graph.current = connectVideo(element);
    void run.graph.current?.context.resume();
    run.peak.current = 0;
    const startedAt = element.currentTime;
    element.play().then(
        () =>
            run.log(
                '4',
                TEXT.video.playOk(run.graph.current?.context.state ?? TEXT.video.noContext),
            ),
        (error: unknown) => run.log('4', TEXT.video.playRejected(String(error))),
    );
    window.setTimeout(() => reportVerdict(element, startedAt, run), VERDICT_AFTER_MS);
    void checkCors(mvUrl).then(({ ok, detail }) =>
        run.record('4c', TEXT.video.corsLabel, ok ? 'pass' : 'fail', detail),
    );
    const { volumeWritable: yes, volumeReadOnly: no } = TEXT.video;
    run.record('4e', TEXT.video.volumeLabel, 'value', volumeWritable(element) ? yes : no);
    const { available, missing } = TEXT.video;
    run.record('4h', TEXT.video.sessionLabel, 'value', hasAudioSession() ? available : missing);
};

/** ④ 播 MV、判斷畫面同 Web Audio 訊號、兩個後備 */
export const useVideoTest = (video: RefObject<HTMLVideoElement | null>, mvUrl: string | null) => {
    const { record, log } = useSpike();
    const graph = useRef<VideoGraph | null>(null);
    const { level, peak } = useLevelMeter(graph, video);
    const play = () => {
        if (video.current && mvUrl) startVideo(video.current, mvUrl, { graph, peak, record, log });
    };
    const setGain = (value: number) => {
        if (graph.current) graph.current.gain.gain.value = value;
    };
    return { level, play, setGain };
};
