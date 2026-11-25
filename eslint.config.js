import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// 尺寸上限：.ts 函數 / .tsx component / .tsx 檔案行數（空行同註解都計）
const TS_FN_MAX_LINES = 30;
const TSX_FN_MAX_LINES = 50;
const TSX_FILE_MAX_LINES = 150;
const SIZE_LINES = { skipBlankLines: false, skipComments: false };

export default tseslint.config(
    // _mockups_、_design_：設計稿同原始檔，唔係 app code；.claude/**：agent worktree 各有 tsconfig
    {
        ignores: [
            '**/dist',
            '**/coverage',
            '**/.wrangler',
            '.claude/**',
            '_mockups_/**',
            '_design_/**',
        ],
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // 底線開頭嘅參數係刻意唔用
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        // .mjs / .js（script、設定檔）：淨係 js recommended，冇 type check；全部喺 Node 跑
        files: ['**/*.{mjs,js}'],
        extends: [js.configs.recommended],
        languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        // .ts：函數 ≤ 30 行
        files: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
        ignores: ['**/*.test.ts'],
        rules: {
            'max-lines-per-function': ['error', { max: TS_FN_MAX_LINES, ...SIZE_LINES }],
        },
    },
    {
        // .tsx 主要係 component：函數 ≤ 50 行，檔案 ≤ 150 行
        files: ['apps/*/src/**/*.tsx', 'packages/*/src/**/*.tsx'],
        ignores: ['**/*.test.tsx'],
        rules: {
            'max-lines-per-function': ['error', { max: TSX_FN_MAX_LINES, ...SIZE_LINES }],
            'max-lines': ['error', { max: TSX_FILE_MAX_LINES, ...SIZE_LINES }],
        },
    },
);
