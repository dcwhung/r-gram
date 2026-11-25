import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
// 獨立 import（唔經 global.css 嘅 @import）：vite.config.ts 要喺呢個檔換入 VITE_FONT_URL
import './styles/fonts.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
