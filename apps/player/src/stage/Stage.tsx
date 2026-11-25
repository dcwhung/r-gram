import type { CSSProperties, ReactNode } from 'react';
import { DESIGN_WIDTH } from './fitStage';
import './stage.css';
import { useStageFit } from './useStageFit';

const CSS_PRECISION = 4;

/**
 * 舞台：成個播放端畫面嘅容器。設定 CSS 變數畀入面所有元件用：
 * - `--u`：1 個設計單位（1080 基準）等於幾多 px；尺寸一律寫 `calc(var(--u) * N)`
 * - `--stage-extra`：畫面比 9:16 高出幾多單位（底部對齊嘅元件用）
 * 舞台只佔安全區入面嘅位（狀態列、動態島、底部指示條以外），所以元件唔使理安全區。
 */
export const Stage = ({ children }: { children: ReactNode }) => {
    const fit = useStageFit();
    const style = {
        '--u': `${fit.unit.toFixed(CSS_PRECISION)}px`,
        '--stage-width-units': DESIGN_WIDTH,
        '--stage-height-units': fit.heightUnits.toFixed(CSS_PRECISION),
        '--stage-extra': fit.extraUnits.toFixed(CSS_PRECISION),
        '--stage-offset-x': `${fit.offsetX.toFixed(CSS_PRECISION)}px`,
        '--stage-offset-y': `${fit.offsetY.toFixed(CSS_PRECISION)}px`,
    } as CSSProperties;
    return (
        <div className="stage" data-testid="stage" style={style}>
            {children}
        </div>
    );
};
