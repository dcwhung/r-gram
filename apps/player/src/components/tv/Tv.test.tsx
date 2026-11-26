import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TvView } from '../../app/tvView';
import { fitStage } from '../../stage/fitStage';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { StageContext } from '../../stage/StageContext';
import { Tv } from './Tv';

const view = (overrides: Partial<TvView> = {}): TvView => ({
    phase: 'open',
    title: 'Room 1',
    accent: '#c8442b',
    glow: '#ff8a6a',
    active: 'play',
    progress: 0.25,
    timeText: '0:07',
    failed: false,
    video: document.createElement('video'),
    ...overrides,
});

const handlers = () => ({ onPlay: vi.fn(), onPause: vi.fn(), onStop: vi.fn() });

const renderTv = (tv: TvView = view(), on = handlers()) => {
    const result = render(<Tv layout={PHONE_LAYOUT} tv={tv} handlers={on} />);
    const part = (name: string) => result.container.querySelector(`[data-part="${name}"]`);
    const button = (name: string) => screen.getByRole('button', { name });
    return { ...result, part, button, on };
};

/* T-060：設計稿「MV 電視」（Functional Spec US-007、§CR-002「MV 電視」、D26） */
describe('Tv', () => {
    it('should be one named group with play, pause and stop under the screen', () => {
        const { button } = renderTv();
        expect(screen.getByRole('group', { name: 'MV 電視' })).toBeInTheDocument();
        ['播放 MV', '暫停 MV', '關閉電視'].forEach((name) => expect(button(name)).toBeVisible());
    });

    it.each([
        ['play', '播放 MV'],
        ['pause', '暫停 MV'],
        ['stop', '關閉電視'],
    ] as const)('should light and press only the %s button', (active, name) => {
        const { button } = renderTv(view({ active }));
        expect(button(name)).toHaveAttribute('aria-pressed', 'true');
        const others = ['播放 MV', '暫停 MV', '關閉電視'].filter((other) => other !== name);
        others.forEach((other) => expect(button(other)).toHaveAttribute('aria-pressed', 'false'));
    });

    it('should send the buttons to the MV', async () => {
        const { button, on } = renderTv();
        await userEvent.click(button('暫停 MV'));
        await userEvent.click(button('播放 MV'));
        await userEvent.click(button('關閉電視'));
        expect(on.onPause).toHaveBeenCalledTimes(1);
        expect(on.onPlay).toHaveBeenCalledTimes(1);
        expect(on.onStop).toHaveBeenCalledTimes(1);
    });

    it('should put the TV away with Escape', () => {
        const { on } = renderTv();
        fireEvent.keyDown(screen.getByRole('group', { name: 'MV 電視' }), { key: 'Escape' });
        expect(on.onStop).toHaveBeenCalledTimes(1);
    });

    it('should move the focus into the TV when it comes up', () => {
        renderTv();
        const tv = screen.getByRole('group', { name: 'MV 電視' });
        expect(tv.contains(document.activeElement)).toBe(true);
    });

    // Technical Spec「MV 電視過場」：熄機期間鎖住電視掣
    it('should lock the buttons while switching off', async () => {
        const { button, on, part } = renderTv(view({ phase: 'closing', active: 'stop' }));
        expect(part('tv')).toHaveClass('tv--closing');
        await userEvent.click(button('播放 MV'));
        fireEvent.keyDown(screen.getByRole('group', { name: 'MV 電視' }), { key: 'Escape' });
        expect(button('播放 MV')).toHaveAttribute('aria-disabled', 'true');
        expect(on.onPlay).not.toHaveBeenCalled();
        expect(on.onStop).not.toHaveBeenCalled();
    });

    it('should rise when it opens', () => {
        expect(renderTv().part('tv')).toHaveClass('tv--open');
    });

    // US-007：機身下方顯示進度線（專輯色）、MV + 歌名、已播時間
    it('should show the progress in the album colour, MV, the title and the time under the screen', () => {
        const { part } = renderTv();
        expect(part('tv-strip')).toHaveTextContent('MV');
        expect(part('tv-title')).toHaveTextContent('Room 1');
        expect(part('tv-time')).toHaveTextContent('0:07');
        const progress = part('tv-progress');
        expect(progress).toHaveAttribute('fill', '#c8442b');
        expect(progress).toHaveAttribute('width', String(PHONE_LAYOUT.tv.strip.lineW * 0.25));
    });

    it('should show the MV picture on the screen', () => {
        const tv = view();
        const { part } = renderTv(tv);
        expect(part('tv-screen')?.contains(tv.video)).toBe(true);
    });

    it('should say on the screen and to screen readers that the MV could not be played', () => {
        const { part } = renderTv(view({ failed: true, active: null }));
        expect(part('tv-screen')).toHaveTextContent('未能播放 MV');
        expect(screen.getByRole('status')).toHaveTextContent('未能播放「Room 1」的 MV');
    });

    // FR-039：高身手機多出嚟嘅高度喺貼頂組同貼底組中間；電視跟畫面底
    it('should stand on the bottom of a tall phone', () => {
        const fit = fitStage(360, 800);
        const { container } = render(
            <StageContext.Provider value={fit}>
                <Tv layout={PHONE_LAYOUT} tv={view()} handlers={handlers()} />
            </StageContext.Provider>,
        );
        const { x, y } = PHONE_LAYOUT.tv;
        expect(container.querySelector('[data-part="tv-set"]')).toHaveAttribute(
            'transform',
            `translate(${x} ${y + fit.extraUnits})`,
        );
    });
});
