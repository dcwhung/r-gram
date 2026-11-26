import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../utils/motion';
import { FPS_SAMPLE_MS } from '../config';
import { formatFrameStats, frameStats } from '../fps/frameStats';
import { collectFrames, wait } from '../fps/measure';
import { BlurScene, type BlurMode, FlagScene } from '../fps/Scenes';
import type { SpikeMedia } from '../media/useMedia';
import { useSpike } from '../results/store';
import { TEXT } from '../text';
import { Section } from './Section';

/** 畫面出咗、圖載入咗先開始量 */
const WARM_UP_MS = 800;

interface Run {
    id: string;
    label: string;
    scene: 'flag' | BlurMode;
}

const RUNS: readonly Run[] = [
    { id: '5a', label: TEXT.fps.flag, scene: 'flag' },
    { id: '5b', label: TEXT.fps.blurSvg, scene: 'svg' },
    { id: '5c', label: TEXT.fps.blurCss, scene: 'css' },
    { id: '5d', label: TEXT.fps.plain, scene: 'none' },
];

/** 開咗場景就等一陣，量 5 秒，寫結果，再收埋 */
const useMeasureRun = () => {
    const { record } = useSpike();
    const [active, setActive] = useState<Run | null>(null);
    useEffect(() => {
        if (!active) return undefined;
        let live = true;
        void wait(WARM_UP_MS)
            .then(() => collectFrames(FPS_SAMPLE_MS))
            .then((times) => {
                if (!live) return;
                const still =
                    active.scene === 'flag' && prefersReducedMotion() ? TEXT.fps.reducedMotion : '';
                const stats = formatFrameStats(frameStats(times));
                record(active.id, active.label, 'value', `${stats}${still}`);
                setActive(null);
            });
        return () => {
            live = false;
        };
    }, [active, record]);
    return { active, setActive };
};

/** ⑤ 旗幟同模糊背景嘅幀率：全螢幕 5 秒 */
export const FpsItem = ({ media }: { media: SpikeMedia }) => {
    const { active, setActive } = useMeasureRun();
    return (
        <Section item="5" title={TEXT.fps.title} how={TEXT.fps.how}>
            <div className="spike-row">
                {RUNS.map((run) => (
                    <button
                        key={run.id}
                        type="button"
                        className="spike-button"
                        onClick={() => setActive(run)}
                        disabled={active !== null}
                    >
                        {run.label}
                    </button>
                ))}
            </div>
            {active ? (
                <div className="spike-overlay" data-testid="fps-overlay">
                    {active.scene === 'flag' ? (
                        <FlagScene />
                    ) : (
                        <BlurScene media={media} mode={active.scene} />
                    )}
                    <p className="spike-overlay-note" role="status">
                        {active.label} · {TEXT.fps.measuring}
                    </p>
                </div>
            ) : null}
        </Section>
    );
};
