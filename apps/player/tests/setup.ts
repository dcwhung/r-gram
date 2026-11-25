import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// jsdom 冇 canvas：getContext 會喺 console 報「Not implemented」。當瀏覽器畀唔到 2D context（元件要識處理），
// 要畫嘢嘅測試自己 spy 一個假 context
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = (() =>
        null) as typeof HTMLCanvasElement.prototype.getContext;
}

// 測試唔准真係上網：預設一律失敗，要用就自己 mock
beforeEach(() => {
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('network disabled in tests'))),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    globalThis.localStorage?.clear();
});
