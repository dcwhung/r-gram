import { fireEvent, render, screen } from '@testing-library/react';
import type { MiniView } from '../../app/miniView';
import { miniLabelX } from '../../stage/geometry';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { MiniTurntable } from './MiniTurntable';

const mini = (overrides: Partial<MiniView> = {}): MiniView => ({
    shown: true,
    title: '我永遠記得',
    paused: false,
    ended: false,
    failed: false,
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
    // B-086 ⑥：播完 = 「已播完」，掣嘅名都講
    it('should say the loaded song ended', () => {
        const { part } = renderMini(mini({ paused: true, ended: true, armPose: 'parked' }));
        expect(part('mini-label')).toHaveTextContent('已播完');
        expect(screen.getByRole('button', { name: '返回已播完的唱片：我永遠記得' })).toBeVisible();
    });

    // S-242：拎住時載入嘅歌載入失敗：唔寫「已暫停」，同左上一樣寫「未能播放」
    it('should say the loaded song failed to load', () => {
        const { part } = renderMini(mini({ paused: true, failed: true, armPose: 'parked' }));
        expect(part('mini-label')).toHaveTextContent('未能播放');
        expect(
            screen.getByRole('button', { name: '返回未能播放的唱片：我永遠記得' }),
        ).toBeVisible();
    });

    it('should be one button named after going back to the playing disc', () => {
        const { onPress } = renderMini();
        const button = screen.getByRole('button', { name: '返回播放中的唱片：我永遠記得' });
        expect(button).toHaveAttribute('tabindex', '0');
        fireEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(onPress).toHaveBeenCalledTimes(2);
    });

    // S-175：掣嘅名講埋入面係邊首歌、播緊定暫停；歌名唔截短
    it('should name the button with the full title and whether it is paused', () => {
        const title = '(Just Like) Starting Over';
        renderMini(mini({ title }));
        expect(
            screen.getByRole('button', { name: `返回播放中的唱片：${title}` }),
        ).toBeInTheDocument();
    });

    it('should name the button as going back to the paused disc while paused', () => {
        renderMini(mini({ paused: true, spinning: false }));
        expect(
            screen.getByRole('button', { name: '返回已暫停的唱片：我永遠記得' }),
        ).toBeInTheDocument();
    });

    it('should say it is playing and show the song title, right-aligned left of the disc', () => {
        const { part } = renderMini(mini({ title: '永遠記得' }));
        expect(part('mini-label')).toHaveTextContent('播放中');
        expect(part('mini-label')).toHaveAttribute('x', '782');
        // B-083 ④：「播放中」基線 MINI.y − 62、歌名基線 MINI.y − 14（設計稿 labelDy、titleDy）
        expect(part('mini-label')).toHaveAttribute('y', '260');
        expect(part('mini-label')).toHaveAttribute('text-anchor', 'end');
        expect(part('mini-title')).toHaveTextContent('永遠記得');
        expect(part('mini-title')).toHaveAttribute('x', '782');
        expect(part('mini-title')).toHaveAttribute('y', '308');
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
        // k = 120 / 716：translate(930 − 940k, 322 − 1196k)，一位小數；scale 四位小數
        expect(part('mini-machine')).toHaveAttribute(
            'transform',
            'translate(772.5 121.6) scale(0.1676)',
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

    /*
     * W-045（B-083 ④ 改擺法，設計稿 bcfc0fc）：兩行字喺歌單第一行上面，歌名由 782 向左用到 MINI.titleLeft（330）：
     * 放唔落先縮字（36 → 24），再放唔落先「…」
     */
    describe('long titles', () => {
        const { miniTurntable: shape } = PHONE_LAYOUT;
        const leftEdge = (node: SVGElement | null) => {
            const size = Number(node?.getAttribute('font-size'));
            const font = { family: 'cjk', size, weight: 700, spacing: 0 } as const;
            return miniLabelX(PHONE_LAYOUT) - estimateTextWidth(node?.textContent ?? '', font);
        };

        it('should show a Latin title in full right of titleLeft', () => {
            const title = '(Just Like) Starting Over';
            const node = renderMini(mini({ title })).part('mini-title');
            expect(node).toHaveTextContent(title);
            expect(leftEdge(node)).toBeGreaterThanOrEqual(shape.title.left);
        });

        // 19 個中文字：最細 24 號要 456，放唔落 452 → 「…」；18 個字（432）縮到 24 就放得落
        it('should cut a 19-character Chinese title at the minimum size', () => {
            const title = '長夜漫漫我的愛晚安好夢長夜漫漫我的愛晚';
            const node = renderMini(mini({ title })).part('mini-title');
            expect(node).toHaveAttribute('font-size', String(shape.title.minSize));
            expect(node?.textContent?.endsWith('…')).toBe(true);
            expect(leftEdge(node)).toBeGreaterThanOrEqual(shape.title.left);
        });

        it('should only shrink an 18-character Chinese title', () => {
            const title = '長夜漫漫我的愛晚安好夢長夜漫漫我的愛';
            const node = renderMini(mini({ title })).part('mini-title');
            expect(node).toHaveTextContent(title);
            expect(Number(node?.getAttribute('font-size'))).toBeLessThan(shape.title.size);
            expect(leftEdge(node)).toBeGreaterThanOrEqual(shape.title.left);
        });

        // W-053 ③（S-193）：每次縮 titleStep（2）：18 個字 452 ÷ 18 ≈ 25.1，縮 2 停喺 24，每次縮 1 會停喺 25
        it('should shrink the title in steps of the layout table', () => {
            const title = '長夜漫漫我的愛晚安好夢長夜漫漫我的愛';
            const node = renderMini(mini({ title })).part('mini-title');
            expect(node).toHaveAttribute('font-size', '24');
            const size = Number(node?.getAttribute('font-size'));
            expect((shape.title.size - size) % shape.title.step).toBe(0);
        });
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
