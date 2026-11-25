import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import packageJson from '../../package.json';
import { App } from './App';

describe('App turntable shell', () => {
    it('should walk the spindle from no song to playing to paused and back', async () => {
        render(<App />);
        await userEvent.click(screen.getByRole('button', { name: '開啟歌單' }));
        await userEvent.click(screen.getByRole('button', { name: '暫停' }));
        expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    });

    it('should enable the booklet and MV buttons only once a song is loaded', async () => {
        render(<App />);
        const booklet = screen.getByRole('button', { name: '歌書：歌詞及創作人員' });
        const mv = screen.getByRole('button', { name: '觀看 MV' });
        expect(booklet).toHaveAttribute('aria-disabled', 'true');
        expect(mv).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(screen.getByRole('button', { name: '開啟歌單' }));
        expect(booklet).toHaveAttribute('aria-disabled', 'false');
        expect(mv).toHaveAttribute('aria-disabled', 'false');
    });

    // 播放模式掣嘅光圈代表「播緊」（Functional Spec CR-002「播放模式」）
    it('should light the play-mode button only while playing', async () => {
        render(<App />);
        const mode = screen.getByRole('button', { name: '播放模式：順序播放' });
        expect(mode).toHaveAttribute('aria-pressed', 'false');
        await userEvent.click(screen.getByRole('button', { name: '開啟歌單' }));
        expect(mode).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(screen.getByRole('button', { name: '暫停' }));
        expect(mode).toHaveAttribute('aria-pressed', 'false');
    });

    it('should move the turntable down by the extra height and keep the top screws at the top', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        const { container } = render(<App />);
        const extra = 800 / (360 / 1080) - 1920;
        expect(container.querySelector('[data-anchor="bottom"]')).toHaveAttribute(
            'transform',
            `translate(0 ${extra})`,
        );
        expect(container.querySelector('[data-anchor="top"]')).not.toHaveAttribute('transform');
        expect(container.querySelector('svg.stage-svg')).toHaveAttribute(
            'viewBox',
            `0 0 1080 ${1920 + extra}`,
        );
    });
});

describe('App', () => {
    it('should show the app name, the unofficial notice and the version from package.json', () => {
        render(<App />);
        expect(screen.getByText('R Gram')).toBeInTheDocument();
        // 中間係全形空格：Testing Library 會將空白正規化，所以用 regex 對
        expect(screen.getByText(/^歌迷自製\s非官方$/)).toBeInTheDocument();
        expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
    });
});
