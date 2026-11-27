import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { LYRIC_TICK_MS } from '../config/limits';
import { createTestPlayback } from '../playback/testing/testPlayback';
import { App } from './App';
import type { StartupDeps } from './startup/startupDeps';

/** 兩行佔位歌詞（唔係真歌詞），隔半秒：喺同一秒入面，snapshot 嘅秒數唔會變 */
const LYRICS = {
    synced: true,
    lines: [
        { t: 1000, text: '佔位第一行' },
        { t: 1500, text: '佔位第二行' },
    ],
};

const catalogWithLyrics = () => {
    const catalog = sampleDocument();
    const first = catalog.albums[0]?.tracks[0];
    if (first) first.lyrics = '0123456789abcdef.json';
    return catalog;
};

const startup = (): StartupDeps => ({
    loadCatalog: () =>
        Promise.resolve({ status: 'ready', source: 'network', document: catalogWithLyrics() }),
    loadFonts: () => Promise.resolve(),
    loadImage: () => Promise.resolve(true),
});

const button = (name: string) => screen.getByRole('button', { name });
const current = () => document.querySelector('[aria-current="true"]')?.textContent ?? null;

/*
 * T-082（review W-074）：歌詞跟歌行嘅接線：引擎位置 → controller.positionSec → useHome clock → App →
 * HomeScene 嘅 PlaybackClock → Booklet（`playing`）。位置喺同一秒入面郁（冇 timeupdate），
 * 所以只有歌書自己每 LYRIC_TICK_MS 睇一次位置先跟得到；暫停之後唔再跟（決定 5）
 */
describe('App booklet lyrics following the song', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: true })),
        );
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(new Response(JSON.stringify(LYRICS)))),
        );
    });

    it('should move to the next line while playing and stay on it once paused', async () => {
        const { element, controller } = createTestPlayback();
        render(<App playback={controller} startup={startup()} />);
        await screen.findByRole('button', { name: '開啟歌單' });
        await userEvent.click(button('開啟歌單'));
        await userEvent.click(button('播放'));
        element.currentTime = 1.2;
        await userEvent.click(button('歌書：歌詞及創作人員'));
        await waitFor(() => expect(current()).toBe('佔位第一行'));
        element.currentTime = 1.6;
        await waitFor(() => expect(current()).toBe('佔位第二行'));
        await userEvent.click(button('暫停'));
        element.currentTime = 1.1;
        await act(() => new Promise((resolve) => setTimeout(resolve, LYRIC_TICK_MS * 3)));
        expect(current()).toBe('佔位第二行');
    });
});
