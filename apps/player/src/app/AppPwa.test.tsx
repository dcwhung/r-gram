import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import type { UpdateStatus } from '../pwa/updateManager';
import type { UpdatePort } from '../pwa/useUpdates';
import { App } from './App';
import type { StartupDeps } from './startup/startupDeps';

/** T-039：App 同 PWA 規則（更新提示、「請打直」）嘅接駁；其他主頁行為見 App.test.tsx */
const startup: StartupDeps = {
    loadCatalog: () =>
        Promise.resolve({ status: 'ready', source: 'network', document: sampleDocument() }),
    loadFonts: () => Promise.resolve(),
    loadImage: () => Promise.resolve(true),
};

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

/** 減少動態效果（Preload 即時拆走）+ 主要輸入係手指 */
const stubMedia = () =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => Object.assign(new EventTarget(), { matches: true })),
    );

const fakePort = () => {
    let status: UpdateStatus = 'none';
    const listeners = new Set<() => void>();
    const port: UpdatePort = {
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSnapshot: () => status,
        setPlaying: vi.fn(),
        applyNow: vi.fn(),
    };
    const set = (next: UpdateStatus) =>
        act(() => {
            status = next;
            listeners.forEach((listener) => listener());
        });
    return { port, set };
};

const renderHome = async (port: UpdatePort) => {
    render(<App startup={startup} updates={port} />);
    await screen.findByRole('button', { name: '開啟歌單' });
};

describe('App and the update manager', () => {
    beforeEach(() => {
        stubMedia();
        setViewport(393, 852);
    });

    it('should tell the update manager when a song starts and stops playing', async () => {
        const { port } = fakePort();
        await renderHome(port);
        expect(port.setPlaying).toHaveBeenLastCalledWith(false);
        await userEvent.click(screen.getByRole('button', { name: '開啟歌單' }));
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(port.setPlaying).toHaveBeenLastCalledWith(true);
        await userEvent.click(screen.getByRole('button', { name: '暫停' }));
        expect(port.setPlaying).toHaveBeenLastCalledWith(false);
    });

    it('should show the update prompt while an update waits', async () => {
        const { port, set } = fakePort();
        await renderHome(port);
        set('waiting');
        expect(screen.getByRole('status')).toHaveTextContent('已有新版本');
    });

    it('should run without an update manager (tests, browsers without service workers)', async () => {
        render(<App startup={startup} />);
        await screen.findByRole('button', { name: '開啟歌單' });
        expect(screen.queryByRole('button', { name: '立即更新並重新載入' })).toBeNull();
    });
});

describe('App on a phone turned sideways', () => {
    beforeEach(() => stubMedia());

    it('should cover the stage with the rotate notice and hide the stage from assistive technology', async () => {
        setViewport(393, 852);
        const { port } = fakePort();
        await renderHome(port);
        act(() => {
            setViewport(852, 393);
            window.dispatchEvent(new Event('resize'));
        });
        expect(screen.getByRole('alert')).toHaveTextContent('請將裝置轉為直向');
        expect(screen.getByTestId('stage')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.queryByRole('button', { name: '開啟歌單' })).toBeNull();
    });

    it('should not show the update prompt over the rotate notice', async () => {
        setViewport(852, 393);
        const { port, set } = fakePort();
        render(<App startup={startup} updates={port} />);
        await screen.findByRole('alert');
        set('waiting');
        expect(screen.queryByRole('button', { name: '立即更新並重新載入' })).toBeNull();
    });
});
