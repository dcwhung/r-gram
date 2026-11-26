import { UPDATE_CHECK_THROTTLE_MS, UpdateManager, type UpdateManagerDeps } from './updateManager';

/** 假嘅 registration、時間同 reload 防 loop：全部由測試控制 */
const setup = (overrides: Partial<UpdateManagerDeps> = {}) => {
    let time = 0;
    let reloadAllowed = true;
    const deps = {
        checkForUpdate: vi.fn(() => Promise.resolve()),
        applyUpdate: vi.fn(),
        reload: vi.fn(),
        now: () => time,
        isOnline: () => true,
        guard: { allow: () => reloadAllowed, mark: vi.fn() },
        controlledAtLoad: true,
        ...overrides,
    } satisfies UpdateManagerDeps;
    const manager = new UpdateManager(deps);
    const listener = vi.fn();
    manager.subscribe(listener);
    return {
        deps,
        manager,
        listener,
        advance: (ms: number) => {
            time += ms;
        },
        blockReloads: () => {
            reloadAllowed = false;
        },
        allowReloads: () => {
            reloadAllowed = true;
        },
    };
};

describe('UpdateManager.checkNow', () => {
    it('should ask the registration for a new version', () => {
        const { deps, manager } = setup();
        manager.checkNow();
        expect(deps.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('should not check twice inside the throttle window', () => {
        const { deps, manager, advance } = setup();
        manager.checkNow();
        advance(UPDATE_CHECK_THROTTLE_MS - 1);
        manager.checkNow();
        expect(deps.checkForUpdate).toHaveBeenCalledTimes(1);
        advance(1);
        manager.checkNow();
        expect(deps.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('should not check while offline', () => {
        const { deps, manager } = setup({ isOnline: () => false });
        manager.checkNow();
        expect(deps.checkForUpdate).not.toHaveBeenCalled();
    });

    it('should swallow a failed check so the next one can run', async () => {
        const failing = vi.fn(() => Promise.reject(new Error('offline')));
        const { manager } = setup({ checkForUpdate: failing });
        expect(() => manager.checkNow()).not.toThrow();
        await expect(failing.mock.results[0]?.value).rejects.toThrow('offline');
    });
});

/*
 * S-197（用戶決定 B-084 ④）：新版只喺開 app 時（Preload 期間）自動換、reload 一次；用緊 app 時唔會自己 reload，
 * 有新版就出「已有新版本／立即更新」，由聽眾揀
 */
describe('UpdateManager: during start-up', () => {
    it('should activate a version found waiting and reload once it takes control', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
        manager.handleControllerChange();
        manager.handleNeedReload();
        expect(deps.reload).toHaveBeenCalledTimes(1);
        expect(deps.guard.mark).toHaveBeenCalledTimes(1);
    });

    it('should reload when another tab already activated a new version', () => {
        const { deps, manager } = setup();
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
        expect(deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should not show the prompt over the start-up screen', () => {
        const { manager, blockReloads } = setup();
        blockReloads();
        manager.handleNeedRefresh();
        expect(manager.getSnapshot()).toBe('none');
    });

    // 防 loop：啱啱 reload 過（例如部署壞咗）就唔自動換，開完 app 出提示
    it('should leave the version waiting when the loop guard saw a reload just now', () => {
        const { deps, manager, listener, blockReloads } = setup();
        blockReloads();
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).not.toHaveBeenCalled();
        manager.endLaunch();
        expect(manager.getSnapshot()).toBe('waiting');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should still reload for a version it activated just before start-up ended', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        manager.endLaunch();
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    it('should ignore a second "need refresh" after the update was applied', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    });
});

describe('UpdateManager: while the app is in use', () => {
    const inUse = (overrides: Partial<UpdateManagerDeps> = {}) => {
        const context = setup(overrides);
        context.manager.endLaunch();
        return context;
    };

    it('should never activate a waiting version on its own, and show the prompt', () => {
        const { deps, manager, listener } = inUse();
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).not.toHaveBeenCalled();
        expect(deps.reload).not.toHaveBeenCalled();
        expect(manager.getSnapshot()).toBe('waiting');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should not reload on its own when another tab activated a new version', () => {
        const { deps, manager } = inUse();
        manager.handleControllerChange();
        manager.handleNeedReload();
        expect(deps.reload).not.toHaveBeenCalled();
        expect(manager.getSnapshot()).toBe('waiting');
    });

    it('should activate and reload when the listener presses "update now"', () => {
        const { deps, manager } = inUse();
        manager.handleNeedRefresh();
        manager.applyNow();
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
        expect(deps.guard.mark).toHaveBeenCalledTimes(1);
    });

    it('should reload at once on "update now" after another tab took over', () => {
        const { deps, manager } = inUse();
        manager.handleControllerChange();
        manager.applyNow();
        expect(deps.reload).toHaveBeenCalledTimes(1);
        expect(deps.applyUpdate).not.toHaveBeenCalled();
    });

    // 聽眾自己揀嘅 reload 唔係 loop：防 loop 只管自動嗰次（W-049：「立即更新」只算今次，之後唔會自動 reload）
    it('should reload on "update now" even inside the loop window', () => {
        const { deps, manager, blockReloads } = inUse();
        blockReloads();
        manager.handleNeedRefresh();
        manager.applyNow();
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    it('should do nothing on "update now" when no update is waiting', () => {
        const { deps, manager } = inUse();
        manager.applyNow();
        expect(deps.applyUpdate).not.toHaveBeenCalled();
        expect(deps.reload).not.toHaveBeenCalled();
    });
});

describe('UpdateManager: reloading', () => {
    it('should reload only once even when several takeover events arrive', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        manager.handleControllerChange();
        manager.handleNeedReload();
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    // W-049：自動 reload 被防 loop 擋咗：還原做「等緊」，開完 app 出提示；之後唔會自己 reload
    it('should fall back to the prompt when the loop guard blocks the reload', () => {
        const { deps, manager, blockReloads, allowReloads } = setup();
        manager.handleNeedRefresh();
        blockReloads();
        manager.handleControllerChange();
        expect(deps.reload).not.toHaveBeenCalled();
        manager.endLaunch();
        allowReloads();
        manager.handleControllerChange();
        expect(deps.reload).not.toHaveBeenCalled();
        expect(manager.getSnapshot()).toBe('waiting');
        manager.applyNow();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    it('should treat the first takeover of a first install as no update', () => {
        const { deps, manager } = setup({ controlledAtLoad: false });
        manager.handleControllerChange();
        expect(deps.reload).not.toHaveBeenCalled();
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    it('should treat the first takeover as an update after a hard reload', () => {
        const { deps, manager } = setup({ controlledAtLoad: false });
        manager.markControlled();
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    it('should stop notifying a listener that unsubscribed', () => {
        const { manager } = setup();
        const listener = vi.fn();
        const unsubscribe = manager.subscribe(listener);
        unsubscribe();
        manager.endLaunch();
        manager.handleNeedRefresh();
        expect(listener).not.toHaveBeenCalled();
    });
});
