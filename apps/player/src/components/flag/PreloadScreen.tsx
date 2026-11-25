import type { PreloadStatus } from '../../app/startup/useBoot';
import { DESIGN_WIDTH } from '../../stage/fitStage';
import { PHONE_LAYOUT, type StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { FlagCanvas } from './FlagCanvas';
import { AppIdentity, LoadFailure, ProgressLine } from './PreloadInfo';
import './preload.css';

interface PreloadScreenProps {
    status: PreloadStatus;
    layout?: StageLayout;
}

/**
 * Preload（Functional Spec US-001、FR-001、FR-034；設計稿第 18 版「Preload」，旗幟飄揚照 v16）：
 * 全畫面布料旗，底部進度線同百分比（冇 catalog 就係錯誤同重試掣）、App 名、非官方聲明、版本號。
 * 載入完成：`exit = leaving` 成塊淡出（CSS），主頁已經喺下面；淡出期間唔收㩒。
 */
export const PreloadScreen = ({ status, layout = PHONE_LAYOUT }: PreloadScreenProps) => {
    const { heightUnits, extraUnits } = useStageFitContext();
    const { preload } = layout;
    return (
        <div className="preload" data-part="preload" data-exit={status.exit}>
            <FlagCanvas preload={preload} />
            <svg
                className="preload-svg"
                viewBox={`0 0 ${DESIGN_WIDTH} ${heightUnits}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMin meet"
            >
                {/* 底部嘅嘢貼底：高身手機多出嚟嘅高度喺上面（FR-039） */}
                <g data-part="preload-bottom" transform={`translate(0 ${extraUnits})`}>
                    {status.phase === 'failed' ? (
                        <LoadFailure layout={preload} onRetry={status.retry} />
                    ) : (
                        <ProgressLine layout={preload} progress={status.progress} />
                    )}
                    <AppIdentity layout={preload} />
                </g>
            </svg>
        </div>
    );
};
