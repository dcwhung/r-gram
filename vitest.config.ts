import { defineConfig } from 'vitest/config';

// root `npm test` 一次過跑晒所有 workspace；每個 project 用返自己嘅 config。
// 加 app 時喺 projects 加一行（apps/player、apps/admin：jsdom；apps/api：workerd）
export default defineConfig({
    test: {
        projects: ['packages/catalog'],
        // projects 模式下 coverage 只認 root 設定；include / exclude 相對各 project root
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/main.tsx', '**/*.test.{ts,tsx}', '**/*.d.ts', 'src/**/index.ts'],
        },
    },
});
