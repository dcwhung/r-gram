import type { CatalogDocument } from '@r-gram/catalog';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import packageJson from '../../package.json';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { MOTION } from '../config/motion';
import { App } from './App';

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

const renderHome = (catalog: CatalogDocument = sampleDocument()) => {
    const { container } = render(<App catalog={catalog} />);
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    const button = (name: string) => screen.getByRole('button', { name });
    const armLook = () => ({
        arm: part('arm')?.getAttribute('style'),
        lift: part('arm-lift')?.getAttribute('style'),
    });
    return { container, part, button, armLook };
};

const PARKED = { arm: expect.stringContaining('rotate(176deg)'), lift: 'transform: scale(1);' };
const PLAYING = { arm: expect.stringContaining('rotate(99deg)'), lift: 'transform: scale(1);' };
const LIFTED = { arm: expect.stringContaining('rotate(99deg)'), lift: 'transform: scale(1.018);' };

describe('App before the catalog is ready (Preload is T-034)', () => {
    it('should show the app name, the unofficial notice and the version from package.json', () => {
        render(<App />);
        expect(screen.getByText('R Gram')).toBeInTheDocument();
        // 中間係全形空格：Testing Library 會將空白正規化，所以用 regex 對
        expect(screen.getByText(/^歌迷自製\s非官方$/)).toBeInTheDocument();
        expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
        expect(document.documentElement.style.getPropertyValue('--stage-backdrop')).toBe(
            'var(--color-flag-bg)',
        );
    });
});

describe('App home scene', () => {
    beforeEach(() => stubReducedMotion(true));

    it('should open on the first disc with no song, the arm parked and the version at the top right', () => {
        const { part, button, armLook } = renderHome();
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
        const { part, button, armLook } = renderHome();
        await userEvent.click(button('開啟歌單'));
        expect(button('關閉歌單')).toBeInTheDocument();
        await userEvent.click(button('播放'));
        expect(part('song-title')).toHaveTextContent('apollo-18 1');
        expect(part('track-line')).toHaveTextContent('第 01 首 · 0:00');
        expect(armLook()).toEqual(PLAYING);
        expect(part('cover')).toHaveAttribute('data-spinning', 'true');
        await userEvent.click(button('暫停'));
        expect(armLook()).toEqual(LIFTED);
        expect(part('cover')).toHaveAttribute('data-spinning', 'false');
        await userEvent.click(button('播放'));
        expect(armLook()).toEqual(PLAYING);
    });

    it('should close the list from the dimmed area without playing', async () => {
        const { button, armLook } = renderHome();
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('關閉歌單'));
        expect(screen.queryByRole('button', { name: '關閉歌單' })).toBeNull();
        expect(button('開啟歌單')).toBeInTheDocument();
        expect(armLook()).toEqual(PARKED);
    });

    // S-074：歌單開住時，暗層下面嘅三粒細掣 Tab 唔到、讀屏唔讀；用鍵盤收返歌單之後 focus 返唱片夾
    it('should keep Tab off the buttons under the list and refocus the clamp when it closes', async () => {
        const { button } = renderHome();
        await userEvent.click(button('開啟歌單'));
        const stops = new Set<string | null | undefined>();
        for (let step = 0; step < 6; step += 1) {
            await userEvent.tab();
            stops.add(document.activeElement?.getAttribute('aria-label'));
        }
        expect([...stops].filter(Boolean).sort()).toEqual(['播放', '關閉歌單'].sort());
        expect(screen.queryByRole('button', { name: '觀看 MV' })).toBeNull();
        button('關閉歌單').focus();
        await userEvent.keyboard('{Enter}');
        expect(document.activeElement).toBe(button('開啟歌單'));
        expect(button('觀看 MV')).toHaveAttribute('tabindex', '0');
    });

    it('should light the mode button only while playing', async () => {
        const { button } = renderHome();
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
        const { button } = renderHome();
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

    // MV 電視係 T-060：開 MV 時停播、唱臂返泊位；收返之後要㩒先續播，再播重新落針
    it('should park the arm for the MV and keep it parked after the MV until play is pressed', async () => {
        const { button, armLook } = renderHome(catalogWithMv());
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        await userEvent.click(button('觀看 MV'));
        expect(armLook()).toEqual(PARKED);
        await userEvent.click(button('觀看 MV'));
        expect(armLook()).toEqual(PARKED);
        await userEvent.click(button('播放'));
        expect(armLook()).toEqual(PLAYING);
    });

    // S-073：電視開住時唱片夾㩒唔到：讀屏要講「已停用」，唔可以係一粒冇反應嘅「播放」掣
    it('should disable the clamp while the MV is open', async () => {
        const { button, armLook } = renderHome(catalogWithMv());
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        await userEvent.click(button('觀看 MV'));
        expect(button('播放')).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(button('觀看 MV'));
        expect(button('播放')).not.toHaveAttribute('aria-disabled');
        await userEvent.click(button('播放'));
        expect(armLook()).toEqual(PLAYING);
    });

    it('should keep the info, the top screws and the version on top and move the turntable down on tall phones', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        const { container } = renderHome();
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
    it('should start turning the disc only after the needle is down', () => {
        const { part, button } = renderHome();
        fireEvent.click(button('開啟歌單'));
        fireEvent.click(button('播放'));
        expect(part('arm-lift')).toHaveAttribute('style', 'transform: scale(1.018);');
        expect(part('cover')).toHaveAttribute('data-spinning', 'false');
        act(() => vi.advanceTimersByTime(MOTION.scene.tonearmMs));
        expect(part('arm-lift')).toHaveAttribute('style', 'transform: scale(1);');
        expect(part('cover')).toHaveAttribute('data-spinning', 'false');
        act(() => vi.advanceTimersByTime(MOTION.scene.needleDropMs));
        expect(part('cover')).toHaveAttribute('data-spinning', 'true');
    });
});
