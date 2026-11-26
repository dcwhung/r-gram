import type { CatalogDocument } from '@r-gram/catalog';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { createTestMv } from '../mv/testing/testMv';
import { testPlayback } from '../playback/testing/testPlayback';
import { App } from './App';
import type { StartupDeps } from './startup/startupDeps';

/** `apollo-18` 第 1 首有 MV；第 3 首冇 */
const catalogWithMv = (): CatalogDocument => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

const startup = (catalog: CatalogDocument): StartupDeps => ({
    loadCatalog: () => Promise.resolve({ status: 'ready', source: 'network', document: catalog }),
    loadFonts: () => Promise.resolve(),
    loadImage: () => Promise.resolve(true),
});

/** 減少動態效果：Preload 即時離開，電視即時升起同收埋 */
const renderHome = async (catalog: CatalogDocument = catalogWithMv()) => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: true })),
    );
    const tv = createTestMv({ reduceMotion: true });
    const { container } = render(
        <App playback={testPlayback()} startup={startup(catalog)} mv={tv.mv} />,
    );
    await screen.findByRole('button', { name: '開啟歌單' });
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
    const button = (name: string) => screen.getByRole('button', { name });
    const tvGroup = () => screen.queryByRole('group', { name: 'MV 電視' });
    const homeLayer = () => container.querySelector('[data-part="home-layer"]');
    return { tv, button, tvGroup, homeLayer };
};

const playFirstTrack = async (button: (name: string) => HTMLElement) => {
    await userEvent.click(button('開啟歌單'));
    await userEvent.click(button('播放'));
};

/* T-060：MV 電視喺主頁上面（Functional Spec US-007、C8、D95 嘅暗層規則；a11y：focus 入出） */
describe('App MV TV', () => {
    it('should bring the TV up over a turntable that can no longer be reached and focus the TV', async () => {
        const { button, tvGroup, homeLayer } = await renderHome();
        await playFirstTrack(button);
        expect(homeLayer()).not.toHaveAttribute('inert');
        await userEvent.click(button('觀看 MV'));
        const tv = tvGroup();
        expect(tv).toBeInTheDocument();
        expect(tv?.contains(document.activeElement)).toBe(true);
        expect(homeLayer()).toHaveAttribute('inert');
    });

    it('should put the TV away with stop and give the focus back to the MV button', async () => {
        const { button, tvGroup, homeLayer } = await renderHome();
        await playFirstTrack(button);
        await userEvent.click(button('觀看 MV'));
        await userEvent.click(button('關閉電視'));
        expect(tvGroup()).toBeNull();
        expect(homeLayer()).not.toHaveAttribute('inert');
        expect(document.activeElement).toBe(button('觀看 MV'));
        expect(button('播放')).not.toHaveAttribute('aria-disabled');
    });

    it('should put the TV away with Escape', async () => {
        const { button, tvGroup } = await renderHome();
        await playFirstTrack(button);
        await userEvent.click(button('觀看 MV'));
        const tv = tvGroup();
        if (tv) fireEvent.keyDown(tv, { key: 'Escape' });
        await act(async () => {});
        expect(tvGroup()).toBeNull();
    });

    // C5：冇 MV 檔嘅歌，MV 掣變灰、㩒唔到
    it('should grey out the MV button for a track without an MV', async () => {
        const { button, tvGroup } = await renderHome(sampleDocument());
        await playFirstTrack(button);
        await userEvent.click(button('觀看 MV'));
        expect(button('觀看 MV')).toHaveAttribute('aria-disabled', 'true');
        expect(tvGroup()).toBeNull();
    });
});
