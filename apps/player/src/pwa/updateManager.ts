import type { ReloadGuard } from './reloadGuard';

/*
 * PWA 更新（T-039；Functional Spec US-011、D14；Technical Spec 實現注意事項 12；用戶決定 S-197 / B-084 ④）。
 * 移植自 903-player 嘅 updateManager，規則跟 R Gram：
 * - 開 app（Preload 期間）搵到新版：即刻 SKIP_WAITING → controllerchange → reload 一次（sessionStorage 防 loop），
 *   聽眾未郁過任何嘢
 * - 用緊 app（Preload 之後）：唔會自己換、唔會自己 reload（播緊、暫停、閒置、返前景都一樣），只係出提示
 *（UpdatePrompt「已有新版本／立即更新」）；聽眾㩒「立即更新」先換
 * 所有副作用（SW、時間、reload）由外面注入，方便測試。
 */

/** 兩次檢查之間最少隔幾耐（開 app 同返回前景好近，唔使撞兩次） */
export const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

/** `waiting`：有新版等緊聽眾揀（畫面出提示） */
export type UpdateStatus = 'none' | 'waiting';

export interface UpdateManagerDeps {
    /** 即係 `registration.update()`：瀏覽器向自己 origin 重新攞 sw.js */
    checkForUpdate: () => Promise<unknown>;
    /** 叫 waiting 嘅 SW skipWaiting（vite-plugin-pwa 嘅 `updateSW(true)`） */
    applyUpdate: () => void;
    reload: () => void;
    /** 牆鐘時間（Date.now） */
    now: () => number;
    isOnline: () => boolean;
    guard: ReloadGuard;
    /** 頁面載入時已經有 SW controller：之後每次 controllerchange 都係換版 */
    controlledAtLoad: boolean;
}

export class UpdateManager {
    private lastCheckedAt = Number.NEGATIVE_INFINITY;
    /** refresh = 新 SW 喺 waiting；reload = 新 SW 已經接管（例如另一個分頁換咗） */
    private pending: 'refresh' | 'reload' | undefined;
    /** 已經發咗 SKIP_WAITING：接管之後要 reload */
    private applied = false;
    /** 聽眾㩒咗「立即更新」：自己揀嘅 reload，唔使防 loop */
    private chosen = false;
    private reloaded = false;
    /** 仲喺開 app（Preload）：呢段時間先會自動換版 */
    private launching = true;
    private hasSeenController: boolean;
    private status: UpdateStatus = 'none';
    private readonly listeners = new Set<() => void>();

    constructor(private readonly deps: UpdateManagerDeps) {
        this.hasSeenController = deps.controlledAtLoad;
    }

    /** `useSyncExternalStore` 用 */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): UpdateStatus => this.status;

    /** 離線唔查；限流避免短時間內重複攞 sw.js */
    checkNow = (): void => {
        const { now, isOnline, checkForUpdate } = this.deps;
        if (!isOnline() || now() - this.lastCheckedAt < UPDATE_CHECK_THROTTLE_MS) return;
        this.lastCheckedAt = now();
        // 網絡失敗唔緊要，下次再查
        checkForUpdate().catch(() => undefined);
    };

    /** 新版已經裝好喺 waiting */
    handleNeedRefresh = (): void => {
        if (this.applied) return;
        this.pending ??= 'refresh';
        this.evaluate();
    };

    /** 新 SW 已經接管：自己 apply 過就 reload；否則當新版等緊（開 app 時照自動換） */
    handleNeedReload = (): void => {
        if (this.applied) {
            this.reloadOnce();
            return;
        }
        this.pending = 'reload';
        this.evaluate();
    };

    /**
     * `navigator.serviceWorker` 嘅 controllerchange（registerUpdates.ts 自己聽，補 library 漏咗嘅情況）。
     * 見過 controller、自己 apply 過、或者已經知有新版 = 換版；第一次安裝 clientsClaim 接管嗰下唔使 reload
     */
    handleControllerChange = (): void => {
        const isUpdate = this.hasSeenController || this.applied || this.pending !== undefined;
        this.hasSeenController = true;
        if (isUpdate) this.handleNeedReload();
    };

    /** Shift-reload：頁面冇 controller 但 SW 一早 active，之後嘅第一下 controllerchange 就係換版 */
    markControlled = (): void => {
        this.hasSeenController = true;
    };

    /** Preload 完咗、聽眾開始用 app：之後只出提示，唔再自動換（App 叫） */
    endLaunch = (): void => {
        this.launching = false;
        this.publish();
    };

    /** 更新提示嘅「立即更新」：聽眾自己揀換版（會打斷播放） */
    applyNow = (): void => {
        if (this.pending === undefined) return;
        this.chosen = true;
        this.apply();
        this.publish();
    };

    /** 開 app 時自動換；啱啱因為新版 reload 過（防 loop）就唔換，留畀提示 */
    private evaluate(): void {
        if (this.pending !== undefined && this.launching && this.deps.guard.allow()) this.apply();
        this.publish();
    }

    private apply(): void {
        const action = this.pending;
        this.pending = undefined;
        if (action === 'reload') {
            this.reloadOnce();
            return;
        }
        this.applied = true;
        this.deps.applyUpdate();
    }

    /**
     * controllerchange 同 library 嘅 onNeedReload 會撞埋一齊：只 reload 一次。
     * 自動嗰次被防 loop 擋咗（W-049）：還原做「新版已接管、未 reload」，出提示等聽眾揀
     */
    private reloadOnce(): void {
        if (this.reloaded) return;
        if (!this.chosen && !this.deps.guard.allow()) {
            this.applied = false;
            this.pending = 'reload';
            this.publish();
            return;
        }
        this.reloaded = true;
        this.deps.guard.mark();
        this.deps.reload();
    }

    /** Preload 期間唔出提示（自動換緊，或者防 loop 擋住：開完 app 先出） */
    private publish(): void {
        const next: UpdateStatus =
            this.pending !== undefined && !this.launching ? 'waiting' : 'none';
        if (next === this.status) return;
        this.status = next;
        this.listeners.forEach((listener) => listener());
    }
}
