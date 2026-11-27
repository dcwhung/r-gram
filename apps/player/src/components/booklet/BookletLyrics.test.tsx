import type { LyricsJson } from '@r-gram/catalog';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { BookletView } from '../../app/bookletView';
import { LYRIC_TICK_MS, LYRICS_FETCH_TIMEOUT_MS } from '../../config/limits';
import { PlaybackClock } from '../../lyrics/PlaybackClock';
import { fitStage } from '../../stage/fitStage';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { StageContext } from '../../stage/StageContext';
import { estimateTextWidth } from '../../utils/textMeasure';
import { BookletLyrics } from './BookletLyrics';

/** 佔位文字（設計稿 PH()），唔係真歌詞 */
const PH = (count: number) => '歌詞佔位文字'.repeat(20).slice(0, count);
const TIMED: LyricsJson = {
    synced: true,
    lines: [
        { t: 1000, text: `${PH(5)}一` },
        { t: 4000, text: `${PH(5)}二` },
        { t: 7000, text: '' },
        { t: 9000, text: `${PH(5)}三` },
    ],
};
const PLAIN: LyricsJson = {
    synced: false,
    lines: Array.from({ length: 40 }, (_, i) => ({ text: i % 5 === 4 ? '' : `${PH(8)}${i}` })),
};

/** 每個測試用自己嘅網址（攞到嘅歌詞會記喺記憶體） */
let serial = 0;
const nextUrl = () => {
    serial += 1;
    return `https://api.example/catalog/v1/lyrics/${String(serial).padStart(16, '0')}.json`;
};
const booklet = (lyricsUrl: string | null, trackId = 'komorebi-01'): BookletView => ({
    trackId,
    title: '佔位歌名',
    credits: null,
    lyricsUrl,
});
const serve = (body: unknown, status = 200) =>
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
    );

const tree = (view: BookletView, clock = () => 0, playing = false) => (
    <StageContext.Provider value={fitStage(0, 0)}>
        <PlaybackClock.Provider value={clock}>
            <svg>
                <BookletLyrics
                    layout={PHONE_LAYOUT}
                    booklet={view}
                    measure={estimateTextWidth}
                    playing={playing}
                />
            </svg>
        </PlaybackClock.Provider>
    </StageContext.Provider>
);
const renderLyrics = (view: BookletView, clock = () => 0, playing = false) =>
    render(tree(view, clock, playing));

/** 等 fetch 同 JSON 讀完 */
const settle = () => act(async () => {});
const focusText = () => document.querySelector('[aria-current="true"]')?.textContent;

