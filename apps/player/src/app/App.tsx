import { PreloadScreen } from '../components/flag/PreloadScreen';
import { Stage } from '../stage/Stage';
import { backdropFor, useStageBackdrop } from '../stage/useStageBackdrop';
import { useTextMeasure } from '../utils/useFontsVersion';
import { HomeScene } from './HomeScene';
import type { StartupDeps } from './startup/startupDeps';
import { useBoot } from './startup/useBoot';

interface AppProps {
    /** 開 app 載入嘅三項（瀏覽器：main.tsx 用 createBrowserStartup()；測試用假嘅） */
    startup: StartupDeps;
}

/**
 * 舞台 + 場景：Preload（旗幟、真實載入進度，T-034）→ 主頁。Preload 淡出期間主頁已經喺下面。
 * 歌單、轉碟、歌書、MV 喺之後嘅任務加畫面。
 */
export const App = ({ startup }: AppProps) => {
    const { home, preload } = useBoot(startup);
    // 字體載入完會換新嘅量字函數，左上資訊用真字體重新 fit（W-017）
    const measure = useTextMeasure();
    // 旗未完全淡走之前，安全區外面都保持旗嘅黑底
    useStageBackdrop(backdropFor(preload.exit === 'gone' ? home.stage.scene : 'preload'));
    const { view, handlers } = home;
    return (
        <Stage>
            {home.stage.scene !== 'preload' && view && handlers ? (
                <HomeScene view={view} handlers={handlers} measure={measure} />
            ) : null}
            {preload.exit === 'gone' ? null : <PreloadScreen status={preload} />}
        </Stage>
    );
};
