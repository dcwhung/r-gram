import type { ReloadGuard } from './reloadGuard';

/*
 * PWA 更新（T-039；Functional Spec US-011、D14；Technical Spec 實現注意事項 12）。移植自 903-player 嘅 updateManager，
 * 規則跟 R Gram 嘅 spec：新 Service Worker 喺 waiting 等；播放狀態係 idle / paused（而且冇開 MV）先 SKIP_WAITING
 * → controllerchange → reload 一次。另外手指㩒住畫面（轉旋鈕、拖歌單）期間都等放手先換。
 * 播緊時有新版：唔 reload，出細提示（UpdatePrompt）；聽眾自己㩒「立即更新」先即刻換，否則等停咗自動換。
 * 所有副作用（SW、時間、reload）由外面注入，方便測試。
 */

/** 兩次檢查之間最少隔幾耐（開 app 同返回前景好近，唔使撞兩次） */
export const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

/** `waiting`：有新版，但因為播緊歌／MV 等緊（畫面出提示） */
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
    /** 已經發咗 SKIP_WAITING */
    private applied = false;
    /** 聽眾㩒咗「立即更新」：唔再等播放停 */
    private forced = false;
    private reloaded = false;
    private playing = false;
    private gesturing = false;
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

    /** 新 SW 已經接管：自己 apply 而仲可以換就即刻 reload；否則等（播緊、手指㩒住、另一個分頁換咗版） */
    handleNeedReload = (): void => {
        if (this.applied && this.canApply()) {
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

    /** 播緊歌或者開住 MV（App 由播放狀態計，pwa/playbackActivity.ts） */
    setPlaying = (playing: boolean): void => {
        this.playing = playing;
        this.evaluate();
    };

    setGesturing = (gesturing: boolean): void => {
        this.gesturing = gesturing;
        this.evaluate();
    };

    /** 更新提示嘅「立即更新」：聽眾自己揀打斷播放 */
    applyNow = (): void => {
        if (this.pending === undefined) return;
        this.forced = true;
        this.evaluate();
    };

    private canApply(): boolean {
        return this.forced || (!this.playing && !this.gesturing);
    }

    private evaluate(): void {
        if (this.pending !== undefined && this.canApply()) this.apply();
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
     * 「立即更新」只算今次（W-049）：防 loop 擋咗就還原，新版當已接管但未 reload，照規則等（播緊出提示）
     */
    private reloadOnce(): void {
        if (this.reloaded) return;
        this.forced = false;
        if (!this.deps.guard.allow()) {
            this.applied = false;
            this.pending = 'reload';
            this.publish();
            return;
        }
        this.reloaded = true;
        this.deps.guard.mark();
        this.deps.reload();
    }

    /** 只有播放擋住先出提示：手指㩒住係一陣間嘅事，唔使閃一下提示 */
    private publish(): void {
        const next: UpdateStatus = this.pending !== undefined && this.playing ? 'waiting' : 'none';
        if (next === this.status) return;
        this.status = next;
        this.listeners.forEach((listener) => listener());
    }
}
