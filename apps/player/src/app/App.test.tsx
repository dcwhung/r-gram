import type { CatalogDocument } from '@r-gram/catalog';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import packageJson from '../../package.json';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import type { CatalogLoadResult } from '../catalog/loader';
import { MOTION } from '../config/motion';
import { installFakeFonts, removeFakeFonts } from '../utils/testing/fakeFonts';
import { App } from './App';
import { testPlayback } from '../playback/testing/testPlayback';
import type { MvController } from '../mv/mvController';
import { createTestMv } from '../mv/testing/testMv';
import type { StartupDeps } from './startup/startupDeps';

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

/** `apollo-18` 第 1 首有 MV */
const catalogWithMv = (): CatalogDocument => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

/** 開 app 嘅三項即刻完成（catalog 由網絡攞到） */
const instantStartup = (catalog: CatalogDocument): StartupDeps => ({
    loadCatalog: () => Promise.resolve({ status: 'ready', source: 'network', document: catalog }),
    loadFonts: () => Promise.resolve(),
    loadImage: () => Promise.resolve(true),
});

/** 行晒排緊嘅 promise 同 effect（每輪 effect 可能再排 promise） */
const FLUSH_ROUNDS = 4;
const flush = async () => {
    for (let round = 0; round < FLUSH_ROUNDS; round += 1) await act(async () => {});
};

/** 有動畫時離開 Preload：進度線最後一步 + 停留，再淡出 */
const { preloadStepMs, preloadHoldMs, flagFadeMs } = MOTION.scene;
const PRELOAD_STEPS = [preloadStepMs + preloadHoldMs, flagFadeMs];

/** 開 app，等 Preload 行完（減少動態效果：冇停留、冇淡出；fake timers：行晒 Preload 嘅時間線） */
const renderHome = async (catalog: CatalogDocument = sampleDocument(), mv?: MvController) => {
    const { container } = render(
        <App playback={testPlayback()} startup={instantStartup(catalog)} mv={mv} />,
    );
    await flush();
    if (vi.isFakeTimers()) {
        for (const ms of PRELOAD_STEPS) await act(() => vi.advanceTimersByTimeAsync(ms));
        // findBy 喺 fake timers 之下會等一個永遠唔到嘅 setTimeout：時間線已經行完，直接攞
        screen.getByRole('button', { name: '開啟歌單' });
    } else {
        await screen.findByRole('button', { name: '開啟歌單' });
        // 減少動態效果：旗即時拆走（0 毫秒計時器）
        await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
    }
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    // 轉盤上而家隻碟嘅封面（T-110 碟疊頭尾相接：第一隻碟前面都有碟，DOM 第一個封面唔一定係佢）
    const cover = () => container.querySelector('[data-current="true"] [data-part="cover"]');
    const button = (name: string) => screen.getByRole('button', { name });
    const armLook = () => ({
        arm: part('arm')?.getAttribute('style'),
        lift: part('arm-lift')?.getAttribute('style'),
    });
    return { container, part, cover, button, armLook };
};

const PARKED = { arm: expect.stringContaining('rotate(176deg)'), lift: 'transform: scale(1);' };
const PLAYING = { arm: expect.stringContaining('rotate(99deg)'), lift: 'transform: scale(1);' };
const LIFTED = { arm: expect.stringContaining('rotate(99deg)'), lift: 'transform: scale(1.018);' };

/** 由測試決定 catalog 幾時到 */
const lateCatalog = () => {
    let arrive: (result: CatalogLoadResult) => void = () => {};
    const deps: StartupDeps = {
        ...instantStartup(sampleDocument()),
        loadCatalog: () =>
            new Promise((resolve) => {
                arrive = resolve;
            }),
    };
    return { deps, arrive: (result: CatalogLoadResult) => arrive(result) };
};

