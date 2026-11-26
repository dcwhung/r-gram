import { fireEvent, render, screen } from '@testing-library/react';
import type { MiniView } from '../../app/miniView';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { MiniTurntable } from './MiniTurntable';

const mini = (overrides: Partial<MiniView> = {}): MiniView => ({
    shown: true,
    title: '我永遠記得',
    paused: false,
    armPose: 'playing',
    spinning: true,
    accent: '#2f8f57',
    glow: '#24f96f',
    coverUrl: 'https://api.example/img/komorebi-cover.webp',
    thumbUrl: 'https://api.example/img/komorebi-thumb.webp',
    ...overrides,
});

const renderMini = (view: MiniView = mini(), onPress = vi.fn()) => {
    const { container } = render(
        <svg>
            <MiniTurntable
                layout={PHONE_LAYOUT}
                mini={view}
                measure={estimateTextWidth}
                onPress={onPress}
            />
        </svg>,
    );
    const part = (name: string) => container.querySelector<SVGElement>(`[data-part="${name}"]`);
    return { part, onPress };
};

/* T-048：右上角細唱片機（設計稿第 18 版 miniTurntable()；Functional Spec FR-043） */
describe('MiniTurntable', () => {
    it('should be one button named after going back to the playing disc', () => {
        const { onPress } = renderMini();
        const button = screen.getByRole('button', { name: '返回播放中的唱片' });
        expect(button).toHaveAttribute('tabindex', '0');
        fireEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(onPress).toHaveBeenCalledTimes(2);
    });

    it('should say it is playing and show the song title, right-aligned left of the disc', () => {
        const { part } = renderMini();
        expect(part('mini-label')).toHaveTextContent('播放中');
        expect(part('mini-label')).toHaveAttribute('x', '782');
        expect(part('mini-label')).toHaveAttribute('y', '304');
        expect(part('mini-label')).toHaveAttribute('text-anchor', 'end');
        expect(part('mini-title')).toHaveTextContent('我永遠記得');
        expect(part('mini-title')).toHaveAttribute('y', '352');
        expect(part('mini-title')).toHaveAttribute('font-size', '36');
    });

    it('should say it is paused and keep its disc still when the song is paused', () => {
        const { part } = renderMini(mini({ paused: true, spinning: false, armPose: 'lifted' }));
        expect(part('mini-label')).toHaveTextContent('已暫停');
        expect(part('cover')).toHaveAttribute('data-spinning', 'false');
        expect(part('led')).toHaveAttribute('fill', '#5a5a5a');
    });

    it('should turn its disc and light the tonearm while playing', () => {
        const { part } = renderMini();
        expect(part('cover')).toHaveAttribute('data-spinning', 'true');
        expect(part('led')).toHaveAttribute('fill', '#24f96f');
        expect(part('cover')?.querySelector('image:last-of-type')).toHaveAttribute(
            'href',
            'https://api.example/img/komorebi-cover.webp',
        );
    });

    // 設計稿：轉盤、碟、唱片夾、唱臂成組按 MINI.r / PLATTER.r 縮細，碟心對準 MINI 嘅圓心
    it('should draw the whole turntable scaled down around the mini centre', () => {
        const { part } = renderMini();
        const k = 120 / 716;
        expect(part('mini-machine')).toHaveAttribute(
            'transform',
            `translate(${(930 - 940 * k).toFixed(2)} ${(322 - 1196 * k).toFixed(2)}) scale(${k.toFixed(4)})`,
        );
        // 唱臂已經喺位，冇轉動過場
        expect(part('arm')).toHaveAttribute('data-instant', 'true');
    });

    it('should cover the disc and the text with one transparent touch target', () => {
        const hit = renderMini().part('mini-hit');
        expect(hit).toHaveAttribute('x', '510');
        expect(hit).toHaveAttribute('y', '202');
        expect(hit).toHaveAttribute('width', '540');
        expect(hit).toHaveAttribute('height', '240');
        expect(hit).toHaveAttribute('fill', 'transparent');
    });

    it('should shrink a long song title so that it stays inside the info column', () => {
        const title = 'A Very Long Song Title That Would Run Off The Left Edge Of The Stage';
        const node = renderMini(mini({ title })).part('mini-title');
        const size = Number(node?.getAttribute('font-size'));
        expect(size).toBeGreaterThanOrEqual(24);
        const width = estimateTextWidth(node?.textContent ?? '', {
            family: 'cjk',
            size,
            weight: 700,
            spacing: 0,
        });
        expect(width).toBeLessThanOrEqual(782 - 70);
    });

    it('should fade out, leave the Tab order and ignore presses when not shown', () => {
        const { part, onPress } = renderMini(mini({ shown: false, spinning: false }));
        expect(part('mini-turntable')).toHaveAttribute('data-hidden', 'true');
        expect(part('mini-turntable')).toHaveAttribute('aria-hidden', 'true');
        const button = part('mini-button');
        expect(button).toHaveAttribute('tabindex', '-1');
        if (button) fireEvent.click(button);
        expect(onPress).not.toHaveBeenCalled();
    });
});
