/*
 * 測試用嘅假 `document.fonts`（jsdom 冇 FontFaceSet）：自己話幾時 ready、幾時有字體載入完。
 */
export interface FakeFonts {
    /** 令 `document.fonts.ready` resolve */
    resolveReady: () => Promise<void>;
    /** 出一個 `loadingdone` 事件（又有字體載入完） */
    finishLoading: () => void;
    /** 仲有幾多個 `loadingdone` listener */
    listenerCount: () => number;
}

export const installFakeFonts = (): FakeFonts => {
    const target = new EventTarget();
    const listeners = new Set<EventListenerOrEventListenerObject>();
    let resolve: () => void = () => {};
    const ready = new Promise<void>((done) => {
        resolve = done;
    });
    const fonts = {
        ready,
        addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
            listeners.add(listener);
            target.addEventListener(type, listener);
        },
        removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
            listeners.delete(listener);
            target.removeEventListener(type, listener);
        },
    };
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    return {
        resolveReady: async () => {
            resolve();
            await ready;
        },
        finishLoading: () => target.dispatchEvent(new Event('loadingdone')),
        listenerCount: () => listeners.size,
    };
};

export const removeFakeFonts = () => {
    Reflect.deleteProperty(document, 'fonts');
};
