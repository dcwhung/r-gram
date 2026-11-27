import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { DialRing } from '../components/dial-ring/DialRing';
import { FavHeart } from '../components/knob/FavHeart';
import { Knob } from '../components/knob/Knob';
import type { StageLayout } from '../stage/layouts';
import type { HomeView } from './homeView';

export interface DialHandlers {
    /** 㩒住旋鈕（或者第一下方向鍵）：打開字母盤 */
    onTurnStart: () => void;
    /** 旋鈕指住第 position 格 */
    onTurn: (position: number) => void;
    /** 放手（或者 Enter / focus 離開）：留喺指住嗰隻碟 */
    onTurnEnd: () => void;
    /** Esc：取消，返去開始揀碟嗰陣嘅碟（S-154） */
    onTurnCancel: () => void;
    /** 㩒 ♥：去 Favourites 碟；身處嗰度就返去之前嗰隻碟 */
    onFavourites: () => void;
}

interface DialControlsProps {
    layout: StageLayout;
    view: HomeView;
    handlers: DialHandlers;
}

/**
 * 轉碟嘅控件（設計稿第 18 版 scene()：字母盤 → 旋鈕（連刻度）→ ♥）。字母盤喺旋鈕下面，♥ 喺最頂。
 * Functional Spec US-003、US-013、FR-035；Technical Spec「轉碟旋鈕 + 字母盤」。
 * 弧線歌單、歌書（T-072）嘅暗層蓋住旋鈕同 ♥：㩒唔到、Tab 唔到。
 */
export const DialControls = ({ layout, view, handlers }: DialControlsProps) => {
    const { entries, current, open } = view.dial;
    return (
        <>
            <DialRing
                layout={layout}
                keys={entries.map((entry) => entry.key)}
                current={current}
                open={open}
                accent={view.accent}
            />
            <Knob
                layout={layout}
                positions={entries.length}
                current={current}
                open={open}
                accent={view.accent}
                glow={view.glow}
                valueText={entries[current]?.title ?? ''}
                onStart={handlers.onTurnStart}
                onTurn={handlers.onTurn}
                onEnd={handlers.onTurnEnd}
                onCancel={handlers.onTurnCancel}
                covered={view.listOpen || view.bookletOpen}
            />
            <FavHeart
                layout={layout}
                open={open}
                lit={entries[current]?.albumId === FAVOURITES_ALBUM_ID}
                onPress={handlers.onFavourites}
                covered={view.listOpen || view.bookletOpen}
            />
        </>
    );
};
