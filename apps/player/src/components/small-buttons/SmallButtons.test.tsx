import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hitSizeUnits } from '../../stage/geometry';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { SmallButtons } from './SmallButtons';

type Props = Parameters<typeof SmallButtons>[0];

const renderButtons = (overrides: Partial<Props> = {}) => {
    const handlers = { onBooklet: vi.fn(), onMv: vi.fn(), onMode: vi.fn() };
    render(
        <svg>
            <SmallButtons
                layout={PHONE_LAYOUT}
                glow="#24f96f"
                hasSong={false}
                hasMv={false}
                bookletOpen={false}
                mvOpen={false}
                playing={false}
                {...handlers}
                {...overrides}
            />
        </svg>,
    );
    const button = (name: string) => screen.getByRole('button', { name });
    return {
        handlers,
        booklet: button('歌書：歌詞及創作人員'),
        mv: button('觀看 MV'),
        mode: button('播放模式：順序播放'),
    };
};
const ringOf = (button: HTMLElement) => button.querySelector('[data-part="glow-ring"]');

describe('SmallButtons', () => {
    it('should disable the booklet and MV buttons without a song', () => {
        const { booklet, mv, mode } = renderButtons();
        expect(booklet).toHaveAttribute('aria-disabled', 'true');
        expect(mv).toHaveAttribute('aria-disabled', 'true');
        expect(mode).toHaveAttribute('aria-disabled', 'false');
    });

    it('should keep the MV button disabled for a song without an MV', () => {
        const { booklet, mv } = renderButtons({ hasSong: true });
        expect(booklet).toHaveAttribute('aria-disabled', 'false');
        expect(mv).toHaveAttribute('aria-disabled', 'true');
    });

    it('should press the booklet and MV buttons once there is something to show', async () => {
        const { booklet, mv, mode, handlers } = renderButtons({ hasSong: true, hasMv: true });
        await userEvent.click(booklet);
        await userEvent.click(mv);
        await userEvent.click(mode);
        expect(handlers.onBooklet).toHaveBeenCalledTimes(1);
        expect(handlers.onMv).toHaveBeenCalledTimes(1);
        expect(handlers.onMode).toHaveBeenCalledTimes(1);
    });

    // 光圈 = 播緊（播放模式）／打開咗（歌書、MV）；只有歌書係開關掣（S-034）
    it('should light the mode ring only while playing', () => {
        expect(ringOf(renderButtons({ playing: true }).mode)).not.toBeNull();
    });

    it('should light and press the booklet button while the booklet is open', () => {
        const { booklet, mv } = renderButtons({ hasSong: true, bookletOpen: true });
        expect(booklet).toHaveAttribute('aria-pressed', 'true');
        expect(ringOf(booklet)).not.toBeNull();
        expect(mv).not.toHaveAttribute('aria-pressed');
    });

    it('should light the MV button while the MV is showing', () => {
        expect(
            ringOf(renderButtons({ hasSong: true, hasMv: true, mvOpen: true }).mv),
        ).not.toBeNull();
    });

    // B-025（S-039）：44pt 感應範圍由幾何表計，唔係 prop 原樣出返
    it('should give every button the 44pt touch target of the layout', () => {
        const { booklet, mv, mode } = renderButtons();
        [booklet, mv, mode].forEach((button) => {
            expect(button.querySelector('[data-part="hit"]')).toHaveAttribute(
                'r',
                String(hitSizeUnits(PHONE_LAYOUT) / 2),
            );
        });
    });

    // S-074：歌單嘅暗層蓋住時：Tab 唔到、讀屏唔讀、㩒唔到
    it('should take the buttons out of the Tab order and the accessibility tree when covered', () => {
        const onMode = vi.fn();
        const { container } = render(
            <svg>
                <SmallButtons
                    layout={PHONE_LAYOUT}
                    glow="#24f96f"
                    hasSong
                    hasMv
                    bookletOpen={false}
                    mvOpen={false}
                    playing={false}
                    covered
                    onBooklet={vi.fn()}
                    onMv={vi.fn()}
                    onMode={onMode}
                />
            </svg>,
        );
        expect(container.querySelector('[data-part="small-buttons"]')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
        const buttons = container.querySelectorAll('.metal-button');
        expect(buttons).toHaveLength(3);
        buttons.forEach((button) => expect(button).toHaveAttribute('tabindex', '-1'));
        expect(screen.queryAllByRole('button')).toHaveLength(0);
        (buttons[2] as SVGGElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(onMode).not.toHaveBeenCalled();
    });
});
