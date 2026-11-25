import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import packageJson from '../../../package.json';
import type { PreloadStatus } from '../../app/startup/useBoot';
import { Stage } from '../../stage/Stage';
import { PreloadScreen } from './PreloadScreen';

const status = (overrides: Partial<PreloadStatus> = {}): PreloadStatus => ({
    phase: 'loading',
    progress: 0,
    exit: 'shown',
    retry: vi.fn(),
    ...overrides,
});

const renderPreload = (value: PreloadStatus) => {
    const { container } = render(
        <Stage>
            <PreloadScreen status={value} />
        </Stage>,
    );
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    return { container, part };
};

/* Functional Spec US-001、FR-001、FR-034；設計稿第 18 版「Preload」 */
describe('PreloadScreen', () => {
    it('should show the waving flag behind the real progress as three digits', () => {
        const { container, part } = renderPreload(status({ progress: 1 / 3 }));
        expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
        const bar = screen.getByRole('progressbar', { name: '載入中' });
        expect(bar).toHaveAttribute('aria-valuenow', '33');
        expect(part('percent')).toHaveTextContent('033');
        expect(part('bar-fill')).toHaveStyle({ strokeDashoffset: String(1 - 1 / 3) });
    });

    it('should show the app name, the unofficial notice and the version under the progress', () => {
        renderPreload(status());
        expect(screen.getByText('R Gram')).toBeInTheDocument();
        // 中間係全形空格；Testing Library 會將空白正規化
        expect(
            screen.getByText(new RegExp(`^歌迷自製\\s非官方\\s·\\sv${packageJson.version}$`)),
        ).toBeInTheDocument();
    });

    // US-001：完全冇資料 → 顯示錯誤同重試掣
    it('should replace the progress with an error and a retry button when there is no catalog', async () => {
        const value = status({ phase: 'failed', progress: 1 / 3 });
        renderPreload(value);
        expect(screen.queryByRole('progressbar')).toBeNull();
        expect(screen.getByRole('alert')).toHaveTextContent('未能載入唱片資料');
        await userEvent.click(screen.getByRole('button', { name: '重試' }));
        expect(value.retry).toHaveBeenCalledTimes(1);
        expect(screen.getByText('R Gram')).toBeInTheDocument();
    });

    it('should let the keyboard press retry', async () => {
        const value = status({ phase: 'failed' });
        renderPreload(value);
        screen.getByRole('button', { name: '重試' }).focus();
        await userEvent.keyboard('{Enter}');
        expect(value.retry).toHaveBeenCalledTimes(1);
    });

    // 「成塊旗淡出」由 CSS 做（preload.css；減少動態效果冇過場）：呢度只標記狀態，淡出期間唔收㩒
    it('should mark the screen as leaving while it fades out', () => {
        const { part } = renderPreload(status({ phase: 'ready', progress: 1, exit: 'leaving' }));
        expect(part('preload')).toHaveAttribute('data-exit', 'leaving');
    });

    // FR-039：高身手機底部嘅嘢貼底
    it('should keep the progress and the text at the bottom on tall phones', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        const { part } = renderPreload(status());
        const extra = 800 / (360 / 1080) - 1920;
        expect(part('preload-bottom')).toHaveAttribute('transform', `translate(0 ${extra})`);
    });
});
