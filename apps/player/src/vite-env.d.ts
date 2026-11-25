/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Worker 嘅 `catalog.json` 網址（Technical Spec「播放端 build 變數」）；冇設定就只用本機副本 */
    readonly VITE_CATALOG_URL?: string;
}

/** build 時由 vite.config.ts 注入：`apps/player/package.json` 嘅 version */
declare const __APP_VERSION__: string;
