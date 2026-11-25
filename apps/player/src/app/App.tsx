import type { CatalogDocument } from '@r-gram/catalog';
import { Stage } from '../stage/Stage';
import { backdropFor, useStageBackdrop } from '../stage/useStageBackdrop';
import { useTextMeasure } from '../utils/useFontsVersion';
import './app.css';
import { HomeScene } from './HomeScene';
import { PreloadPlaceholder } from './PreloadPlaceholder';
import { useHome } from './useHome';

interface AppProps {
    /**
     * 已載入嘅 catalog（T-034 之前嘅接口）。未有 = 停喺 Preload。
     * T-034 嘅 Preload 會自己 `loadCatalog()`，載入完再交 catalog 同 dispatch `preloadDone`。
     */
    catalog?: CatalogDocument | null;
}

/** 舞台 + 場景：Preload（暫時畫面）→ 主頁。歌單、轉碟、歌書、MV 喺之後嘅任務加畫面 */
export const App = ({ catalog = null }: AppProps) => {
    const home = useHome(catalog);
    // 字體載入完會換新嘅量字函數，左上資訊用真字體重新 fit（W-017）
    const measure = useTextMeasure();
    useStageBackdrop(backdropFor(home.stage.scene));
    const { view, handlers } = home;
    return (
        <Stage>
            {home.stage.scene !== 'preload' && view && handlers ? (
                <HomeScene view={view} handlers={handlers} measure={measure} />
            ) : (
                <PreloadPlaceholder />
            )}
        </Stage>
    );
};
