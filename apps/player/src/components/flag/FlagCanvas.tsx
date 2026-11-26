import { useMemo, useRef } from 'react';
import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { PreloadLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { flagSceneFor } from './flagScene';
import { useFlagAnimation } from './useFlagAnimation';

/** canvas 最多用幾倍像素（Technical Spec「旗幟」：DPR 上限 2；3× 手機用 2× 已經睇唔出分別，慳一半像素） */
const MAX_PIXEL_RATIO = 2;

const pixelRatio = () => Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);

/** 成個舞台嘅布料旗（Functional Spec US-001：全畫面黑色旗幟 + 白色 logo 飄揚）。裝飾：讀屏唔讀 */
export const FlagCanvas = ({ preload }: { preload: PreloadLayout }) => {
    const { unit, heightUnits, extraUnits } = useStageFitContext();
    const ref = useRef<HTMLCanvasElement>(null);
    const scene = useMemo(() => flagSceneFor(preload, extraUnits), [preload, extraUnits]);
    const scale = unit * pixelRatio();
    // context lost 之後換一塊新 canvas 畫靜止（用過 WebGL 嘅 canvas 攞唔到 2D context）
    const mode = useFlagAnimation(ref, scene, scale);
    return (
        <canvas
            key={mode}
            ref={ref}
            className="preload-flag"
            aria-hidden="true"
            width={Math.round(DESIGN_WIDTH * scale)}
            height={Math.round(heightUnits * scale)}
        />
    );
};
