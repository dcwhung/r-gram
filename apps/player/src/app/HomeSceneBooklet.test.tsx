import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { IDLE_PLAYBACK, type PlaybackState } from '../playback/playbackState';
import { estimateTextWidth } from '../utils/textMeasure';
import { HomeScene } from './HomeScene';
import { homeView } from './homeView';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const PLAYING: PlaybackState = {
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId: 'apollo-18',
    trackId: 'apollo-18-01',
};

const handlers = () => ({
    onSpindle: vi.fn(),
    onBooklet: vi.fn(),
    onMv: vi.fn(),
    onMode: vi.fn(),
    onCloseList: vi.fn(),
    onTurnStart: vi.fn(),
    onTurn: vi.fn(),
    onTurnEnd: vi.fn(),
    onTurnCancel: vi.fn(),
    onFavourites: vi.fn(),
    onReturnToLoaded: vi.fn(),
    onFavourite: vi.fn(),
    onOpenList: vi.fn(),
    onFocusListTrack: vi.fn(),
    onPlayListTrack: vi.fn(),
});

const stage = (overlay: StageState['overlay']): StageState => ({
    ...INITIAL_STAGE,
    scene: 'home',
    viewAlbumId: 'apollo-18',
    overlay,
});

/** 第 1 首有 MV */
const withMv = () => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

/** 好似 useHome 咁：i 掣、電視真係改到場景狀態 */
const Live = ({ spy }: { spy: ReturnType<typeof handlers> }) => {
    const [overlay, setOverlay] = useState<StageState['overlay']>(null);
    const view = homeView(withMv(), stage(overlay), PLAYING);
    const live = {
        ...spy,
        onBooklet: () => setOverlay((now) => (now === 'booklet' ? null : 'booklet')),
        onMv: () => setOverlay('mv'),
    };
    return <HomeScene view={view} handlers={live} measure={estimateTextWidth} />;
};

const part = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-part="${name}"]`);
/** 白字嗰份左上資訊（黑字嗰份墊喺暗層下面，喺 DOM 前面） */
const whiteInfo = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-part="info"]')].at(-1);

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduce })),
    );

/* T-072：設計稿第 18 版 scene()：唱片機 → 黑字左上資訊 → 歌書 → 三粒細掣 → 白字左上資訊 */
describe('HomeScene booklet', () => {
    beforeEach(() => stubReducedMotion(true));
    afterEach(() => vi.unstubAllGlobals());

    it('should lay the booklet over the machine, under the small buttons and the white info', () => {
        const view = homeView(sampleDocument(), stage('booklet'), PLAYING);
        const { container } = render(
            <HomeScene view={view} handlers={handlers()} measure={estimateTextWidth} />,
        );
        const booklet = part(container, 'booklet');
        expect(booklet?.closest('[data-anchor="top"]')).not.toBeNull();
        expect(booklet?.previousElementSibling).toHaveAttribute('data-part', 'booklet-info-ghost');
        expect(
            booklet?.nextElementSibling?.querySelector('[data-part="small-buttons"]'),
        ).not.toBeNull();
        expect(whiteInfo(container)?.closest('.booklet-info')).not.toBeNull();
        expect(whiteInfo(container)).toHaveClass('info--dark');
        expect(part(container, 'info')).not.toHaveClass('info--dark');
        expect(part(container, 'version')).toHaveClass('info-version--dark');
    });

    // 三粒細掣喺暗層上面照用（i 著燈 = 收返）；旋鈕、♥ 喺暗層下面（Tab 唔到）；碟面冇（㩒暗位 = 收返）
    it('should keep the small buttons and the spindle usable but cover the knob and the heart', () => {
        const view = homeView(sampleDocument(), stage('booklet'), PLAYING);
        const { container } = render(
            <HomeScene view={view} handlers={handlers()} measure={estimateTextWidth} />,
        );
        const info = screen.getByRole('button', { name: '歌書：歌詞及創作人員' });
        expect(info).toHaveAttribute('aria-pressed', 'true');
        expect(info).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('button', { name: '暫停' })).toHaveAttribute('tabindex', '0');
        expect(container.querySelector('.knob')).toHaveAttribute('tabindex', '-1');
        expect(part(container, 'disc-face')).toBeNull();
    });

    it('should close from the veil and give the focus back to the i button', () => {
        const { container } = render(<Live spy={handlers()} />);
        fireEvent.click(screen.getByRole('button', { name: '歌書：歌詞及創作人員' }));
        expect(screen.getByRole('dialog', { name: '歌書：apollo-18 1' })).toHaveFocus();
        fireEvent.click(screen.getByRole('button', { name: '關閉歌書' }));
        expect(part(container, 'booklet')).toBeNull();
        expect(screen.getByRole('button', { name: '歌書：歌詞及創作人員' })).toHaveFocus();
    });

    it('should close on Escape', () => {
        const { container } = render(<Live spy={handlers()} />);
        fireEvent.click(screen.getByRole('button', { name: '歌書：歌詞及創作人員' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(part(container, 'booklet')).toBeNull();
    });

    // 開 MV 照舊會收起歌書（決定 5）：focus 去電視嗰邊，唔好搶返去 i 掣
    it('should not pull the focus back when the MV replaces the booklet', () => {
        render(<Live spy={handlers()} />);
        fireEvent.click(screen.getByRole('button', { name: '歌書：歌詞及創作人員' }));
        fireEvent.click(screen.getByRole('button', { name: '觀看 MV' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.getByRole('button', { name: '歌書：歌詞及創作人員' })).not.toHaveFocus();
    });

    // 有動畫：收返過場期間仲畫住（booklet--out、白字淡出），完咗先收
    it('should play the closing transition before the booklet goes', () => {
        stubReducedMotion(false);
        vi.useFakeTimers();
        const { container } = render(<Live spy={handlers()} />);
        fireEvent.click(screen.getByRole('button', { name: '歌書：歌詞及創作人員' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(part(container, 'booklet')).toHaveClass('booklet--out');
        expect(whiteInfo(container)?.closest('.booklet-info--out')).not.toBeNull();
        act(() => vi.runAllTimers());
        expect(part(container, 'booklet')).toBeNull();
        vi.useRealTimers();
    });
});
