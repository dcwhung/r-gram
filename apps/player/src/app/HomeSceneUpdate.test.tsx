import { fireEvent, render, screen } from '@testing-library/react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { estimateTextWidth } from '../utils/textMeasure';
import { HomeScene } from './HomeScene';
import { homeView } from './homeView';
import { IDLE_PLAYBACK, type PlaybackState } from '../playback/playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

/* T-109：有新版本時右上版本號變成掣（設計稿第 20 版 updateButton()），永遠喺暗層下面 */
const NAME = '已有新版本，立即更新並重新載入';

const handlers = {
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
    onOpenList: vi.fn(),
    onFocusListTrack: vi.fn(),
    onPlayListTrack: vi.fn(),
};

const PLAYING: PlaybackState = {
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId: 'apollo-18',
    trackId: 'apollo-18-01',
};

const viewOf = (stage: Partial<StageState> = {}, playback: PlaybackState = IDLE_PLAYBACK) =>
    homeView(
        sampleDocument(),
        { ...INITIAL_STAGE, scene: 'home', viewAlbumId: 'room', ...stage },
        playback,
    );

const renderScene = (stage: Partial<StageState> = {}, playback?: PlaybackState) => {
    const onApply = vi.fn();
    const { container } = render(
        <HomeScene
            view={viewOf(stage, playback)}
            handlers={handlers}
            measure={estimateTextWidth}
            update={{ onApply }}
        />,
    );
    const part = (name: string) => container.querySelector(`[data-part="${name}"]`);
    return { onApply, part };
};

describe('HomeScene with an update waiting', () => {
    it('should replace the version text with the update button', () => {
        const { onApply, part } = renderScene();
        expect(part('version')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: NAME }));
        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('should keep the plain version text when no update waits', () => {
        const { container } = render(
            <HomeScene view={viewOf()} handlers={handlers} measure={estimateTextWidth} />,
        );
        expect(container.querySelector('[data-part="version"]')).toHaveTextContent(/^v\d/);
        expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    });

    it('should draw the button below the dark veil of the arc list and take it out of reach', () => {
        const { part } = renderScene({ scene: 'list' });
        const button = part('update-button') as Element;
        const veil = part('arc-veil') as Element;
        expect(
            button.compareDocumentPosition(veil) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(button).not.toHaveAttribute('tabindex');
        expect(screen.queryByRole('button', { name: NAME })).toBeNull();
    });

    it.each([['booklet' as const], ['mv' as const]])(
        'should take the button out of reach while the %s is open',
        (overlay) => {
            const { part } = renderScene({ overlay });
            expect(part('update-button')).not.toHaveAttribute('tabindex');
            expect(screen.queryByRole('button', { name: NAME })).toBeNull();
        },
    );

    it('should keep the button pressable while the letter dial is open', () => {
        renderScene({ scene: 'discChange' });
        expect(screen.getByRole('button', { name: NAME })).toHaveAttribute('tabindex', '0');
    });

    // 設計稿 scene()：版本掣喺細唱片機下面一層（兩者唔重疊）
    it('should sit below the mini turntable while holding another disc', () => {
        const { part } = renderScene({}, PLAYING);
        const button = part('update-button') as Element;
        const mini = part('mini-button') as Element;
        expect(
            button.compareDocumentPosition(mini) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: NAME })).toBeInTheDocument();
    });
});
