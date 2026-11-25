import type { CatalogDocument } from '@r-gram/catalog';
import { useState } from 'react';
import { Stage } from '../stage/Stage';
import { backdropFor, useStageBackdrop } from '../stage/useStageBackdrop';
import { createTextMeasure } from '../utils/textMeasure';
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
    const [measure] = useState(createTextMeasure);
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