/* T-082：設計稿第 17、18 版歌書歌詞；Functional Spec D22、D32、D38 */
describe('BookletLyrics', () => {
    it('should follow the song on the arc for timed lyrics', async () => {
        serve(TIMED);
        let now = 4.5;
        renderLyrics(booklet(nextUrl()), () => now);
        await settle();
        expect(screen.getByRole('group', { name: '歌詞' })).toBeInTheDocument();
        expect(focusText()).toBe(`${PH(5)}二`);
        now = 9.2;
        // 暫停時唔會自己換（決定 5）；畫面再 render（例如時間變）先跟返
        await settle();
        expect(focusText()).toBe(`${PH(5)}二`);
    });

    it('should move to the next line on its own while playing', async () => {
        vi.useFakeTimers();
        serve(TIMED);
        let now = 1.2;
        renderLyrics(booklet(nextUrl()), () => now, true);
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(focusText()).toBe(`${PH(5)}一`);
        now = 4.1;
        await act(() => vi.advanceTimersByTimeAsync(LYRIC_TICK_MS));
        expect(focusText()).toBe(`${PH(5)}二`);
        vi.useRealTimers();
    });

    // 空白行 = 間奏：唔 highlight 任何一行，框照喺度
    it('should highlight nothing during an interlude', async () => {
        serve(TIMED);
        renderLyrics(booklet(nextUrl()), () => 7.5);
        await settle();
        expect(focusText()).toBeUndefined();
        expect(document.querySelector('[data-part="booklet-frame"]')).not.toBeNull();
    });

    it('should show plain lyrics as one scrolling column without a frame', async () => {
        serve(PLAIN);
        const { container } = renderLyrics(booklet(nextUrl()));
        await settle();
        const column = screen.getByRole('document', { name: '歌詞' });
        expect(column).toHaveAttribute('tabindex', '0');
        expect(container.querySelector('[data-part="booklet-frame"]')).toBeNull();
        expect(container.querySelectorAll('.booklet-plain-text')).toHaveLength(32);
        const rows = column.querySelector('[transform^="translate(0 "]');
        expect(rows).toHaveAttribute('transform', 'translate(0 0)');
        fireEvent.keyDown(column, { key: 'End' });
        expect(rows?.getAttribute('transform')).not.toBe('translate(0 0)');
    });

    it('should leave the frame empty while the lyrics are on their way', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => {})),
        );
        const { container } = renderLyrics(booklet(nextUrl()));
        expect(container.querySelector('[data-part="booklet-frame"]')).not.toBeNull();
        expect(container.querySelector('.booklet-lyrics-notice')).toBeNull();
        expect(container.querySelector('.lyric-text')).toBeNull();
    });

    it.each([
        ['the track has no lyrics', null, '尚未有歌詞'],
        ['every line is blank', { synced: false, lines: [{ text: ' ' }] }, '尚未有歌詞'],
        ['the file cannot be read', 'broken', '未能載入歌詞'],
    ])('should say so in the frame when %s', async (_case, body, notice) => {
        if (body === 'broken') serve({}, 500);
        else if (body) serve(body);
        renderLyrics(booklet(body === null ? null : nextUrl()));
        await settle();
        expect(screen.getByText(notice)).toHaveClass('booklet-lyrics-notice');
    });

    // 慢網絡：等夠 LYRICS_FETCH_TIMEOUT_MS 就當攞唔到
    it('should give up on a slow network', async () => {
        vi.useFakeTimers();
        vi.stubGlobal(
            'fetch',
            vi.fn(
                (_url: string, init: RequestInit) =>
                    new Promise<Response>((_resolve, reject) =>
                        init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
                    ),
            ),
        );
        renderLyrics(booklet(nextUrl()));
        await act(() => vi.advanceTimersByTimeAsync(LYRICS_FETCH_TIMEOUT_MS));
        expect(screen.getByText('未能載入歌詞')).toBeInTheDocument();
        vi.useRealTimers();
    });

    // 同一份歌詞再開唔再攞
    it('should not fetch the same lyrics twice', async () => {
        serve(PLAIN);
        const url = nextUrl();
        const first = renderLyrics(booklet(url));
        await settle();
        first.unmount();
        renderLyrics(booklet(url));
        expect(screen.getByRole('document', { name: '歌詞' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    // review S-274（M12）：攞唔到唔記低：下次打開歌書再攞
    it('should try again on the next open after a failed load', async () => {
        const url = nextUrl();
        serve({}, 500);
        const first = renderLyrics(booklet(url));
        await settle();
        expect(screen.getByText('未能載入歌詞')).toBeInTheDocument();
        first.unmount();
        serve(PLAIN);
        renderLyrics(booklet(url));
        await settle();
        expect(screen.getByRole('document', { name: '歌詞' })).toBeInTheDocument();
    });

    // review S-274（M13）：換咗歌，舊嗰首遲到嘅結果唔可以蓋過新嗰首
    it('should ignore a late answer for the track that was left', async () => {
        const oldUrl = nextUrl();
        let answerOld: (response: Response) => void = () => {};
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                url === oldUrl
                    ? new Promise<Response>((resolve) => {
                          answerOld = resolve;
                      })
                    : Promise.resolve(new Response('{}', { status: 500 })),
            ),
        );
        const { rerender } = renderLyrics(booklet(oldUrl, 'komorebi-01'));
        rerender(tree(booklet(nextUrl(), 'komorebi-02')));
        await settle();
        expect(screen.getByText('未能載入歌詞')).toBeInTheDocument();
        answerOld(new Response(JSON.stringify(TIMED)));
        await settle();
        expect(screen.getByText('未能載入歌詞')).toBeInTheDocument();
    });
});
