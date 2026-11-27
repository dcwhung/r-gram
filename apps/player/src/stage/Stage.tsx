import type { CSSProperties, ReactNode } from 'react';
import { DESIGN_WIDTH, type StageFit } from './fitStage';
import './stage.css';
import { StageContext } from './StageContext';
import { useStageFit } from './useStageFit';

const CSS_PRECISION = 4;

/**
 * 舞台嘅 CSS 變數（設喺外框，舞台同入面所有元件都讀得到）：
 * - `--u`：1 個設計單位（1080 基準）等於幾多 px；尺寸一律寫 `calc(var(--u) * N)`
 * - `--stage-extra`：畫面比 9:16 高出幾多單位（底部對齊嘅元件用）
 * - `--stage-bleed-top`、`--stage-bleed-bottom`：舞台上下延伸到螢幕邊嘅高度（單位；T-117）
 */
const stageVariables = (fit: StageFit) =>
    ({
        '--u': `${fit.unit.toFixed(CSS_PRECISION)}px`,
        '--stage-width-units': DESIGN_WIDTH,
        '--stage-height-units': fit.heightUnits.toFixed(CSS_PRECISION),
        '--stage-extra': fit.extraUnits.toFixed(CSS_PRECISION),
        '--stage-offset-x': `${fit.offsetX.toFixed(CSS_PRECISION)}px`,
        '--stage-offset-y': `${fit.offsetY.toFixed(CSS_PRECISION)}px`,
        '--stage-bleed-top': fit.bleedTop.toFixed(CSS_PRECISION),
        '--stage-bleed-bottom': fit.bleedBottom.toFixed(CSS_PRECISION),
    }) as CSSProperties;

interface StageProps {
    children: ReactNode;
    /** 有全畫面嘅嘢蓋住（「請打直」，T-039）：讀屏同 Tab 都唔入舞台 */
    covered?: boolean;
}

/**
 * 舞台：成個播放端畫面嘅容器。舞台只佔安全區入面嘅位（狀態列、動態島、底部指示條以外），
 * 所以元件唔使理安全區；擺位、感應範圍全部喺舞台入面。
 * 外框（T-117、B-094）由螢幕頂去到螢幕底、闊度同舞台一樣：舞台底色同貼底嘅唱片機畫到外框邊先剪，
 * 唔再喺安全區邊裁走。延伸嗰兩段由兩塊透明嘅擋板蓋住：㩒落去同以前（㩒到舞台外面）一樣，乜都唔觸發。
 */
export const Stage = ({ children, covered = false }: StageProps) => {
    const fit = useStageFit();
    return (
        <StageContext.Provider value={fit}>
            <div className="stage-frame" data-testid="stage-frame" style={stageVariables(fit)}>
                <div
                    className="stage"
                    data-testid="stage"
                    inert={covered}
                    aria-hidden={covered || undefined}
                >
                    {children}
                </div>
                <div
                    className="stage-guard stage-guard--top"
                    data-part="stage-guard"
                    aria-hidden="true"
                />
                <div
                    className="stage-guard stage-guard--bottom"
                    data-part="stage-guard"
                    aria-hidden="true"
                />
            </div>
        </StageContext.Provider>
    );
};
