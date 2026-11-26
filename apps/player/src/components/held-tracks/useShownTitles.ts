import { useMemo } from 'react';
import type { HeldTrackRow } from '../../app/heldTracksView';
import type { StageLayout } from '../../stage/layouts';
import type { TextFont, TextMeasure } from '../../utils/textMeasure';
import { truncateLine } from '../../utils/truncateLine';

/** 設計稿 trackPanel()：歌名 MIXED、font-weight 500 */
const TITLE_WEIGHT = 500;

/** 歌名由歌號之後開始 */
export const heldTitleX = ({ heldTracks: column }: StageLayout): number =>
    column.x + column.number.width;

/**
 * 每行顯示嘅歌名（放唔落用「…」；設計稿第 18 版 trackPanel()）。只喺行、版面（闊度）或者量字函數變先計
 *（review W-043：之前每捲一格就重新量晒所有行，一下滾輪幾百次量字）
 */
export const useShownTitles = (
    rows: readonly HeldTrackRow[],
    layout: StageLayout,
    measure: TextMeasure,
): readonly string[] =>
    useMemo(() => {
        const column = layout.heldTracks;
        const font: TextFont = {
            family: 'mixed',
            size: column.size,
            weight: TITLE_WEIGHT,
            spacing: 0,
        };
        const width = column.right - heldTitleX(layout);
        return rows.map(({ title }) => truncateLine(title, width, (text) => measure(text, font)));
    }, [rows, layout, measure]);
