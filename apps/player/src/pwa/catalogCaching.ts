/** 未實作（TDD 紅燈） */
export const catalogCaching = (): {
    urlPattern: RegExp;
    handler: string;
    options: {
        cacheName: string;
        expiration: { maxEntries: number };
        cacheableResponse: unknown;
        matchOptions: unknown;
    };
}[] => [];
