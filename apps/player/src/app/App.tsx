import { PreloadScreen } from '../components/flag/PreloadScreen';
import { RotateNotice } from '../components/rotate-notice/RotateNotice';
import { UpdatePrompt } from '../components/update-prompt/UpdatePrompt';
import { blocksUpdate } from '../pwa/playbackActivity';
import { NO_UPDATES, type UpdatePort } from '../pwa/useUpdates';
import { Stage } from '../stage/Stage';
import { usePhoneLandscape } from '../stage/usePhoneLandscape';
import { backdropFor, useStageBackdrop } from '../stage/useStageBackdrop';
import { useTextMeasure } from '../utils/useFontsVersion';
import { HomeScene } from './HomeScene';
import type { StartupDeps } from './startup/startupDeps';
import { useBoot } from './startup/useBoot';

interface AppProps {
    /** 開 app 載入嘅三項（瀏覽器：main.tsx 用 createBrowserStartup()；測試用假嘅） */
    startup: StartupDeps;
    /** PWA 更新（瀏覽器：main.tsx 用 startBrowserUpdates()；冇 = 永遠冇新版） */
    updates?: UpdatePort;
}

/**
 * 舞台 + 場景：Preload（旗幟、真實載入進度，T-034）→ 主頁。Preload 淡出期間主頁已經喺下面。
 * 歌單、轉碟、歌書、MV 喺之後嘅任務加畫面。
 * PWA（T-039）：播緊歌／MV 時有新版出更新提示；手機打橫用「請打直」蓋住舞台。
 */
export const App = ({ startup, updates = NO_UPDATES }: AppProps) => {
    const { home, preload } = useBoot(startup);
    // 字體載入完會換新嘅量字函數，左上資訊用真字體重新 fit（W-017）
    const measure = useTextMeasure();
    // 旗未完全淡走之前，安全區外面都保持旗嘅黑底
    useStageBackdrop(backdropFor(preload.exit === 'gone' ? home.stage.scene : 'preload'));
    const landscape = usePhoneLandscape();
    const { view, handlers } = home;
    const playing = blocksUpdate(home.playback, view?.mvOpen ?? false);
    return (
        <>
            <Stage covered={landscape}>
                {home.stage.scene !== 'preload' && view && handlers ? (
                    <HomeScene view={view} handlers={handlers} measure={measure} />
                ) : null}
                {preload.exit === 'gone' ? null : <PreloadScreen status={preload} />}
            </Stage>
            {/* 打橫時提示照樣跟住播放狀態，只係唔顯示（唔好蓋住「請打直」） */}
            <UpdatePrompt port={updates} playing={playing} covered={landscape} />
            {landscape ? <RotateNotice /> : null}
        </>
    );
};
