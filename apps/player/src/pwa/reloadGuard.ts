import { UPDATE_RELOAD_STORAGE_KEY } from '../config/storageKeys';

/*
 * 新版 reload 防 loop（Technical Spec 實現注意事項 12：「reload 一次（sessionStorage 防 loop）」）。
 * 記憶體入面嘅「只 reload 一次」擋唔到 reload 之後新頁面又再 reload（例如部署壞咗、sw.js 每次都唔同）；
 * 所以喺 sessionStorage 記低時間：同一個分頁短時間內第二次就唔 reload，新版下次開 app 先用。
 */

/** 兩次因為新版而 reload 最少隔幾耐 */
export const RELOAD_LOOP_WINDOW_MS = 30 * 1000;

export interface ReloadGuard {
    /** 而家 reload 會唔會變成 loop */
    allow: () => boolean;
    /** 就嚟 reload：記低時間 */
    mark: () => void;
}

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>;

/** 讀唔到（私人瀏覽、封鎖咗網站資料）就當冇記錄：寧願 reload 一次，都唔好卡住舊版 */
const lastReloadAt = (storage: SessionStore | undefined): number => {
    try {
        return Number(storage?.getItem(UPDATE_RELOAD_STORAGE_KEY) ?? Number.NaN);
    } catch {
        return Number.NaN;
    }
};

export const createReloadGuard = (
    storage: SessionStore | undefined,
    now: () => number,
): ReloadGuard => ({
    allow: () => {
        const elapsed = now() - lastReloadAt(storage);
        // 時間喺將來或者記錄壞咗（NaN）都當冇記錄
        return !(elapsed >= 0 && elapsed < RELOAD_LOOP_WINDOW_MS);
    },
    mark: () => {
        try {
            storage?.setItem(UPDATE_RELOAD_STORAGE_KEY, String(now()));
        } catch {
            // 寫唔到就算：最多少咗防 loop，唔阻 reload
        }
    },
});

/** `window.sessionStorage` 本身都可能 throw（封鎖咗網站資料）：攞唔到就冇防 loop */
export const readSessionStorage = (): SessionStore | undefined => {
    try {
        return window.sessionStorage;
    } catch {
        return undefined;
    }
};
