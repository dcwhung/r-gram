import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createBrowserStartup } from './app/startup/startupDeps';
import { createMvController } from './mv/mvController';
import { createVideoEngine } from './mv/videoEngine';
import { createAudioEngine } from './playback/audioEngine';
import { createMediaSession } from './playback/mediaSession';
import { createPlaybackController } from './playback/playbackController';
import { createSessionTargets } from './playback/sessionTargets';
import { startBrowserUpdates } from './pwa/registerUpdates';
import { readSessionStorage } from './pwa/reloadGuard';
import './styles/global.css';
// 獨立 import（唔經 global.css 嘅 @import）：vite.config.ts 要喺呢個檔換入 VITE_FONT_URL
import './styles/fonts.css';

// PWA 更新（T-039）：要喺 module 一開始同步做，controllerchange listener 先趕得切喺 SW 狀態變之前
const updates = startBrowserUpdates({
    window,
    document,
    navigator,
    reload: () => window.location.reload(),
    storage: readSessionStorage(),
});

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// 開 app 載入嘅 IO 只砌一次：App 嘅 effect 靠佢唔變先唔會重覆載入
const startup = createBrowserStartup();

// 鎖屏得一個：唱片同 MV 電視輪流用（電視開住時係 MV，收埋轉返唱片；T-060）
const sessions = createSessionTargets(createMediaSession());

// 播放（T-038）：成個 app 一個 `<audio>`、一個 controller，喺 React 外面（unmount 都唔會換 element）
const playback = createPlaybackController({
    engine: createAudioEngine(),
    session: sessions.record,
});

// MV 電視（T-060）：成個 app 一個 `<video>`（Web Audio 每個 element 只可以接一次）
const mv = createMvController({ engine: createVideoEngine(), sessions });

createRoot(root).render(
    <StrictMode>
        <App startup={startup} playback={playback} updates={updates} mv={mv} />
    </StrictMode>,
);