/* T-034：Functional Spec US-001、FR-001、FR-034 */
describe('App start-up', () => {
    beforeEach(() => stubReducedMotion(true));

    it('should open on Preload with the app name, the unofficial notice and the version', async () => {
        const { deps } = lateCatalog();
        render(<App playback={testPlayback()} startup={deps} />);
        expect(screen.getByText('R Gram')).toBeInTheDocument();
        expect(
            screen.getByText(new RegExp(`非官方\\s·\\sv${packageJson.version}$`)),
        ).toBeInTheDocument();
        expect(document.documentElement.style.getPropertyValue('--stage-backdrop')).toBe(
            'var(--color-flag-bg)',
        );
        // 字體同封面完成咗，catalog 未到：停喺三分之一
        expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    });

    // S-078：catalog 最遲先到都要入到主頁
    it('should open the home scene when the catalog arrives last', async () => {
        const { deps, arrive } = lateCatalog();
        render(<App playback={testPlayback()} startup={deps} />);
        await screen.findByRole('progressbar');
        await act(async () =>
            arrive({ status: 'ready', source: 'network', document: sampleDocument() }),
        );
        expect(await screen.findByRole('button', { name: '開啟歌單' })).toBeInTheDocument();
        // 旗淡走之後（減少動態效果：即時）先拆走 Preload，安全區外面嘅底色跟返主頁
        await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
        expect(document.documentElement.style.getPropertyValue('--stage-backdrop')).toBe(
            'var(--color-stage)',
        );
    });

    it('should offer a retry when there is no catalog at all', async () => {
        const { deps, arrive } = lateCatalog();
        render(<App playback={testPlayback()} startup={deps} />);
        await act(async () => arrive({ status: 'unavailable', failure: 'network' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('未能載入唱片資料');
        await userEvent.click(screen.getByRole('button', { name: '重試' }));
        expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    });
});

describe('App home scene', () => {
    beforeEach(() => stubReducedMotion(true));

    it('should open on the first disc with no song, the arm parked and the version at the top right', async () => {
        const { part, button, armLook } = await renderHome();
        expect(part('album-title')).toHaveTextContent('APOLLO-18');
        expect(part('song-title')).toBeNull();
        expect(part('version')).toHaveTextContent(`v${packageJson.version}`);
        expect(armLook()).toEqual(PARKED);
        expect(button('歌書：歌詞及創作人員')).toHaveAttribute('aria-disabled', 'true');
        expect(button('觀看 MV')).toHaveAttribute('aria-disabled', 'true');
        expect(document.documentElement.style.getPropertyValue('--stage-backdrop')).toBe(
            'var(--color-stage)',
        );
    });

    it('should walk the clamp from no song to the list, playing, paused and playing again', async () => {
        const { part, cover, button, armLook } = await renderHome();
        await userEvent.click(button('開啟歌單'));
        expect(button('關閉歌單')).toBeInTheDocument();
        await userEvent.click(button('播放'));
        expect(part('song-title')).toHaveTextContent('apollo-18 1');
        expect(part('track-line')).toHaveTextContent('第 01 首 · 0:00');
        expect(armLook()).toEqual(PLAYING);
        expect(cover()).toHaveAttribute('data-spinning', 'true');
        await userEvent.click(button('暫停'));
        expect(armLook()).toEqual(LIFTED);
        expect(cover()).toHaveAttribute('data-spinning', 'false');
        await userEvent.click(button('播放'));
        expect(armLook()).toEqual(PLAYING);
    });

    it('should close the list from the dimmed area without playing', async () => {
        const { button, armLook } = await renderHome();
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('關閉歌單'));
        expect(screen.queryByRole('button', { name: '關閉歌單' })).toBeNull();
        expect(button('開啟歌單')).toBeInTheDocument();
        expect(armLook()).toEqual(PARKED);
    });

    // S-074：歌單開住時，暗層下面嘅三粒細掣 Tab 唔到、讀屏唔讀；用鍵盤收返歌單之後 focus 返唱片夾
    it('should keep Tab off the buttons under the list and refocus the clamp when it closes', async () => {
        const { button } = await renderHome();
        await userEvent.click(button('開啟歌單'));
        const stops = new Set<string | null | undefined>();
        for (let step = 0; step < 6; step += 1) {
            await userEvent.tab();
            stops.add(document.activeElement?.getAttribute('aria-label'));
        }
        // T-037：Tab 只喺歌單（listbox）、唱片夾（播放）同暗層（關閉）之間轉
        expect([...stops].filter(Boolean).sort()).toEqual(
            ['APOLLO-18 的歌曲', '播放', '關閉歌單'].sort(),
        );
        expect(screen.queryByRole('button', { name: '觀看 MV' })).toBeNull();
        button('關閉歌單').focus();
        await userEvent.keyboard('{Enter}');
        expect(document.activeElement).toBe(button('開啟歌單'));
        expect(button('觀看 MV')).toHaveAttribute('tabindex', '0');
    });

    // T-037：鍵盤揀歌：開歌單 → 下鍵（灰色嗰首跳過）→ Enter 播；再㩒碟面開返載入嘅碟，框入面係播緊嗰首
    it('should choose a track from the list with the keyboard and reopen it from the disc face', async () => {
        const { part, button } = await renderHome();
        await userEvent.click(button('開啟歌單'));
        const listbox = screen.getByRole('listbox', { name: 'APOLLO-18 的歌曲' });
        expect(listbox).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
            '第 3 首：apollo-18 3',
        );
        expect(part('list-number')).toHaveTextContent('03');
        await userEvent.keyboard('{Enter}');
        expect(part('song-title')).toHaveTextContent('apollo-18 3');
        expect(button('暫停')).toHaveFocus();
        await userEvent.click(button('開啟歌單'));
        expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
            '第 3 首：apollo-18 3',
        );
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(button('開啟歌單')).toHaveFocus();
    });

    it('should light the mode button only while playing', async () => {
        const { button } = await renderHome();
        const ring = () => button('播放模式：順序播放').querySelector('[data-part="glow-ring"]');
        expect(ring()).toBeNull();
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        expect(ring()).not.toBeNull();
        await userEvent.click(button('暫停'));
        expect(ring()).toBeNull();
    });

    // 歌書係其他任務（T-072）：呢度只係改場景狀態，掣亮燈；暫停時歌書留住（CR-003 決定 5）
    it('should toggle the booklet state once a song is loaded and keep it open on pause', async () => {
        const { button } = await renderHome();
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        const booklet = button('歌書：歌詞及創作人員');
        await userEvent.click(booklet);
        expect(booklet).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(button('暫停'));
        expect(booklet).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(booklet);
        expect(booklet).toHaveAttribute('aria-pressed', 'false');
    });

    // MV 電視（T-060）：開 MV 時停播、唱臂返泊位；㩒 ■ 收返之後要㩒先續播，再播重新落針（C8）
    it('should park the arm for the MV and keep it parked after the MV until play is pressed', async () => {
        const tv = createTestMv({ reduceMotion: true });
        const { button, armLook } = await renderHome(catalogWithMv(), tv.mv);
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        await userEvent.click(button('觀看 MV'));
        expect(armLook()).toEqual(PARKED);
        await userEvent.click(button('關閉電視'));
        expect(armLook()).toEqual(PARKED);
        await userEvent.click(button('播放'));
        expect(armLook()).toEqual(PLAYING);
    });

    // S-073：電視開住時唱片夾㩒唔到：讀屏要講「已停用」，唔可以係一粒冇反應嘅「播放」掣
    it('should disable the clamp while the MV is open', async () => {
        const tv = createTestMv({ reduceMotion: true });
        const { button, armLook } = await renderHome(catalogWithMv(), tv.mv);
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        await userEvent.click(button('觀看 MV'));
        expect(button('播放')).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(button('關閉電視'));
        expect(button('播放')).not.toHaveAttribute('aria-disabled');
        await userEvent.click(button('播放'));
        expect(armLook()).toEqual(PLAYING);
    });

    it('should keep the info, the top screws and the version on top and move the turntable down on tall phones', async () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        const { container } = await renderHome();
        const extra = 800 / (360 / 1080) - 1920;
        const top = container.querySelector('[data-anchor="top"]');
        const bottom = container.querySelector('[data-anchor="bottom"]');
        expect(bottom).toHaveAttribute('transform', `translate(0 ${extra})`);
        expect(top).not.toHaveAttribute('transform');
        ['album-title', 'version'].forEach((name) => {
            expect(top?.querySelector(`[data-part="${name}"]`)).not.toBeNull();
        });
        ['arm', 'clamp', 'cover'].forEach((name) => {
            expect(bottom?.querySelector(`[data-part="${name}"]`)).not.toBeNull();
        });
        // 每粒螺絲一個車床面 <use>
        expect(top?.querySelectorAll('[data-part="screws"] use')).toHaveLength(2);
        expect(bottom?.querySelectorAll('[data-part="screws"] use')).toHaveLength(1);
    });
});

