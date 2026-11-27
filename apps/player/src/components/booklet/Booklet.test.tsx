import { fireEvent, render, screen } from '@testing-library/react';
import type { BookletView } from '../../app/bookletView';
import { fitStage } from '../../stage/fitStage';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { StageContext } from '../../stage/StageContext';
import { estimateTextWidth } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import { Booklet } from './Booklet';

const GLOW = '#3ddc84';
const booklet = (overrides: Partial<BookletView> = {}): BookletView => ({
    trackId: 'komorebi-07',
    title: '我永遠記得',
    credits: {
        composer: 'RubberBand / 雷柏熹',
        lyricist: 'Tim Lui',
        arranger: 'RubberBand / 雷柏熹',
        producer: 'RubberBand / 雷柏熹',
    },
    ...overrides,
});

/** 393 × 852，安全區頂 59、底 34（iPhone 15 主畫面 App；高身手機） */
const TALL = fitStage(393, 852, { top: 59, bottom: 34 });

const renderBooklet = (
    props: { view?: BookletView; closing?: boolean; fit?: typeof TALL } = {},
) => {
    const onClose = vi.fn();
    const { container } = render(
        <StageContext.Provider value={props.fit ?? fitStage(0, 0)}>
            <svg>
                <g tabIndex={0} data-testid="outside" />
                <Booklet
                    layout={PHONE_LAYOUT}
                    booklet={props.view ?? booklet()}
                    glow={GLOW}
                    measure={estimateTextWidth}
                    closing={props.closing ?? false}
                    onClose={onClose}
                />
            </svg>
        </StageContext.Provider>,
    );
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    return { onClose, part, container };
};

/* T-072：設計稿第 18 版「歌書（㩒 i）」；Functional Spec CR-002「歌書」、決定 5、D111 */
describe('Booklet', () => {
    it('should be a dialog named after the track and take the focus when it opens', () => {
        renderBooklet();
        const dialog = screen.getByRole('dialog', { name: '歌書：我永遠記得' });
        expect(dialog).toHaveFocus();
        expect(dialog).toHaveClass('booklet--in');
    });

    it('should switch to the closing transition while closing', () => {
        const { part } = renderBooklet({ closing: true });
        expect(part('booklet')).toHaveClass('booklet--out');
        expect(part('booklet')).not.toHaveClass('booklet--in');
    });

    // 設計稿 booklet()：「曲詞編監」用專輯著燈色、x 74；名喺 x 118；第一行基線 446、行距 48
    it('should list the credits under the info in the glow colour', () => {
        const { container } = renderBooklet();
        const labels = [...container.querySelectorAll('.booklet-credit-label')];
        expect(labels.map((label) => label.textContent)).toEqual(['曲', '詞', '編', '監']);
        expect(labels[0]).toHaveAttribute('fill', GLOW);
        expect(labels[0]).toHaveAttribute('x', '74');
        expect(labels[3]).toHaveAttribute('y', '590');
        const values = [...container.querySelectorAll('.booklet-credit-value')];
        expect(values[1]).toHaveAttribute('x', '118');
        expect(values[1]).toHaveTextContent('Tim Lui');
        expect(screen.getByRole('listitem', { name: '詞：Tim Lui' })).toBeInTheDocument();
    });

    it('should leave out the missing credits', () => {
        const { part } = renderBooklet({ view: booklet({ credits: null }) });
        expect(part('booklet-credits')).toBeNull();
        expect(part('booklet-veil')).not.toBeNull();
    });

    // 暗層中間留唱片夾個窿（播／停照㩒得，決定 5）；㩒暗位 = 收返；暗層亦係「關閉歌書」掣
    it('should close from the veil, which leaves a hole over the spindle', () => {
        const { onClose, part } = renderBooklet();
        const veil = part('booklet-veil') as SVGPathElement;
        expect(veil).toHaveAttribute('fill-rule', 'evenodd');
        expect(veil).toHaveAttribute('opacity', '0.8');
        expect(veil.getAttribute('d')).toContain(`a${px(700 * 0.16)} `);
        fireEvent.click(screen.getByRole('button', { name: '關閉歌書' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close on Escape', () => {
        const { onClose } = renderBooklet();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // 舞台入面 Tab 兜圈：由歌書本身 Tab 去第一個、Shift+Tab 去最後一個（呢度係「關閉歌書」）
    it('should keep Tab inside the stage', () => {
        renderBooklet();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(screen.getByRole('button', { name: '關閉歌書' })).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(screen.getByTestId('outside')).toHaveFocus();
    });

    // D111：暗層蓋埋螢幕頂同底嘅延伸（貼底組座標：由 −extra − bleedTop 開始）；高身手機曲詞編監照貼頂
    it('should darken the bleed beyond the safe area on a tall phone', () => {
        const { part } = renderBooklet({ fit: TALL });
        const top = px(-TALL.extraUnits - TALL.bleedTop);
        const bottom = px(-TALL.extraUnits + TALL.heightUnits + TALL.bleedBottom);
        expect(part('booklet-veil')?.getAttribute('d')).toMatch(
            new RegExp(`^M0 ${top}H1080V${bottom}H0z`),
        );
        expect(part('booklet-veil')?.parentElement).toHaveAttribute(
            'transform',
            `translate(0 ${px(TALL.extraUnits)})`,
        );
        expect(part('booklet-credits')?.closest('[transform]')).toBeNull();
    });

    // 設計稿 focusFrame()：框高 92，右端接住唱片夾（碟心 x − 碟孔透明圈半徑），左邊圓頭喺弧線左邊 6 之外
    it('should draw the frame from the spindle to the arc', () => {
        const { part } = renderBooklet();
        const right = 940 - 700 * 0.16;
        const frame = part('booklet-frame');
        expect(frame?.closest('g[transform]')).toHaveAttribute(
            'transform',
            `translate(${px(right)} 1196)`,
        );
        expect(frame?.getAttribute('d')).toBe(
            `M0 -46H${px(940 - 556 - 6 - right)}a46 46 0 0 0 0 92H0`,
        );
        expect(frame).toHaveAttribute('stroke-width', '3');
    });
});
