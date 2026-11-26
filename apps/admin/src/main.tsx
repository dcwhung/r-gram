import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAdminApi } from './api/adminApi';
import { App } from './app/App';
import { createPrepareCover } from './app/prepareCover';
import './styles/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// 依賴只砌一次：hook 嘅 effect 靠佢唔變先唔會重覆讀
const api = createAdminApi();
const syncDeps = { api, prepareCover: createPrepareCover() };

createRoot(root).render(
    <StrictMode>
        <App api={api} syncDeps={syncDeps} />
    </StrictMode>,
);