describe('App home scene with motion', () => {
    beforeEach(() => {
        stubReducedMotion(false);
        vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    // 由泊位開始播：轉入（升高住）→ 放低；碟等放低之後先轉
    it('should start turning the disc only after the needle is down', async () => {
        const { part, cover, button } = await renderHome();
        fireEvent.click(button('開啟歌單'));
        fireEvent.click(button('播放'));
        expect(part('arm-lift')).toHaveAttribute('style', 'transform: scale(1.018);');
        expect(cover()).toHaveAttribute('data-spinning', 'false');
        act(() => vi.advanceTimersByTime(MOTION.scene.tonearmMs));
        expect(part('arm-lift')).toHaveAttribute('style', 'transform: scale(1);');
        expect(cover()).toHaveAttribute('data-spinning', 'false');
        act(() => vi.advanceTimersByTime(MOTION.scene.needleDropMs));
        expect(cover()).toHaveAttribute('data-spinning', 'true');
    });
});

/** canvas 量字（每個字 = 字級 × 比例）：真字體（載入完）比後備字體闊 */
const FALLBACK_EM = 0.45;
const LOADED_EM = 0.7;
const stubCanvas = (isLoaded: () => boolean) =>
    vi.stubGlobal(
        'OffscreenCanvas',
        class {
            getContext() {
                return {
                    font: '',
                    measureText(this: { font: string }, text: string) {
                        const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 0);
                        return {
                            width: text.length * size * (isLoaded() ? LOADED_EM : FALLBACK_EM),
                        };
                    },
                };
            }
        },
    );

// W-017：用後備字體量完放得落，真字體載入完闊咗：要重新 fit，唔可以出界
describe('App when the fonts finish loading', () => {
    beforeEach(() => stubReducedMotion(true));
    afterEach(removeFakeFonts);

    it('should fit the album title again with the loaded font', async () => {
        let loaded = false;
        stubCanvas(() => loaded);
        const fonts = installFakeFonts();
        const catalog = sampleDocument();
        const first = catalog.albums[0];
        if (first) first.title = 'GREATEST HITS 1999';
        const { part } = await renderHome(catalog);
        const sizeBefore = Number(part('album-title')?.getAttribute('font-size'));
        loaded = true;
        await act(() => fonts.resolveReady());
        const sizeAfter = Number(part('album-title')?.getAttribute('font-size'));
        expect(sizeAfter).toBeLessThan(sizeBefore);
        loaded = false;
        act(() => fonts.finishLoading());
        expect(Number(part('album-title')?.getAttribute('font-size'))).toBe(sizeBefore);
    });
});
