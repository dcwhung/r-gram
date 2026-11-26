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

describe('UpdateManager: a new version is waiting', () => {
    it('should apply it at once while nothing is playing (Functional Spec D14)', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should reload once the new service worker takes control', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        manager.handleControllerChange();
        manager.handleNeedReload();
        expect(deps.reload).toHaveBeenCalledTimes(1);
        expect(deps.guard.mark).toHaveBeenCalledTimes(1);
    });

    it('should wait while music or an MV is playing and apply when it stops', () => {
        const { deps, manager } = setup();
        manager.setPlaying(true);
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).not.toHaveBeenCalled();
        manager.setPlaying(false);
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should wait for the finger to lift during a gesture', () => {
        const { deps, manager } = setup();
        manager.setGesturing(true);
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).not.toHaveBeenCalled();
        manager.setGesturing(false);
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should report "waiting" only while the update is held back by playback', () => {
        const { manager, listener } = setup();
        expect(manager.getSnapshot()).toBe('none');
        manager.setPlaying(true);
        manager.handleNeedRefresh();
        expect(manager.getSnapshot()).toBe('waiting');
        expect(listener).toHaveBeenCalledTimes(1);
        manager.setPlaying(false);
        expect(manager.getSnapshot()).toBe('none');
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should not report "waiting" for a short gesture', () => {
        const { manager } = setup();
        manager.setGesturing(true);
        manager.handleNeedRefresh();
        expect(manager.getSnapshot()).toBe('none');
    });

    it('should apply and reload during playback when the listener asks for it', () => {
        const { deps, manager } = setup();
        manager.setPlaying(true);
        manager.handleNeedRefresh();
        manager.applyNow();
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
        manager.handleControllerChange();
        expect(deps.reload).toHaveBeenCalledTimes(1);
    });

    it('should ignore a second "need refresh" after the update was applied', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        manager.handleNeedRefresh();
        expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should do nothing on "apply now" when no update is waiting', () => {
        const { deps, manager } = setup();
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

    it('should not reload when the guard sees a reload loop', () => {
        const { deps, manager, blockReloads } = setup();
        blockReloads();
        manager.handleNeedRefresh();
        manager.handleControllerChange();
        expect(deps.reload).not.toHaveBeenCalled();
    });

    it('should hold a takeover by another tab until playback stops', () => {
        const { deps, manager } = setup();
        manager.setPlaying(true);
        manager.handleControllerChange();
        expect(deps.reload).not.toHaveBeenCalled();
        expect(manager.getSnapshot()).toBe('waiting');
        manager.setPlaying(false);
        expect(deps.reload).toHaveBeenCalledTimes(1);
        expect(deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should hold the reload if playback started between applying and the takeover', () => {
        const { deps, manager } = setup();
        manager.handleNeedRefresh();
        manager.setPlaying(true);
        manager.handleControllerChange();
        expect(deps.reload).not.toHaveBeenCalled();
        manager.setPlaying(false);
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
        manager.setPlaying(true);
        manager.handleNeedRefresh();
        expect(listener).not.toHaveBeenCalled();
    });
});
