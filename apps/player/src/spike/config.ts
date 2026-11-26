/*
 * T-010 spike 頁（用完即棄，唔入產品）嘅設定。媒體 bucket 網址只喺呢度寫一次
 *（同 apps/api/wrangler.toml 嘅 MEDIA_BASE 一樣，config.node.test.ts 鎖住）。
 * 本機試：`spike.html?media=http://127.0.0.1:<port>/` 換去假嘅媒體資料夾。
 */
export const DEFAULT_MEDIA_BASE = 'https://pub-fd99bea8c79a485b8a7eb3847cea696c.r2.dev/';
/** 測試碟 KOMOREBI（Implementation Plan 決定 14、U-1 ④） */
export const ALBUM_FOLDER = 'album-11-komorebi';
export const MEDIA_QUERY_PARAM = 'media';

/** ① 落針：唱臂開場之後幾耐先出聲（Technical Spec 實現注意事項 1） */
export const UNLOCK_DELAY_MS = 1500;
/** ② 「跳到結尾前」幾多秒 */
export const JUMP_BEFORE_END_S = 10;
/** ② 第一首自動跳去結尾前幾多秒：留時間畀用戶聽到聲之後鎖機 */
export const FIRST_JUMP_BEFORE_END_S = 25;
/** ② 連續播幾多首（第 1 首 + 自動下一首兩次） */
export const AUTO_NEXT_PLAYS = 3;
/** ⑤ 每次量度幾耐 */
export const FPS_SAMPLE_MS = 5000;
/** 偵測檔案時同時發幾多個請求（r2.dev 有速率限制） */
export const PROBE_CONCURRENCY = 4;

const WEB_PROTOCOLS = new Set(['http:', 'https:']);
/** `?media=` 淨係可以指去本機（S-224：放咗上網嘅頁唔可以俾人指去其他主機） */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/** 網址參數 `media` 係本機嘅 http(s) 就用佢（結尾補 `/`），否則用真 bucket */
export const mediaBaseFrom = (search: string): string => {
    const value = new URLSearchParams(search).get(MEDIA_QUERY_PARAM);
    if (!value) return DEFAULT_MEDIA_BASE;
    try {
        const { href, protocol, hostname } = new URL(value);
        if (!WEB_PROTOCOLS.has(protocol) || !LOOPBACK_HOSTS.has(hostname)) {
            return DEFAULT_MEDIA_BASE;
        }
        return href.endsWith('/') ? href : `${href}/`;
    } catch {
        return DEFAULT_MEDIA_BASE;
    }
};
