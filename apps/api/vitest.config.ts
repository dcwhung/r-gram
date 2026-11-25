import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/**
 * test 用嘅 vars + secret：全部喺呢度定，唔靠 wrangler.toml 嘅值
 *（用戶填咗真 client id / 真 email 之後 test 照跑；真 secret 唔入 repo，production 用 wrangler secret put）
 */
const TEST_BINDINGS = {
    GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    SESSION_SECRET: 'test-session-secret-0123456789abcdef',
    ADMIN_EMAILS: 'admin@example.com',
    PLAYER_ORIGINS: 'https://player.example.com',
    WORKER_ORIGIN: 'https://api.example.com',
    MEDIA_BASE: 'https://media.example.com/',
};

// Worker code 喺 workerd（miniflare）入面跑：D1 / R2 都係本機模擬，每個 test 檔獨立 storage
export default defineConfig(async () => {
    const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname);
    return {
        plugins: [
            cloudflareTest({
                wrangler: { configPath: './wrangler.toml' },
                miniflare: { bindings: { ...TEST_BINDINGS, TEST_MIGRATIONS: migrations } },
            }),
        ],
        test: {
            name: '@r-gram/api',
            globals: true,
            include: ['test/**/*.test.ts'],
            setupFiles: ['./test/applyMigrations.ts'],
        },
    };
});
