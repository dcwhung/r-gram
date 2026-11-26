import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/*
 * 管理端（T-116：同步頁）。正式：Worker 以 static assets 出 `dist/`（apps/api/wrangler.toml `[assets]`），同 API 同源。
 * 本機改 UI（可選）：`npm run dev -w apps/api`（https://localhost:8787）+ `npm run dev -w apps/admin`（http://localhost:5174）。
 * /api、/auth、/catalog 轉去 wrangler dev；Worker 嘅 same-origin 守門要 Origin = WORKER_ORIGIN，所以 proxy 改寫 Origin。
 * 登入：先喺 https://localhost:8787 登入（cookie 唔分 port）
 */
const WORKER_DEV_ORIGIN = process.env.ADMIN_API_ORIGIN ?? 'https://localhost:8787';
const DEV_PORT = 5174;
const PROXIED_PATHS = ['/api', '/auth', '/catalog'];

interface ProxyRequest {
    getHeader: (name: string) => unknown;
    setHeader: (name: string, value: string) => void;
}

const proxyEntry = {
    target: WORKER_DEV_ORIGIN,
    // wrangler dev --local-protocol https 用自簽 cert
    secure: false,
    configure: (proxy: { on: (event: 'proxyReq', fn: (req: ProxyRequest) => void) => void }) =>
        proxy.on('proxyReq', (req) => {
            if (req.getHeader('origin')) req.setHeader('origin', WORKER_DEV_ORIGIN);
        }),
};

export default defineConfig({
    plugins: [react()],
    server: {
        port: DEV_PORT,
        proxy: Object.fromEntries(PROXIED_PATHS.map((path) => [path, proxyEntry])),
    },
    test: {
        name: '@r-gram/admin',
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
