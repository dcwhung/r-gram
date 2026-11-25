import type { CSSProperties, ReactNode } from 'react';
import './stage.css';
import { useStageFit } from './useStageFit';

const CSS_PRECISION = 4;

/**
 * 舞台：成個播放端畫面嘅容器。設定 CSS 變數畀入面所有元件用：
 * - `--u`：1 個設計單位（1080 基準）等於幾多 px；尺寸一律寫 `calc(var(--u) * N)`
 * - `--stage-extra`：畫面比 9:16 高出幾多單位（底部對齊嘅元件用）
 */
export const Stage = ({ children }: { children: ReactNode }) => {
    const fit = useStageFit();
    const style = {
        '--u': `${fit.unit.toFixed(CSS_PRECISION)}px`,
        '--stage-extra': fit.extraUnits.toFixed(CSS_PRECISION),
        '--stage-offset-x': `${fit.offsetX.toFixed(CSS_PRECISION)}px`,
    } as CSSProperties;
    return (
        <div className="stage" data-testid="stage" style={style}>
            {children}
        </div>
    );
};
