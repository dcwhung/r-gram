import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import type { UpdateStatus } from '../pwa/updateManager';
import type { UpdatePort } from '../pwa/useUpdates';
import { App } from './App';
import { testPlayback } from '../playback/testing/testPlayback';
import type { StartupDeps } from './startup/startupDeps';

/** T-039、T-109：App 同 PWA 規則（版本掣、「請打直」）嘅接駁；其他主頁行為見 App.test.tsx */
const startup: StartupDeps = {
    loadCatalog: () =>
        Promise.resolve({ status: 'ready', source: 'network', document: sampleDocument() }),
    loadFonts: () => Promise.resolve(),
    loadImage: () => Promise.resolve(true),
};

/** 版本掣嘅無障礙名（T-109） */
const APPLY = '已有新版本，立即更新並重新載入';

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
        endLaunch: vi.fn(),
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
    render(<App playback={testPlayback()} startup={startup} updates={port} />);
    await screen.findByRole('button', { name: '開啟歌單' });
};

describe('App and the update manager', () => {
    beforeEach(() => {
        stubMedia();
        setViewport(393, 852);
    });

    // S-197：Preload 期間先會自動換版；主頁一出就話畀 UpdateManager 知（之後只出提示）
    it('should tell the update manager when start-up is over', async () => {
        const { port } = fakePort();
        render(<App playback={testPlayback()} startup={startup} updates={port} />);
        expect(port.endLaunch).not.toHaveBeenCalled();
        await screen.findByRole('button', { name: '開啟歌單' });
        // W-059：主頁一出 DOM 就會返，useLaunchEnd 嘅 effect 未必已經跑：等佢
        await waitFor(() => expect(port.endLaunch).toHaveBeenCalled());
    });

    // D95：Preload 期間（連旗淡出中）永遠唔出版本掣，亦唔通知
    it('should never show the update button or notice during Preload', async () => {
        const { port, set } = fakePort();
        const pending: StartupDeps = { ...startup, loadCatalog: () => new Promise(() => {}) };
        render(<App playback={testPlayback()} startup={pending} updates={port} />);
        set('waiting');
        await act(() => Promise.resolve());
        expect(screen.queryByRole('button', { name: APPLY })).toBeNull();
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    // S-197：播緊歌都好、停咗都好，有新版就出提示；T-109：提示 = 右上版本號變成掣
    it('should turn the version text into the update button while a song plays', async () => {
        const { port, set } = fakePort();
        await renderHome(port);
        await userEvent.click(screen.getByRole('button', { name: '開啟歌單' }));
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        set('waiting');
        expect(screen.getByRole('button', { name: APPLY })).toHaveTextContent(/^v\d+\.\d+\.\d+$/);
    });

    it('should apply the update right away when the button is pressed', async () => {
        const { port, set } = fakePort();
        await renderHome(port);
        set('waiting');
        await userEvent.click(screen.getByRole('button', { name: APPLY }));
        expect(port.applyNow).toHaveBeenCalledTimes(1);
    });

    // 冇另外一粒提示：只有讀屏聽到嘅 live region 講有新版本
    it('should announce the waiting update to screen readers only', async () => {
        const { port, set } = fakePort();
        await renderHome(port);
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        set('waiting');
        expect(screen.getByRole('status')).toHaveTextContent('已有新版本');
        expect(screen.getByRole('status')).toHaveClass('visually-hidden');
        expect(screen.getByTestId('stage')).not.toContainElement(screen.getByRole('status'));
    });

    // 粒掣喺暗層下面（設計稿第 20 版）：歌單開住時 Tab 唔到、㩒唔到
    it('should keep the update button out of reach while the list is open', async () => {
        const { port, set } = fakePort();
        await renderHome(port);
        await userEvent.click(screen.getByRole('button', { name: '開啟歌單' }));
        set('waiting');
        expect(screen.queryByRole('button', { name: APPLY })).toBeNull();
        const button = screen.getByTestId('stage').querySelector('[data-part="update-button"]');
        expect(button).not.toHaveAttribute('tabindex');
        // W-058：版本號照畀讀屏讀（D95 🅰️ ①）
        expect(button).toHaveTextContent(/^v\d+\.\d+\.\d+$/);
        expect(button?.closest('[aria-hidden="true"]')).toBeNull();
    });

    it('should run without an update manager (tests, browsers without service workers)', async () => {
        render(<App playback={testPlayback()} startup={startup} />);
        await screen.findByRole('button', { name: '開啟歌單' });
        expect(screen.queryByRole('button', { name: APPLY })).toBeNull();
        expect(screen.getByTestId('stage').querySelector('[data-part="version"]')).toBeTruthy();
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

    it('should not show the update button over the rotate notice', async () => {
        setViewport(852, 393);
        const { port, set } = fakePort();
        render(<App playback={testPlayback()} startup={startup} updates={port} />);
        await screen.findByRole('alert');
        set('waiting');
        expect(screen.queryByRole('button', { name: APPLY })).toBeNull();
    });

    // S-221（mutant M20）：打橫時唔通知（唔好打斷「請打直」）；打返直先講
    it('should keep the screen-reader notice quiet while the phone is sideways', async () => {
        setViewport(393, 852);
        const { port, set } = fakePort();
        await renderHome(port);
        const turn = (width: number, height: number) =>
            act(() => {
                setViewport(width, height);
                window.dispatchEvent(new Event('resize'));
            });
        turn(852, 393);
        set('waiting');
        expect(screen.getByRole('alert')).toHaveTextContent('請將裝置轉為直向');
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        turn(393, 852);
        expect(screen.getByRole('status')).toHaveTextContent('已有新版本');
    });
});
