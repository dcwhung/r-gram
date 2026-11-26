import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 只用 design token 同字體（唔用 app 嘅 global.css：spike 頁要捲得）
import '../styles/tokens.css';
import '../styles/fonts.css';
import { SpikeApp } from './SpikeApp';
import './spike.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
    <StrictMode>
        <SpikeApp />
    </StrictMode>,
);
