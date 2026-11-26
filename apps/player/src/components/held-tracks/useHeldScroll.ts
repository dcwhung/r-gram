import type { HeldTracksView } from '../../app/heldTracksView';
import { heldColumnBottom } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { type ColumnScroll, useColumnScroll } from './useColumnScroll';

/**
 * 歌單欄嘅捲動，數值由幾何表同舞台縮放嚟：欄高 = 欄底（旋鈕開住較高；高身手機向下伸）− 欄頂；
 * 拖動門檻係 CSS px，用舞台嘅 unit 換算
 */
export const useHeldScroll = (
    layout: StageLayout,
    held: HeldTracksView,
): ColumnScroll & { room: number } => {
    const column = layout.heldTracks;
    const { unit, extraUnits } = useStageFitContext();
    const room = heldColumnBottom(layout, held.dialOpen, extraUnits) - column.top;
    const scroll = useColumnScroll({
        count: held.rows.length,
        pitch: column.pitch,
        room,
        minThumb: column.bar.minLength,
        unit,
        thresholdPx: column.dragThresholdPx,
    });
    return { ...scroll, room };
};
