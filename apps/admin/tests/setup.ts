import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// jsdom 冇 canvas：getContext 一律 null（要畫嘢嘅測試自己畀假嘅），唔好每個 test 印「Not implemented」
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
});
