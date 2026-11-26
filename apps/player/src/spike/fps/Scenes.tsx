import { useMemo } from 'react';
import { HomeScene } from '../../app/HomeScene';
import type { PreloadStatus } from '../../app/startup/useBoot';
import { useHome } from '../../app/useHome';
import { PreloadScreen } from '../../components/flag/PreloadScreen';
import { DESIGN_WIDTH } from '../../stage/fitStage';
import { Stage } from '../../stage/Stage';
import { useTextMeasure } from '../../utils/useFontsVersion';
import type { SpikeMedia } from '../media/useMedia';
import { spikeCatalog } from './spikeCatalog';

/** Preload 量度期間嘅狀態：載入緊、進度一半多啲 */
const PRELOAD_STATUS: PreloadStatus = {
    phase: 'loading',
    progress: 0.6,
    exit: 'shown',
    retry: () => {},
};

/** 5a：真嘅 Preload 旗幟（components/flag） */
export const FlagScene = () => (
    <Stage>
        <PreloadScreen status={PRELOAD_STATUS} />
    </Stage>
);

/** 真嘅主頁（測試碟、未揀歌） */
const HomeStage = ({ media }: { media: SpikeMedia }) => {
    const catalog = useMemo(() => spikeCatalog(media), [media]);
    const { view, handlers } = useHome(catalog);
    const measure = useTextMeasure();
    return view && handlers ? (
        <Stage>
            <HomeScene view={view} handlers={handlers} measure={measure} />
        </Stage>
    ) : null;
};

export type BlurMode = 'svg' | 'css' | 'none';

/** 設計稿 `fBackdrop`：stdDeviation 20 個設計單位 */
const BLUR_UNITS = 20;
const FILTER_ID = 'spike-backdrop-blur';

const filterFor = (mode: BlurMode, pixels: number): string => {
    if (mode === 'svg') return `url(#${FILTER_ID})`;
    if (mode === 'css') return `blur(${pixels}px)`;
    return 'none';
};

/**
 * 5b–5d：MV 開住時成個舞台變模糊（設計稿「MV 電視」），上面有會郁嘅嘢（MV 片、一條移動嘅橫條），
 * 等瀏覽器每格都要重新合成
 */
export const BlurScene = ({ media, mode }: { media: SpikeMedia; mode: BlurMode }) => {
    const pixels = (BLUR_UNITS * window.innerWidth) / DESIGN_WIDTH;
    return (
        <>
            <svg className="spike-hidden" aria-hidden="true">
                <filter id={FILTER_ID} x="0" y="0" width="100%" height="100%">
                    <feGaussianBlur stdDeviation={pixels} />
                </filter>
            </svg>
            <div className="spike-blur" style={{ filter: filterFor(mode, pixels) }}>
                <HomeStage media={media} />
            </div>
            {media.mvUrl ? (
                <video
                    className="spike-blur-video"
                    src={media.mvUrl}
                    muted
                    autoPlay
                    loop
                    playsInline
                />
            ) : null}
            <div className="spike-mover" aria-hidden="true" />
        </>
    );
};
