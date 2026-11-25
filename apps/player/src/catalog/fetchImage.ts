/*
 * 攞一張 catalog 圖片入 cache（Preload 預載封面、背景攞另一張封面）。結果唔使用：只係令佢經 Service Worker
 * 嘅執行期 cache（同 HTTP cache）留低。
 * 用 cors（backlog B-071 ②）：圖片 route 對播放端 origin 回 CORS header，攞到嘅係普通回應；
 * no-cors 嘅 opaque 回應 Workbox 預設唔 cache，離線就冇圖。
 */

/** 攞到（2xx 而且成個 body 讀完）= true；網絡錯、HTTP 錯、讀到一半斷咗、被 abort = false。永遠唔 reject */
export const fetchImage = async (url: string, signal?: AbortSignal): Promise<boolean> => {
    try {
        const response = await globalThis.fetch(url, { mode: 'cors', signal });
        if (!response.ok) return false;
        // 讀完個 body：cache 先會有完整嘅一份
        await response.arrayBuffer();
        return true;
    } catch {
        return false;
    }
};
