import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createBrowserStartup } from './app/startup/startupDeps';
import './styles/global.css';
// 獨立 import（唔經 global.css 嘅 @import）：vite.config.ts 要喺呢個檔換入 VITE_FONT_URL
import './styles/fonts.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// 開 app 載入嘅 IO 只砌一次：App 嘅 effect 靠佢唔變先唔會重覆載入
const startup = createBrowserStartup();

createRoot(root).render(
    <StrictMode>
        <App startup={startup} />
    </StrictMode>,
);
