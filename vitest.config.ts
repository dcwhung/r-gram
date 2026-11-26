import { defineConfig } from 'vitest/config';

// root `npm test` 一次過跑晒所有 workspace；每個 project 用返自己嘅 config。
// 加 app 時喺 projects 加一行（apps/player、apps/admin：jsdom；apps/api：workerd）
export default defineConfig({
    test: {
        projects: [
            'apps/player',
            'packages/catalog',
            'apps/api',
            // repo 根 scripts/（CI 用嘅 shell script）：喺 Node 入面對臨時 git repo 真係跑一次
            {
                test: {
                    name: '@r-gram/repo-scripts',
                    environment: 'node',
                    include: ['scripts/**/*.test.mjs'],
                },
            },
        ],
        // projects 模式下 coverage 只認 root 設定；冇 --project 時 include / exclude 相對 repo 根
        coverage: {
            provider: 'v8',
            include: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
            // src/spike：真機測試頁（T-010，用完即棄）唔計入覆蓋率，免得拉低產品嘅數字；佢嘅測試照跑
            exclude: [
                '**/src/main.tsx',
                '**/*.test.{ts,tsx}',
                '**/*.d.ts',
                '**/src/index.ts',
                '**/src/spike/**',
            ],
            thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
        },
    },
});
